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

func TestSetQuestNpcRejectsForeignNPCAndLongRole(t *testing.T) {
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
	questRepo := repository.NewQuestRepository(db)
	npcRepo := repository.NewNPCRepository(db)
	h := &Handlers{
		db:     db,
		quests: service.NewQuestService(questRepo),
		npcs:   service.NewNPCService(npcRepo, t.TempDir()),
	}

	quest := &models.Quest{CampaignID: a.ID, Title: "Q", Status: "active"}
	if err := questRepo.Create(ctx, quest); err != nil {
		t.Fatalf("seed quest: %v", err)
	}
	own := &models.NPC{CampaignID: a.ID, Name: "Propio", NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
	foreign := &models.NPC{CampaignID: b.ID, Name: "Ajeno", NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
	for _, n := range []*models.NPC{own, foreign} {
		if err := npcRepo.Create(ctx, n); err != nil {
			t.Fatalf("seed npc: %v", err)
		}
	}

	put := func(npcID int64, role string) *httptest.ResponseRecorder {
		body, _ := json.Marshal(QuestNpcPayload{Role: role})
		req := httptest.NewRequest(http.MethodPut, "/x", bytes.NewReader(body))
		req.SetPathValue("id", strconv.FormatInt(quest.ID, 10))
		req.SetPathValue("npcId", strconv.FormatInt(npcID, 10))
		rec := httptest.NewRecorder()
		h.SetQuestNpc(rec, req)
		return rec
	}

	if rec := put(foreign.ID, "aliado"); rec.Code != http.StatusBadRequest {
		t.Fatalf("foreign NPC expected 400, got %d", rec.Code)
	}
	long := string(bytes.Repeat([]byte("a"), 61))
	if rec := put(own.ID, long); rec.Code != http.StatusBadRequest {
		t.Fatalf("long role expected 400, got %d", rec.Code)
	}
	if rec := put(own.ID, "aliado"); rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", rec.Code, rec.Body.String())
	}
}
