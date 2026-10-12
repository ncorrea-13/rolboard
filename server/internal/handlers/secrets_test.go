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

func TestSecretValidationAndHiddenClearsRevealedSession(t *testing.T) {
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
	sessionRepo := repository.NewSessionRepository(db)
	h := &Handlers{
		db:       db,
		secrets:  service.NewSecretService(repository.NewSecretRepository(db)),
		npcs:     service.NewNPCService(npcRepo, t.TempDir()),
		sessions: service.NewSessionService(sessionRepo),
	}

	foreign := &models.NPC{CampaignID: b.ID, Name: "Ajeno", NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
	if err := npcRepo.Create(ctx, foreign); err != nil {
		t.Fatalf("seed npc: %v", err)
	}
	session := &models.Session{CampaignID: a.ID, SessionNumber: 1, SessionType: "session", Date: "2026-01-01"}
	if err := sessionRepo.Create(ctx, session); err != nil {
		t.Fatalf("seed session: %v", err)
	}
	aID := strconv.FormatInt(a.ID, 10)

	rec := call(t, h.CreateSecret, http.MethodPost, aID, SecretPayload{Title: "X", Status: "hidden", KnownByNPCIDs: []int64{foreign.ID}})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("foreign known-by NPC expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if rec := call(t, h.CreateSecret, http.MethodPost, aID, SecretPayload{Title: "X", Status: "nope"}); rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid status expected 400, got %d", rec.Code)
	}

	rec = call(t, h.CreateSecret, http.MethodPost, aID, SecretPayload{Title: "Oculto", Status: "hidden", RevealedSessionID: &session.ID})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	var hidden models.Secret
	_ = json.Unmarshal(rec.Body.Bytes(), &hidden)
	if hidden.RevealedSessionID != nil {
		t.Fatal("A hidden secret must not keep a revealed session")
	}

	rec = call(t, h.CreateSecret, http.MethodPost, aID, SecretPayload{Title: "Revelado", Status: "revealed", RevealedSessionID: &session.ID})
	var revealed models.Secret
	_ = json.Unmarshal(rec.Body.Bytes(), &revealed)
	if revealed.RevealedSessionID == nil || *revealed.RevealedSessionID != session.ID {
		t.Fatalf("Expected revealed session kept, got %+v", revealed)
	}
}
