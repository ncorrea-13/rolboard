package main

import (
	"bufio"
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

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
	_ = resp.Body.Close()
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

// TestMCPBridgeHelper is not a test: it is the `rolboard mcp` process the
// test below launches, re-executing this test binary.
func TestMCPBridgeHelper(t *testing.T) {
	if os.Getenv("ROLBOARD_TEST_MCP_BRIDGE") != "1" {
		t.Skip("helper process")
	}
	runMCP()
}

// bridgeListCampaigns runs the bridge as an MCP client would (stdio, JSON-RPC)
// and returns the list_campaigns response line plus the bridge's exit error.
func bridgeListCampaigns(t *testing.T, configHome string) (string, error) {
	t.Helper()
	cmd := exec.Command(os.Args[0], "-test.run=^TestMCPBridgeHelper$")
	cmd.Env = append(os.Environ(), "ROLBOARD_TEST_MCP_BRIDGE=1", "XDG_CONFIG_HOME="+configHome)
	in, err := cmd.StdinPipe()
	if err != nil {
		t.Fatal(err)
	}
	out, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	timer := time.AfterFunc(20*time.Second, func() { _ = cmd.Process.Kill() })
	defer timer.Stop()

	for _, msg := range []string{
		`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}`,
		`{"jsonrpc":"2.0","method":"notifications/initialized"}`,
		`{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_campaigns","arguments":{}}}`,
	} {
		if _, err := io.WriteString(in, msg+"\n"); err != nil {
			t.Fatal(err)
		}
	}
	var response string
	sc := bufio.NewScanner(out)
	sc.Buffer(make([]byte, 1<<20), 1<<20)
	for sc.Scan() {
		if strings.Contains(sc.Text(), `"id":2`) {
			response = sc.Text()
			break
		}
	}
	_ = in.Close() // the client going away must end the bridge cleanly
	return response, cmd.Wait()
}

func TestMCPBridgeTalksToTheRunningApp(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("the helper finds the config dir through XDG_CONFIG_HOME")
	}
	d := startedApp(t)
	home := filepath.Dir(d.dir)

	// Agents not enabled: the tool must say so instead of failing obscurely.
	resp, err := bridgeListCampaigns(t, home)
	if err != nil {
		t.Errorf("the bridge should exit cleanly when the client closes stdin: %v", err)
	}
	if !strings.Contains(resp, `"isError":true`) || !strings.Contains(resp, "no est") {
		t.Errorf("expected the app-closed message, got %s", resp)
	}

	if err := d.setMCP(true); err != nil {
		t.Fatal(err)
	}
	resp, err = bridgeListCampaigns(t, home)
	if err != nil {
		t.Errorf("the bridge should exit cleanly when the client closes stdin: %v", err)
	}
	if strings.Contains(resp, `"isError":true`) || !strings.Contains(resp, `"items"`) {
		t.Errorf("expected the campaign list through the socket, got %s", resp)
	}
}

func TestConnectMCPClients(t *testing.T) {
	cfg, home := t.TempDir(), t.TempDir()
	d := &desktopApp{clientsFn: func() ([]desktop.Client, error) { return desktop.ClientsAt(cfg, home), nil }}
	do := func(method, path, body string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		d.ServeHTTP(rec, httptest.NewRequest(method, path, strings.NewReader(body)))
		return rec
	}

	list := do(http.MethodGet, "/api/desktop/mcp-clients", "")
	if list.Code != http.StatusOK || !strings.Contains(list.Body.String(), `"id":"codex","label":"Codex","installed":false,"connected":false`) {
		t.Fatalf("list: %d %s", list.Code, list.Body.String())
	}

	for _, c := range []struct {
		body string
		want int
	}{
		{`not json`, http.StatusBadRequest},
		{`{"id":"nope"}`, http.StatusNotFound},
		{`{"id":"claude-desktop"}`, http.StatusConflict}, // not installed
	} {
		if rec := do(http.MethodPost, "/api/desktop/mcp-clients/connect", c.body); rec.Code != c.want {
			t.Errorf("%s: got %d, want %d", c.body, rec.Code, c.want)
		}
	}

	if err := os.MkdirAll(filepath.Join(cfg, "Claude"), 0o755); err != nil {
		t.Fatal(err)
	}
	rec := do(http.MethodPost, "/api/desktop/mcp-clients/connect", `{"id":"claude-desktop"}`)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"id":"claude-desktop","label":"Claude Desktop","installed":true,"connected":true`) {
		t.Fatalf("connect: %d %s", rec.Code, rec.Body.String())
	}
	written, err := os.ReadFile(filepath.Join(cfg, "Claude", "claude_desktop_config.json"))
	if err != nil || !strings.Contains(string(written), `"mcp"`) {
		t.Errorf("the config should launch `<exe> mcp`: %s %v", written, err)
	}
}

func TestMCPClientEndpointsAreNotOnTheSocket(t *testing.T) {
	d := startedApp(t)
	if err := d.setMCP(true); err != nil {
		t.Fatal(err)
	}
	if got := socketGet(t, d, "/api/desktop/mcp-clients"); got != http.StatusNotFound {
		t.Errorf("an agent must not be able to rewrite client configs, got %d", got)
	}
}
