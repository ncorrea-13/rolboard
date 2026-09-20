package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func TestCreateNPCRejectsLocationFromAnotherCampaign(t *testing.T) {
	db := setupCampaignTestDB(t)
	ctx := context.Background()

	npcSvc := service.NewNPCService(repository.NewNPCRepository(db), t.TempDir())
	locRepo := repository.NewLocationRepository(db)
	locSvc := service.NewLocationService(locRepo, t.TempDir())
	h := &Handlers{npcs: npcSvc, locations: locSvc}

	campaignRepo := repository.NewCampaignRepository(db)
	campaignA := &models.Campaign{Name: "A", System: "Cosmere RPG"}
	if err := campaignRepo.Create(ctx, campaignA); err != nil {
		t.Fatalf("seed campaign A: %v", err)
	}
	campaignB := &models.Campaign{Name: "B", System: "Cosmere RPG"}
	if err := campaignRepo.Create(ctx, campaignB); err != nil {
		t.Fatalf("seed campaign B: %v", err)
	}

	locB := &models.Location{CampaignID: campaignB.ID, Name: "Elsewhere", LocationType: "city"}
	if err := locRepo.Create(ctx, locB); err != nil {
		t.Fatalf("seed location B: %v", err)
	}

	payload := CreateNPCPayload{
		Name: "Shallan", NPCKind: "npc", DetailLevel: "minor", Status: "vivo",
		LocationID: &locB.ID,
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/campaigns/1/npcs", bytes.NewReader(body))
	req.SetPathValue("id", strconv.FormatInt(campaignA.ID, 10))
	rec := httptest.NewRecorder()
	h.CreateNPC(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for cross-campaign location_id, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestCreateNPCAcceptsLocationFromSameCampaign(t *testing.T) {
	db := setupCampaignTestDB(t)
	ctx := context.Background()

	npcSvc := service.NewNPCService(repository.NewNPCRepository(db), t.TempDir())
	locRepo := repository.NewLocationRepository(db)
	locSvc := service.NewLocationService(locRepo, t.TempDir())
	h := &Handlers{npcs: npcSvc, locations: locSvc}

	campaignRepo := repository.NewCampaignRepository(db)
	campaignA := &models.Campaign{Name: "A", System: "Cosmere RPG"}
	if err := campaignRepo.Create(ctx, campaignA); err != nil {
		t.Fatalf("seed campaign A: %v", err)
	}

	locA := &models.Location{CampaignID: campaignA.ID, Name: "Home", LocationType: "city"}
	if err := locRepo.Create(ctx, locA); err != nil {
		t.Fatalf("seed location A: %v", err)
	}

	payload := CreateNPCPayload{
		Name: "Shallan", NPCKind: "npc", DetailLevel: "minor", Status: "vivo",
		LocationID: &locA.ID,
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/campaigns/1/npcs", bytes.NewReader(body))
	req.SetPathValue("id", strconv.FormatInt(campaignA.ID, 10))
	rec := httptest.NewRecorder()
	h.CreateNPC(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 for same-campaign location_id, got %d: %s", rec.Code, rec.Body.String())
	}
}
