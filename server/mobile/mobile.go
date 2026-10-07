package mobile

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"

	"github.com/ncorrea-13/rolboard/server/internal/desktop"
)

type Response struct {
	Status      int
	ContentType string
	Body        []byte
}

var (
	mu sync.Mutex
	rt *desktop.Runtime
)

var errNotStarted = errors.New("rolboard: not started")

func current() (*desktop.Runtime, error) {
	mu.Lock()
	defer mu.Unlock()
	if rt == nil {
		return nil, errNotStarted
	}
	return rt, nil
}

func Start(dir string) error {
	mu.Lock()
	defer mu.Unlock()
	if rt != nil {
		_ = rt.Close()
		rt = nil
	}
	r, err := desktop.Start(context.Background(), dir)
	if err != nil {
		return err
	}
	rt = r
	return nil
}

func Stop() error {
	mu.Lock()
	defer mu.Unlock()
	if rt == nil {
		return nil
	}
	err := rt.Close()
	rt = nil
	return err
}

func Request(method, path, contentType string, body []byte) (*Response, error) {
	r, err := current()
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest(method, "http://rolboard"+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return &Response{
		Status:      rec.Code,
		ContentType: rec.Header().Get("Content-Type"),
		Body:        rec.Body.Bytes(),
	}, nil
}

func VaultsRoot() string {
	r, err := current()
	if err != nil {
		return ""
	}
	return r.Settings().VaultsRoot
}

func SyncDir() string {
	r, err := current()
	if err != nil {
		return ""
	}
	return r.Settings().SyncDir
}

func SetVaultsRoot(path string) error {
	r, err := current()
	if err != nil {
		return err
	}
	return r.SetVaultsRoot(path)
}

func SetSyncDir(path string) error {
	r, err := current()
	if err != nil {
		return err
	}
	return r.SetSyncDir(context.Background(), path)
}

func Push() error {
	r, err := current()
	if err != nil {
		return err
	}
	return r.Push(context.Background())
}

func Pull() (bool, error) {
	r, err := current()
	if err != nil {
		return false, err
	}
	return r.Pull(context.Background())
}
