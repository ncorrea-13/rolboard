package handlers

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func TestExportCampaignReturnsAZip(t *testing.T) {
	db := setupCampaignTestDB(t)
	ctx := context.Background()

	campaigns := repository.NewCampaignRepository(db)
	campaign := &models.Campaign{Name: "Mesa Uno", System: "Genérico"}
	if err := campaigns.Create(ctx, campaign); err != nil {
		t.Fatalf("seed campaign: %v", err)
	}
	h := &Handlers{campaigns: service.NewCampaignService(campaigns), exports: service.NewExportService(db, t.TempDir())}

	req := httptest.NewRequest(http.MethodGet, "/api/campaigns/1/export", nil)
	req.SetPathValue("id", strconv.FormatInt(campaign.ID, 10))
	rec := httptest.NewRecorder()
	h.ExportCampaign(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/zip" {
		t.Errorf("expected application/zip, got %q", ct)
	}
	if cd := rec.Header().Get("Content-Disposition"); !strings.Contains(cd, "rolboard-mesa-uno-") || !strings.HasSuffix(cd, `.zip"`) {
		t.Errorf("unexpected Content-Disposition %q", cd)
	}
	zr, err := zip.NewReader(bytes.NewReader(rec.Body.Bytes()), int64(rec.Body.Len()))
	if err != nil {
		t.Fatalf("response is not a zip: %v", err)
	}
	if len(zr.File) != 1 || zr.File[0].Name != "Campaña.md" {
		t.Errorf("expected only Campaña.md for an empty campaign, got %d files", len(zr.File))
	}
}

func TestExportCampaignNotFound(t *testing.T) {
	db := setupCampaignTestDB(t)
	h := &Handlers{campaigns: service.NewCampaignService(repository.NewCampaignRepository(db))}

	req := httptest.NewRequest(http.MethodGet, "/api/campaigns/999/export", nil)
	req.SetPathValue("id", "999")
	rec := httptest.NewRecorder()
	h.ExportCampaign(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestSetNPCPlayerLinkRejectsAnotherCampaign(t *testing.T) {
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
	npcRepo := repository.NewNPCRepository(db)
	npc := &models.NPC{CampaignID: a.ID, Name: "Syl", NPCKind: "npc", DetailLevel: "full", Status: "vivo"}
	if err := npcRepo.Create(ctx, npc); err != nil {
		t.Fatalf("seed npc: %v", err)
	}
	pcRepo := repository.NewPlayerCharacterRepository(db)
	pc := &models.PlayerCharacter{CampaignID: b.ID, PlayerName: "Nico", CharacterName: "Shallan", Status: "activo"}
	if err := pcRepo.Create(ctx, pc); err != nil {
		t.Fatalf("seed pc: %v", err)
	}
	h := &Handlers{
		npcs:             service.NewNPCService(npcRepo, t.TempDir()),
		playerCharacters: service.NewPlayerCharacterService(pcRepo, t.TempDir()),
	}

	body, _ := json.Marshal(SetNPCPlayerLinkPayload{Role: "spren"})
	req := httptest.NewRequest(http.MethodPut, "/api/npcs/1/players/1", bytes.NewReader(body))
	req.SetPathValue("id", strconv.FormatInt(npc.ID, 10))
	req.SetPathValue("pcId", strconv.FormatInt(pc.ID, 10))
	rec := httptest.NewRecorder()
	h.SetNPCPlayerLink(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for a player of another campaign, got %d: %s", rec.Code, rec.Body.String())
	}
}
