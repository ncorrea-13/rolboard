package desktop

import (
	"context"
	"errors"
	"io"
	"io/fs"
	"net/http"
	"sync"
	"sync/atomic"

	"github.com/ncorrea-13/rolboard/server/internal/app"
	"github.com/ncorrea-13/rolboard/server/internal/snapshot"
)

type Runtime struct {
	dir     string
	mu      sync.RWMutex
	cfg     Config
	handler http.Handler
	closer  io.Closer
	dirty   atomic.Bool
}

func Start(ctx context.Context, dir string) (*Runtime, error) {
	cfg, err := Load(dir)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return nil, err
	}
	r := &Runtime{dir: dir, cfg: cfg}
	if _, err := r.pullLocked(ctx); err != nil {
		return nil, err
	}
	if err := r.openLocked(); err != nil {
		return nil, err
	}
	return r, nil
}

func (r *Runtime) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if r.handler == nil {
		http.Error(w, "Closed", http.StatusServiceUnavailable)
		return
	}
	r.handler.ServeHTTP(w, req)
	if req.Method != http.MethodGet && req.Method != http.MethodHead {
		r.dirty.Store(true)
	}
}

func (r *Runtime) Settings() Config {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.cfg
}

func (r *Runtime) SetVaultsRoot(path string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.cfg.VaultsRoot = path
	if err := Save(r.dir, r.cfg); err != nil {
		return err
	}
	return r.openLocked()
}

func (r *Runtime) SetSyncDir(ctx context.Context, path string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if err := r.closeLocked(); err != nil {
		return err
	}
	if err := snapshot.CopyMissing(UploadsDir(r.dir), snapshot.UploadsDir(path)); err != nil {
		return err
	}
	r.cfg.SyncDir = path
	current, err := snapshot.Fingerprint(path)
	switch {
	case err == nil:
		if err := snapshot.Import(ctx, path, DBPath(r.dir)); err != nil {
			return errors.Join(err, r.openLocked())
		}
		r.dirty.Store(false)
		r.cfg.LastSync = current
	case errors.Is(err, fs.ErrNotExist):
		if err := r.openLocked(); err != nil {
			return err
		}
		if r.cfg.LastSync, err = snapshot.Export(ctx, DBPath(r.dir), path); err != nil {
			return err
		}
		r.dirty.Store(false)
		return Save(r.dir, r.cfg)
	default:
		return errors.Join(err, r.openLocked())
	}
	if err := Save(r.dir, r.cfg); err != nil {
		return err
	}
	return r.openLocked()
}

func (r *Runtime) Push(ctx context.Context) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.cfg.SyncDir == "" || !r.dirty.Load() {
		return nil
	}
	if _, changed, err := snapshot.Changed(r.cfg.SyncDir, r.cfg.LastSync); err != nil {
		return err
	} else if changed {
		if err := snapshot.KeepConflict(r.cfg.SyncDir); err != nil {
			return err
		}
	}
	fingerprint, err := snapshot.Export(ctx, DBPath(r.dir), r.cfg.SyncDir)
	if err != nil {
		return err
	}
	r.dirty.Store(false)
	r.cfg.LastSync = fingerprint
	return Save(r.dir, r.cfg)
}

func (r *Runtime) Pull(ctx context.Context) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.cfg.SyncDir == "" {
		return false, nil
	}
	if _, changed, err := snapshot.Changed(r.cfg.SyncDir, r.cfg.LastSync); err != nil || !changed {
		return false, err
	}
	if err := r.closeLocked(); err != nil {
		return false, err
	}
	imported, err := r.pullLocked(ctx)
	return imported, errors.Join(err, r.openLocked())
}

func (r *Runtime) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.closeLocked()
}

func (r *Runtime) pullLocked(ctx context.Context) (bool, error) {
	if r.cfg.SyncDir == "" {
		return false, nil
	}
	current, changed, err := snapshot.Changed(r.cfg.SyncDir, r.cfg.LastSync)
	if err != nil || !changed {
		return false, err
	}
	if err := snapshot.Import(ctx, r.cfg.SyncDir, DBPath(r.dir)); err != nil {
		return false, err
	}
	r.dirty.Store(false)
	r.cfg.LastSync = current
	return true, Save(r.dir, r.cfg)
}

func (r *Runtime) openLocked() error {
	uploads := UploadsDir(r.dir)
	if r.cfg.SyncDir != "" {
		uploads = snapshot.UploadsDir(r.cfg.SyncDir)
	}
	handler, closer, err := app.New(app.Config{
		DBPath:      DBPath(r.dir),
		VaultsRoot:  r.cfg.VaultsRoot,
		UploadsRoot: uploads,
		LocalMode:   true,
	})
	if err != nil {
		return err
	}
	old := r.closer
	r.handler, r.closer = handler, closer
	if old != nil {
		return old.Close()
	}
	return nil
}

func (r *Runtime) closeLocked() error {
	r.handler = nil
	if r.closer == nil {
		return nil
	}
	err := r.closer.Close()
	r.closer = nil
	return err
}
