package mcpserver

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/app"
	"github.com/ncorrea-13/rolboard/server/internal/models"
)

const (
	testAdminToken = "admin-token-for-tests"
	testAccessCode = "access-code-1234"
)

// startTestServer runs the real app on a temp DB and returns its URL plus
// the ID of a campaign whose access code is testAccessCode.
func startTestServer(t *testing.T) (string, int64) {
	t.Helper()
	srv, id := startServer(t, false)
	return srv.URL, id
}

// startServer is startTestServer with an optional TLS front and Secure
// cookies, like the real deployment behind Caddy or tailscale serve.
func startServer(t *testing.T, secure bool) (*httptest.Server, int64) {
	t.Helper()
	dir := t.TempDir()
	handler, closer, err := app.New(app.Config{
		DBPath:       filepath.Join(dir, "rolboard.db"),
		VaultsRoot:   filepath.Join(dir, "vaults"),
		UploadsRoot:  filepath.Join(dir, "uploads"),
		AdminToken:   testAdminToken,
		CookieSecure: secure,
	})
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewUnstartedServer(handler)
	if secure {
		srv.StartTLS()
	} else {
		srv.Start()
	}
	t.Cleanup(func() {
		srv.Close()
		_ = closer.Close()
	})

	// A throwaway admin client sets the campaign up; the client under test
	// only ever gets the access code.
	jar, _ := cookiejar.New(nil)
	adminHTTP := srv.Client()
	adminHTTP.Jar = jar
	admin := &apiClient{http: adminHTTP, cfg: Config{BaseURL: srv.URL}}
	ctx := context.Background()
	if err := admin.send(ctx, http.MethodPost, "/api/admin/login", map[string]string{"token": testAdminToken}, nil); err != nil {
		t.Fatal(err)
	}
	var campaign models.Campaign
	if err := admin.send(ctx, http.MethodPost, "/api/campaigns", map[string]string{"name": "Test", "system": "dnd5e"}, &campaign); err != nil {
		t.Fatal(err)
	}
	path := "/api/campaigns/" + itoa(campaign.ID) + "/access-code"
	if err := admin.send(ctx, http.MethodPost, path, map[string]string{"code": testAccessCode}, nil); err != nil {
		t.Fatal(err)
	}
	return srv, campaign.ID
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }

func newTestClient(t *testing.T) (*apiClient, int64) {
	t.Helper()
	url, id := startTestServer(t)
	c, err := newAPIClient(Config{BaseURL: url, CampaignID: id, AccessCode: testAccessCode})
	if err != nil {
		t.Fatal(err)
	}
	return c, id
}

func TestClientLogsInOnFirstUnauthorized(t *testing.T) {
	c, id := newTestClient(t)

	var npcs []models.NPC
	if err := c.do(context.Background(), http.MethodGet, "/api/campaigns/"+itoa(id)+"/npcs", nil, &npcs); err != nil {
		t.Fatalf("expected the client to log in by itself: %v", err)
	}
}

func TestClientWrongCodeFailsWithoutLooping(t *testing.T) {
	url, id := startTestServer(t)
	c, err := newAPIClient(Config{BaseURL: url, CampaignID: id, AccessCode: "wrong-code-0000"})
	if err != nil {
		t.Fatal(err)
	}

	err = c.do(context.Background(), http.MethodGet, "/api/campaigns/"+itoa(id)+"/npcs", nil, nil)
	if err == nil {
		t.Fatal("expected an error")
	}
	if strings.Contains(err.Error(), "wrong-code-0000") {
		t.Errorf("error leaks the access code: %v", err)
	}
}

func TestAPIErrorCarriesStatus(t *testing.T) {
	c, _ := newTestClient(t)

	err := c.do(context.Background(), http.MethodGet, "/api/npcs/999999", nil, nil)
	apiErr, ok := err.(*apiError)
	if !ok {
		t.Fatalf("expected *apiError, got %T: %v", err, err)
	}
	// Another campaign's resource or a missing one: either way, not a success.
	if apiErr.Status != http.StatusNotFound && apiErr.Status != http.StatusUnauthorized {
		t.Errorf("unexpected status %d", apiErr.Status)
	}
}

func TestClientLoginOverHTTPSWithSecureCookie(t *testing.T) {
	srv, id := startServer(t, true)
	c, err := newAPIClient(Config{BaseURL: srv.URL, CampaignID: id, AccessCode: testAccessCode})
	if err != nil {
		t.Fatal(err)
	}
	c.http.Transport = srv.Client().Transport // trust the test certificate

	path := "/api/campaigns/" + itoa(id) + "/npcs"
	if err := c.do(context.Background(), http.MethodGet, path, nil, nil); err != nil {
		t.Fatalf("login over https: %v", err)
	}
	// The second call must reuse the Secure cookie from the jar, not log in again.
	if err := c.send(context.Background(), http.MethodGet, path, nil, nil); err != nil {
		t.Errorf("session cookie not reused: %v", err)
	}
}

// socketPath returns a short socket path: unix socket paths are limited to
// about 100 bytes, and t.TempDir() can exceed that.
func socketPath(t *testing.T) string {
	t.Helper()
	dir, err := os.MkdirTemp("", "rb")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })
	return filepath.Join(dir, "mcp.sock")
}

func TestClientOverSocketNeedsNoLogin(t *testing.T) {
	dir := t.TempDir()
	handler, closer, err := app.New(app.Config{
		DBPath:      filepath.Join(dir, "rolboard.db"),
		UploadsRoot: filepath.Join(dir, "uploads"),
		LocalMode:   true,
	})
	if err != nil {
		t.Fatal(err)
	}
	path := socketPath(t)
	ln, err := net.Listen("unix", path)
	if err != nil {
		t.Fatal(err)
	}
	srv := &http.Server{Handler: handler}
	go func() { _ = srv.Serve(ln) }()
	t.Cleanup(func() {
		_ = srv.Close()
		_ = closer.Close()
	})

	c, err := newAPIClient(Config{Socket: path})
	if err != nil {
		t.Fatal(err)
	}
	var campaign models.Campaign
	if err := c.do(context.Background(), http.MethodPost, "/api/campaigns", map[string]string{"name": "Local", "system": "dnd5e"}, &campaign); err != nil {
		t.Fatalf("local mode should accept the request without a login: %v", err)
	}
	if campaign.Name != "Local" {
		t.Errorf("unexpected campaign: %+v", campaign)
	}
}

func TestClientOverSocketReportsAClosedApp(t *testing.T) {
	c, err := newAPIClient(Config{Socket: socketPath(t)}) // nothing listens there
	if err != nil {
		t.Fatal(err)
	}
	err = c.do(context.Background(), http.MethodGet, "/api/campaigns", nil, nil)
	if !errors.Is(err, errAppClosed) {
		t.Errorf("expected errAppClosed, got %v", err)
	}
}
