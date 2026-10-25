package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/desktop"
)

func TestOpenURLRejectsNonHTTPS(t *testing.T) {
	d := &desktopApp{}
	for _, body := range []string{
		`{"url":"file:///etc/passwd"}`,
		`{"url":"javascript:alert(1)"}`,
		`{"url":"http://example.com"}`,
		`{"url":"https://"}`,
		`not json`,
	} {
		rec := httptest.NewRecorder()
		d.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/desktop/open", strings.NewReader(body)))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: got %d, want 400", body, rec.Code)
		}
	}
}

func TestSaveExportRejectsBadCampaignID(t *testing.T) {
	d := &desktopApp{}
	for _, body := range []string{`{"campaignId":"../admin"}`, `{"campaignId":""}`, `{"campaignId":"1/export?x"}`, `not json`} {
		rec := httptest.NewRecorder()
		d.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/desktop/save-export", strings.NewReader(body)))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: got %d, want 400", body, rec.Code)
		}
	}
}

// startedApp returns an app backed by a real runtime in a short temp dir
// (unix socket paths are limited to about 100 bytes).
func startedApp(t *testing.T) *desktopApp {
	t.Helper()
	// <base>/rolboard, like os.UserConfigDir()/rolboard when XDG_CONFIG_HOME=<base>.
	base, err := os.MkdirTemp("", "rb")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(base) })
	dir := filepath.Join(base, "rolboard")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	rt, err := desktop.Start(context.Background(), dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = rt.Close() })
	d := &desktopApp{dir: dir}
	d.rt.Store(rt)
	t.Cleanup(func() { _ = d.setMCP(false) })
	return d
}

func socketGet(t *testing.T, d *desktopApp, path string) int {
	t.Helper()
	client := &http.Client{Transport: &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", desktop.SocketPath(d.dir))
		},
	}}
	resp, err := client.Get("http://rolboard" + path)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	return resp.StatusCode
}

func TestMCPToggleOpensAndClosesTheSocket(t *testing.T) {
	d := startedApp(t)
	post := func(body string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		d.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/desktop/mcp", strings.NewReader(body)))
		return rec
	}

	if rec := post(`{"enabled":true}`); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"mcpEnabled":true`) {
		t.Fatalf("enable: %d %s", rec.Code, rec.Body.String())
	}
	if got := socketGet(t, d, "/api/campaigns"); got != http.StatusOK {
		t.Errorf("the API should answer through the socket, got %d", got)
	}
	if got := socketGet(t, d, "/api/desktop/settings"); got != http.StatusNotFound {
		t.Errorf("desktop endpoints must not be reachable through the socket, got %d", got)
	}
	if cfg, err := desktop.Load(d.dir); err != nil || !cfg.MCPEnabled {
		t.Errorf("the flag should be saved in config.json: %+v %v", cfg, err)
	}

	if rec := post(`{"enabled":false}`); rec.Code != http.StatusOK {
		t.Fatalf("disable: %d %s", rec.Code, rec.Body.String())
	}
	if _, err := os.Stat(desktop.SocketPath(d.dir)); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("the socket file should be gone, got %v", err)
	}
	if rec := post(`not json`); rec.Code != http.StatusBadRequest {
		t.Errorf("bad body: got %d, want 400", rec.Code)
	}
}
