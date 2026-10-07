package desktop

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func startRuntime(t *testing.T, dir string) *Runtime {
	t.Helper()
	r, err := Start(context.Background(), dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = r.Close() })
	return r
}

func createCampaign(t *testing.T, r *Runtime, name string) {
	t.Helper()
	rec := httptest.NewRecorder()
	body := strings.NewReader(`{"name":"` + name + `","system":"D&D","status":"active"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/campaigns", body)
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create %s: %d %s", name, rec.Code, rec.Body)
	}
}

func campaignNames(t *testing.T, r *Runtime) []string {
	t.Helper()
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/campaigns", nil))
	var list []struct{ Name string }
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	names := make([]string, len(list))
	for i, c := range list {
		names[i] = c.Name
	}
	return names
}

func TestTwoDevicesShareASyncDir(t *testing.T) {
	ctx := context.Background()
	deskDir, phoneDir, syncDir := t.TempDir(), t.TempDir(), t.TempDir()

	desk := startRuntime(t, deskDir)
	createCampaign(t, desk, "Valdris")
	if err := os.MkdirAll(filepath.Join(deskDir, "uploads", "npcs"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(deskDir, "uploads", "npcs", "1-portrait.png"), []byte("png"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := desk.SetSyncDir(ctx, syncDir); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(syncDir, "uploads", "npcs", "1-portrait.png")); err != nil {
		t.Fatalf("uploads not copied: %v", err)
	}

	phone := startRuntime(t, phoneDir)
	createCampaign(t, phone, "Local del teléfono")
	if err := phone.SetSyncDir(ctx, syncDir); err != nil {
		t.Fatal(err)
	}
	if got := campaignNames(t, phone); len(got) != 1 || got[0] != "Valdris" {
		t.Fatalf("phone after joining: %v", got)
	}
	if _, err := os.Stat(DBPath(phoneDir) + ".bak"); err != nil {
		t.Fatalf("phone backup: %v", err)
	}

	createCampaign(t, phone, "Puerto Ceniza")
	if err := phone.Push(ctx); err != nil {
		t.Fatal(err)
	}
	imported, err := desk.Pull(ctx)
	if err != nil || !imported {
		t.Fatalf("desk pull: %v %v", imported, err)
	}
	if got := campaignNames(t, desk); len(got) != 2 {
		t.Fatalf("desk after pull: %v", got)
	}
	if imported, err := desk.Pull(ctx); err != nil || imported {
		t.Fatalf("second pull: %v %v", imported, err)
	}
}

func TestSettingsSurviveRestart(t *testing.T) {
	ctx := context.Background()
	dir, syncDir, vaults := t.TempDir(), t.TempDir(), t.TempDir()
	r := startRuntime(t, dir)
	if err := r.SetVaultsRoot(vaults); err != nil {
		t.Fatal(err)
	}
	if err := r.SetSyncDir(ctx, syncDir); err != nil {
		t.Fatal(err)
	}
	if err := r.Close(); err != nil {
		t.Fatal(err)
	}
	again := startRuntime(t, dir)
	if s := again.Settings(); s.VaultsRoot != vaults || s.SyncDir != syncDir || s.LastSync == "" {
		t.Fatalf("settings after restart: %+v", s)
	}
}

func TestPushOnlyAfterWrites(t *testing.T) {
	ctx := context.Background()
	deskDir, phoneDir, syncDir := t.TempDir(), t.TempDir(), t.TempDir()

	desk := startRuntime(t, deskDir)
	createCampaign(t, desk, "Valdris")
	if err := desk.SetSyncDir(ctx, syncDir); err != nil {
		t.Fatal(err)
	}
	phone := startRuntime(t, phoneDir)
	if err := phone.SetSyncDir(ctx, syncDir); err != nil {
		t.Fatal(err)
	}
	createCampaign(t, phone, "Desde el teléfono")
	if err := phone.Push(ctx); err != nil {
		t.Fatal(err)
	}

	if err := desk.Push(ctx); err != nil {
		t.Fatal(err)
	}
	other := startRuntime(t, t.TempDir())
	if err := other.SetSyncDir(ctx, syncDir); err != nil {
		t.Fatal(err)
	}
	if got := campaignNames(t, other); len(got) != 2 {
		t.Fatalf("an idle desktop overwrote the phone's copy: %v", got)
	}
	if _, err := os.Stat(filepath.Join(syncDir, "rolboard.conflict.db")); err == nil {
		t.Fatal("no conflict expected without local writes")
	}
}

func TestPushKeepsRemoteOnConflict(t *testing.T) {
	ctx := context.Background()
	deskDir, phoneDir, syncDir := t.TempDir(), t.TempDir(), t.TempDir()

	desk := startRuntime(t, deskDir)
	if err := desk.SetSyncDir(ctx, syncDir); err != nil {
		t.Fatal(err)
	}
	phone := startRuntime(t, phoneDir)
	if err := phone.SetSyncDir(ctx, syncDir); err != nil {
		t.Fatal(err)
	}
	createCampaign(t, phone, "Teléfono")
	if err := phone.Push(ctx); err != nil {
		t.Fatal(err)
	}
	createCampaign(t, desk, "Escritorio")
	if err := desk.Push(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(syncDir, "rolboard.conflict.db")); err != nil {
		t.Fatalf("remote copy not kept: %v", err)
	}
}
