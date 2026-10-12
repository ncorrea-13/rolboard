package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestNPCAppearances(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	npcs := NewNPCRepository(db)
	sessions := NewSessionRepository(db)
	quests := NewQuestRepository(db)
	secrets := NewSecretRepository(db)

	npc := &models.NPC{CampaignID: campaignID, Name: "Ana", NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
	if err := npcs.Create(ctx, npc); err != nil {
		t.Fatalf("Create npc failed: %v", err)
	}
	s1 := &models.Session{CampaignID: campaignID, SessionNumber: 2, SessionType: "session", Date: "2026-01-02"}
	s2 := &models.Session{CampaignID: campaignID, SessionNumber: 1, SessionType: "session", Date: "2026-01-01"}
	for _, s := range []*models.Session{s1, s2} {
		if err := sessions.Create(ctx, s); err != nil {
			t.Fatalf("Create session failed: %v", err)
		}
		if err := sessions.AddNpc(ctx, s.ID, npc.ID); err != nil {
			t.Fatalf("AddNpc failed: %v", err)
		}
	}
	q := &models.Quest{CampaignID: campaignID, Title: "El aceite", Status: "active"}
	if err := quests.Create(ctx, q); err != nil {
		t.Fatalf("Create quest failed: %v", err)
	}
	if err := quests.SetNpc(ctx, q.ID, npc.ID, "informante"); err != nil {
		t.Fatalf("SetNpc failed: %v", err)
	}
	sec := &models.Secret{CampaignID: campaignID, Title: "Lo sabe todo", Status: "hidden", KnownByNPCIDs: []int64{npc.ID}}
	if err := secrets.Create(ctx, sec); err != nil {
		t.Fatalf("Create secret failed: %v", err)
	}

	a, err := NewAppearanceRepository(db).ForNPC(ctx, npc.ID)
	if err != nil {
		t.Fatalf("ForNPC failed: %v", err)
	}
	if len(a.Sessions) != 2 || a.Sessions[0].SessionNumber != 1 {
		t.Fatalf("Expected 2 sessions ordered by number, got %+v", a.Sessions)
	}
	if len(a.Quests) != 1 || a.Quests[0].Role != "informante" {
		t.Fatalf("Unexpected quests: %+v", a.Quests)
	}
	if len(a.Secrets) != 1 || a.Secrets[0].Title != "Lo sabe todo" {
		t.Fatalf("Unexpected secrets: %+v", a.Secrets)
	}

	if err := sessions.Delete(ctx, s1.ID); err != nil {
		t.Fatalf("Delete session failed: %v", err)
	}
	a, _ = NewAppearanceRepository(db).ForNPC(ctx, npc.ID)
	if len(a.Sessions) != 1 {
		t.Fatalf("A deleted session must not be listed, got %+v", a.Sessions)
	}
}
