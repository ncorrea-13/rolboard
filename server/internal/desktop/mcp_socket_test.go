package desktop

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"sync/atomic"
	"testing"
)

// shortPath keeps the socket path under the ~100 byte limit of unix sockets.
func shortPath(t *testing.T) string {
	t.Helper()
	dir, err := os.MkdirTemp("", "rb")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })
	return filepath.Join(dir, "mcp.sock")
}

func unixClient(path string) *http.Client {
	return &http.Client{Transport: &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", path)
		},
	}}
}

func TestMCPHandlerOnlyServesTheAPI(t *testing.T) {
	var writes atomic.Int32
	h := MCPHandler(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}), func() { writes.Add(1) })

	cases := []struct {
		method, path string
		want         int
	}{
		{"GET", "/api/campaigns", http.StatusNoContent},
		{"POST", "/api/campaigns", http.StatusNoContent},
		{"GET", "/api/desktop/settings", http.StatusNotFound},
		{"POST", "/api/desktop/open", http.StatusNotFound},
		{"GET", "/", http.StatusNotFound},
		{"GET", "/index.html", http.StatusNotFound},
	}
	for _, c := range cases {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(c.method, c.path, nil))
		if rec.Code != c.want {
			t.Errorf("%s %s: got %d, want %d", c.method, c.path, rec.Code, c.want)
		}
	}
	if got := writes.Load(); got != 1 {
		t.Errorf("afterWrite should run only for the POST that reached the API, ran %d times", got)
	}
}

func TestListenSocketServesAndCleansUp(t *testing.T) {
	path := shortPath(t)
	stop, err := ListenSocket(path, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	}))
	if err != nil {
		t.Fatal(err)
	}

	resp, err := unixClient(path).Get("http://rolboard/api/anything")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusTeapot {
		t.Errorf("unexpected status %d", resp.StatusCode)
	}
	if runtime.GOOS != "windows" {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatal(err)
		}
		if perm := info.Mode().Perm(); perm != 0o600 {
			t.Errorf("socket permissions are %o, want 600", perm)
		}
	}

	if err := stop(); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("the socket file should be gone after stop, got %v", err)
	}
}

func TestListenSocketReplacesAStaleSocketButNotALiveOne(t *testing.T) {
	path := shortPath(t)
	h := http.NotFoundHandler()

	// A crash leaves the file behind with nobody listening.
	stale, err := net.Listen("unix", path)
	if err != nil {
		t.Fatal(err)
	}
	stale.(*net.UnixListener).SetUnlinkOnClose(false)
	stale.Close()
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("test setup: stale socket file missing: %v", err)
	}

	stop, err := ListenSocket(path, h)
	if err != nil {
		t.Fatalf("a stale socket should be replaced: %v", err)
	}
	defer stop()

	if _, err := ListenSocket(path, h); !errors.Is(err, ErrSocketInUse) {
		t.Errorf("a live socket must not be taken over, got %v", err)
	}
}
