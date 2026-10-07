package mobile

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRequestRoundTrip(t *testing.T) {
	dir := t.TempDir()
	if err := Start(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = Stop() })

	res, err := Request(http.MethodGet, "/api/admin/session", "", nil)
	if err != nil || res.Status != http.StatusOK || !strings.Contains(string(res.Body), `"localMode":true`) {
		t.Fatalf("session: %+v, %v", res, err)
	}

	res, err = Request(http.MethodPost, "/api/campaigns", "application/json",
		[]byte(`{"name":"Prueba","system":"D&D","status":"active"}`))
	if err != nil || res.Status != http.StatusCreated {
		t.Fatalf("create: %+v, %v", res, err)
	}

	res, err = Request(http.MethodGet, "/api/campaigns", "", nil)
	if err != nil || res.Status != http.StatusOK {
		t.Fatalf("list: %+v, %v", res, err)
	}
	var campaigns []struct{ Name string }
	if err := json.Unmarshal(res.Body, &campaigns); err != nil || len(campaigns) != 1 || campaigns[0].Name != "Prueba" {
		t.Fatalf("list body: %s, %v", res.Body, err)
	}
}

func TestSetVaultsRootSurvivesRestart(t *testing.T) {
	dir := t.TempDir()
	vaults := t.TempDir()
	if err := os.Mkdir(filepath.Join(vaults, "Mi vault"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := Start(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = Stop() })

	if err := SetVaultsRoot(vaults); err != nil {
		t.Fatal(err)
	}
	res, err := Request(http.MethodGet, "/api/admin/vault-dirs", "", nil)
	if err != nil || !strings.Contains(string(res.Body), "Mi vault") {
		t.Fatalf("vault-dirs: %+v, %v", res, err)
	}

	if err := Stop(); err != nil {
		t.Fatal(err)
	}
	if err := Start(dir); err != nil {
		t.Fatal(err)
	}
	if VaultsRoot() != vaults {
		t.Fatalf("vaults root after restart: %q", VaultsRoot())
	}
}

func TestRequestBeforeStart(t *testing.T) {
	_ = Stop()
	if _, err := Request(http.MethodGet, "/api/campaigns", "", nil); err == nil {
		t.Fatal("expected an error before Start")
	}
}
