package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func TestLoreEntryRejectsForeignCategory(t *testing.T) {
	db := setupCampaignTestDB(t)
	ctx := context.Background()
	campaigns := repository.NewCampaignRepository(db)
	a := &models.Campaign{Name: "A", System: "x"}
	b := &models.Campaign{Name: "B", System: "x"}
	for _, c := range []*models.Campaign{a, b} {
		if err := campaigns.Create(ctx, c); err != nil {
			t.Fatalf("seed campaign: %v", err)
		}
	}
	h := &Handlers{
		db:   db,
		lore: service.NewLoreService(repository.NewLoreCategoryRepository(db), repository.NewLoreEntryRepository(db)),
		arcs: service.NewArcService(repository.NewArcRepository(db)),
	}

	cats, err := h.lore.ListCategories(ctx, b.ID)
	if err != nil || len(cats) == 0 {
		t.Fatalf("expected default categories for B: %v", err)
	}

	aID := strconv.FormatInt(a.ID, 10)
	rec := call(t, h.CreateLoreEntry, http.MethodPost, aID, LoreEntryPayload{Title: "X", CategoryID: &cats[0].ID})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("foreign category expected 400, got %d: %s", rec.Code, rec.Body.String())
	}

	rec = call(t, h.CreateLoreEntry, http.MethodPost, aID, LoreEntryPayload{Title: "Libre"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("entry without category expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	var created models.LoreEntry
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if created.CategoryID != nil || created.Title != "Libre" {
		t.Fatalf("unexpected entry: %+v", created)
	}

	if rec := call(t, h.CreateLoreEntry, http.MethodPost, aID, LoreEntryPayload{Title: "  "}); rec.Code != http.StatusBadRequest {
		t.Fatalf("blank title expected 400, got %d", rec.Code)
	}
}
