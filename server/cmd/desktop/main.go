package main

import (
	"context"
	"embed"
	"encoding/json"
	"io/fs"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/ncorrea-13/rolboard/server/internal/desktop"
)

//go:embed all:frontend
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

const pushDelay = 30 * time.Second

type desktopApp struct {
	ctx  context.Context
	dir  string
	dist fs.FS
	rt   atomic.Pointer[desktop.Runtime]

	pushMu    sync.Mutex
	pushTimer *time.Timer
}

type settings struct {
	VaultsRoot string `json:"vaultsRoot"`
	SyncDir    string `json:"syncDir"`
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
	rt, err := desktop.Start(ctx, d.dir)
	if err != nil {
		d.fail(err)
		return
	}
	d.rt.Store(rt)
}

func (d *desktopApp) shutdown(ctx context.Context) {
	rt := d.rt.Load()
	if rt == nil {
		return
	}
	d.pushMu.Lock()
	if d.pushTimer != nil {
		d.pushTimer.Stop()
	}
	d.pushMu.Unlock()
	if err := rt.Push(ctx); err != nil {
		slog.Error("error exportando a la carpeta de sincronización", "err", err)
	}
	if err := rt.Close(); err != nil {
		slog.Error("error cerrando DB", "err", err)
	}
}

func (d *desktopApp) schedulePush() {
	d.pushMu.Lock()
	defer d.pushMu.Unlock()
	if d.pushTimer != nil {
		d.pushTimer.Stop()
	}
	d.pushTimer = time.AfterFunc(pushDelay, func() {
		if rt := d.rt.Load(); rt != nil {
			if err := rt.Push(d.ctx); err != nil {
				slog.Error("error exportando a la carpeta de sincronización", "err", err)
			}
		}
	})
}

func (d *desktopApp) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == http.MethodPost && r.URL.Path == "/api/desktop/open":
		d.openURL(w, r)
		return
	case r.Method == http.MethodGet && r.URL.Path == "/api/desktop/settings":
		d.writeSettings(w)
		return
	case r.Method == http.MethodPost && r.URL.Path == "/api/desktop/vaults-root":
		d.pickFolder(w, "Elegí la carpeta donde están tus vaults de Obsidian", func(rt *desktop.Runtime, path string) error {
			return rt.SetVaultsRoot(path)
		})
		return
	case r.Method == http.MethodPost && r.URL.Path == "/api/desktop/sync-dir":
		d.pickFolder(w, "Elegí la carpeta de sincronización", func(rt *desktop.Runtime, path string) error {
			return rt.SetSyncDir(d.ctx, path)
		})
		return
	case !strings.HasPrefix(r.URL.Path, "/api/"):
		http.ServeFileFS(w, r, d.dist, "index.html")
		return
	}
	rt := d.rt.Load()
	if rt == nil {
		http.Error(w, "Starting", http.StatusServiceUnavailable)
		return
	}
	rt.ServeHTTP(w, r)
	if r.Method != http.MethodGet {
		d.schedulePush()
	}
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

func (d *desktopApp) writeSettings(w http.ResponseWriter) {
	rt := d.rt.Load()
	if rt == nil {
		http.Error(w, "Starting", http.StatusServiceUnavailable)
		return
	}
	cfg := rt.Settings()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(settings{VaultsRoot: cfg.VaultsRoot, SyncDir: cfg.SyncDir})
}

func (d *desktopApp) pickFolder(w http.ResponseWriter, title string, apply func(*desktop.Runtime, string) error) {
	rt := d.rt.Load()
	if rt == nil {
		http.Error(w, "Starting", http.StatusServiceUnavailable)
		return
	}
	path, err := runtime.OpenDirectoryDialog(d.ctx, runtime.OpenDialogOptions{Title: title})
	if err != nil {
		http.Error(w, "Error opening dialog", http.StatusInternalServerError)
		return
	}
	if path == "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err := apply(rt, path); err != nil {
		slog.Error("error aplicando la carpeta", "path", path, "err", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	d.writeSettings(w)
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
