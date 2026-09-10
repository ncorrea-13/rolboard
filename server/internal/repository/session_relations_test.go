package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestSessionNpcsAddListRemove(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	sessionRepo := NewSessionRepository(db)
	session := &models.Session{CampaignID: campaignID, SessionNumber: 1, SessionType: "planning", Date: "2026-01-01"}
	if err := sessionRepo.Create(ctx, session); err != nil {
		t.Fatalf("Create session failed: %v", err)
	}

	npcRepo := NewNPCRepository(db)
	npc := &models.NPC{CampaignID: campaignID, Name: "Test NPC", NPCKind: "npc", DetailLevel: "full", Status: "vivo"}
	if err := npcRepo.Create(ctx, npc); err != nil {
		t.Fatalf("Create npc failed: %v", err)
	}

	if err := sessionRepo.AddNpc(ctx, session.ID, npc.ID); err != nil {
		t.Fatalf("AddNpc failed: %v", err)
	}
	if err := sessionRepo.AddNpc(ctx, session.ID, npc.ID); err != nil {
		t.Fatalf("AddNpc (repeat) failed: %v", err)
	}

	npcs, err := sessionRepo.ListNpcs(ctx, session.ID)
	if err != nil {
		t.Fatalf("ListNpcs failed: %v", err)
	}
	if len(npcs) != 1 || npcs[0].NPCID != npc.ID || npcs[0].Name != "Test NPC" {
		t.Errorf("Expected [{%d Test NPC}], got %+v", npc.ID, npcs)
	}

	if err := sessionRepo.RemoveNpc(ctx, session.ID, npc.ID); err != nil {
		t.Fatalf("RemoveNpc failed: %v", err)
	}

	npcs, err = sessionRepo.ListNpcs(ctx, session.ID)
	if err != nil {
		t.Fatalf("ListNpcs after remove failed: %v", err)
	}
	if len(npcs) != 0 {
		t.Errorf("Expected no npcs after remove, got %+v", npcs)
	}
}

func TestSessionQuestsAddListRemove(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	sessionRepo := NewSessionRepository(db)
	session := &models.Session{CampaignID: campaignID, SessionNumber: 1, SessionType: "planning", Date: "2026-01-01"}
	if err := sessionRepo.Create(ctx, session); err != nil {
		t.Fatalf("Create session failed: %v", err)
	}

	questRepo := NewQuestRepository(db)
	quest := &models.Quest{CampaignID: campaignID, Title: "Test Quest", Status: "active"}
	if err := questRepo.Create(ctx, quest); err != nil {
		t.Fatalf("Create quest failed: %v", err)
	}

	if err := sessionRepo.AddQuest(ctx, session.ID, quest.ID); err != nil {
		t.Fatalf("AddQuest failed: %v", err)
	}

	quests, err := sessionRepo.ListQuests(ctx, session.ID)
	if err != nil {
		t.Fatalf("ListQuests failed: %v", err)
	}
	if len(quests) != 1 || quests[0].QuestID != quest.ID || quests[0].Title != "Test Quest" {
		t.Errorf("Expected [{%d Test Quest}], got %+v", quest.ID, quests)
	}

	if err := sessionRepo.RemoveQuest(ctx, session.ID, quest.ID); err != nil {
		t.Fatalf("RemoveQuest failed: %v", err)
	}

	quests, err = sessionRepo.ListQuests(ctx, session.ID)
	if err != nil {
		t.Fatalf("ListQuests after remove failed: %v", err)
	}
	if len(quests) != 0 {
		t.Errorf("Expected no quests after remove, got %+v", quests)
	}
}

func TestSessionPrepNotesRoundtrip(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewSessionRepository(db)
	session := &models.Session{
		CampaignID: campaignID, SessionNumber: 1, SessionType: "planning",
		Date: "2026-01-01", Summary: "prep", PrepNotes: "notas de prep",
	}
	if err := repo.Create(ctx, session); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if session.PrepNotes != "notas de prep" {
		t.Errorf("Expected PrepNotes to roundtrip on Create, got %q", session.PrepNotes)
	}

	updated := &models.Session{
		SessionNumber: 1, SessionType: "session", Date: "2026-01-02",
		Summary: "lo que paso", PrepNotes: session.PrepNotes,
	}
	if err := repo.Update(ctx, session.ID, updated); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	retrieved, err := repo.GetByID(ctx, session.ID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}
	if retrieved.PrepNotes != "notas de prep" {
		t.Errorf("Expected PrepNotes preserved after confirming played, got %q", retrieved.PrepNotes)
	}
}
