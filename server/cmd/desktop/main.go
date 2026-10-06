package main

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/ncorrea-13/rolboard/server/internal/app"
	"github.com/ncorrea-13/rolboard/server/internal/desktop"
)

//go:embed all:frontend
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

type desktopApp struct {
	ctx     context.Context
	dir     string
	dist    fs.FS
	handler atomic.Pointer[http.Handler]

	mu     sync.Mutex
	cfg    desktop.Config
	closer io.Closer
}

func main() {
	dist, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		slog.Error("error leyendo el frontend embebido", "err", err)
		os.Exit(1)
	}
	dir, err := desktop.Dir()
	if err != nil {
		slog.Error("error resolviendo el directorio de config", "err", err)
		os.Exit(1)
	}

	d := &desktopApp{dir: dir, dist: dist}
	err = wails.Run(&options.App{
		Title:       "rolboard",
		Width:       1280,
		Height:      800,
		AssetServer: &assetserver.Options{Assets: dist, Handler: d},
		Linux:       &linux.Options{Icon: icon, ProgramName: "rolboard"},
		OnStartup:   d.startup,
		OnShutdown:  d.shutdown,
	})
	if err != nil {
		slog.Error("error en wails", "err", err)
		os.Exit(1)
	}
}

func (d *desktopApp) startup(ctx context.Context) {
	d.ctx = ctx

	cfg, err := desktop.Load(d.dir)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		d.fail(err)
		return
	}
	if err := d.load(cfg); err != nil {
		d.fail(err)
	}
}

func (d *desktopApp) load(cfg desktop.Config) error {
	handler, closer, err := app.New(app.Config{
		DBPath:      desktop.DBPath(d.dir),
		VaultsRoot:  cfg.VaultsRoot,
		UploadsRoot: desktop.UploadsDir(d.dir),
		LocalMode:   true,
	})
	if err != nil {
		return err
	}

	d.mu.Lock()
	old := d.closer
	d.cfg = cfg
	d.closer = closer
	d.handler.Store(&handler)
	d.mu.Unlock()

	if old != nil {
		if err := old.Close(); err != nil {
			slog.Error("error cerrando DB", "err", err)
		}
	}
	return nil
}

func (d *desktopApp) shutdown(ctx context.Context) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.closer == nil {
		return
	}
	if err := d.closer.Close(); err != nil {
		slog.Error("error cerrando DB", "err", err)
	}
}

func (d *desktopApp) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == http.MethodPost && r.URL.Path == "/api/desktop/open":
		d.openURL(w, r)
		return
	case r.Method == http.MethodGet && r.URL.Path == "/api/desktop/vaults-root":
		d.getVaultsRoot(w)
		return
	case r.Method == http.MethodPost && r.URL.Path == "/api/desktop/vaults-root":
		d.pickVaultsRoot(w)
		return
	case !strings.HasPrefix(r.URL.Path, "/api/"):
		http.ServeFileFS(w, r, d.dist, "index.html")
		return
	}
	h := d.handler.Load()
	if h == nil {
		http.Error(w, "Starting", http.StatusServiceUnavailable)
		return
	}
	(*h).ServeHTTP(w, r)
}

func (d *desktopApp) openURL(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&payload); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	u, err := url.Parse(payload.URL)
	if err != nil || u.Scheme != "https" || u.Host == "" {
		http.Error(w, "Only https URLs", http.StatusBadRequest)
		return
	}
	runtime.BrowserOpenURL(d.ctx, u.String())
	w.WriteHeader(http.StatusNoContent)
}

func (d *desktopApp) getVaultsRoot(w http.ResponseWriter) {
	d.mu.Lock()
	root := d.cfg.VaultsRoot
	d.mu.Unlock()
	writeVaultsRoot(w, root)
}

func (d *desktopApp) pickVaultsRoot(w http.ResponseWriter) {
	path, err := runtime.OpenDirectoryDialog(d.ctx, runtime.OpenDialogOptions{
		Title: "Elegí la carpeta donde están tus vaults de Obsidian",
	})
	if err != nil {
		http.Error(w, "Error opening dialog", http.StatusInternalServerError)
		return
	}
	if path == "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	cfg := desktop.Config{VaultsRoot: path}
	if err := desktop.Save(d.dir, cfg); err != nil {
		slog.Error("error guardando config", "err", err)
		http.Error(w, "Error saving config", http.StatusInternalServerError)
		return
	}
	if err := d.load(cfg); err != nil {
		slog.Error("error recargando la app", "err", err)
		http.Error(w, "Error reloading", http.StatusInternalServerError)
		return
	}
	writeVaultsRoot(w, path)
}

func writeVaultsRoot(w http.ResponseWriter, root string) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"vaultsRoot": root})
}

func (d *desktopApp) fail(err error) {
	slog.Error("error", "err", err)
	_, _ = runtime.MessageDialog(d.ctx, runtime.MessageDialogOptions{
		Type:    runtime.ErrorDialog,
		Title:   "rolboard",
		Message: err.Error(),
	})
	runtime.Quit(d.ctx)
}
