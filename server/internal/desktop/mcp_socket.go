package desktop

import (
	"errors"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var ErrSocketInUse = errors.New("another Rolboard instance is already listening on the MCP socket")

// MCPHandler is what MCP clients may reach through the socket: the API, not
// the desktop endpoints (native dialogs, opening URLs, changing folders).
// afterWrite runs after every request that is not a read, like the webview's
// handler does to schedule the sync push.
func MCPHandler(next http.Handler, afterWrite func()) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/api/desktop/") {
			http.NotFound(w, r)
			return
		}
		next.ServeHTTP(w, r)
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			afterWrite()
		}
	})
}

// ListenSocket serves h on a unix socket only the current user can use and
// returns the function that stops it. A socket left by a crash is replaced; one
// owned by a live process is not.
func ListenSocket(path string, h http.Handler) (stop func() error, err error) {
	if conn, err := net.DialTimeout("unix", path, time.Second); err == nil {
		_ = conn.Close()
		return nil, ErrSocketInUse
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	ln, err := net.Listen("unix", path)
	if err != nil {
		return nil, err
	}
	// shortcut: on Windows Chmod does nothing; the socket relies on the user's
	// profile folder ACL. Verify on a real Windows machine.
	if err := os.Chmod(path, 0o600); err != nil {
		_ = ln.Close()
		return nil, err
	}
	srv := &http.Server{Handler: h, ReadHeaderTimeout: 10 * time.Second}
	go func() { _ = srv.Serve(ln) }()
	return srv.Close, nil
}
