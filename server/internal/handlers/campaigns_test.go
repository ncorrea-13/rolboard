package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
	_ "modernc.org/sqlite"
)

func setupCampaignTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("failed to open test DB: %v", err)
	}
	if err := repository.Migrate(db); err != nil {
		t.Fatalf("failed to migrate test DB: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Logf("error closing test DB: %v", err)
		}
	})
	return db
}

func TestListCampaignsDoesNotLeakVaultPathOrDescription(t *testing.T) {
	db := setupCampaignTestDB(t)
	repo := repository.NewCampaignRepository(db)
	svc := service.NewCampaignService(repo)

	if err := repo.Create(context.Background(), &models.Campaign{
		Name:        "Cosmere",
		System:      "Cosmere RPG",
		Description: "secret campaign notes",
		VaultPath:   "/home/dm/vaults/cosmere",
	}); err != nil {
		t.Fatalf("seed create failed: %v", err)
	}

	h := &Handlers{campaigns: svc}

	req := httptest.NewRequest(http.MethodGet, "/api/campaigns", nil)
	rec := httptest.NewRecorder()
	h.ListCampaigns(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var raw []map[string]json.RawMessage
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatalf("invalid JSON response: %v", err)
	}
	if len(raw) != 1 {
		t.Fatalf("expected 1 campaign, got %d", len(raw))
	}

	for _, forbidden := range []string{"vault_path", "description"} {
		if _, present := raw[0][forbidden]; present {
			t.Errorf("GET /api/campaigns must not include %q", forbidden)
		}
	}
	for _, required := range []string{"id", "name", "system", "status"} {
		if _, present := raw[0][required]; !present {
			t.Errorf("GET /api/campaigns is missing expected field %q", required)
		}
	}
}
