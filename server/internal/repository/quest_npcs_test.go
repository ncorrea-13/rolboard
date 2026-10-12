package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestQuestNpcsRoleUpsertAndDeletedNPCHidden(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	quests := NewQuestRepository(db)
	npcs := NewNPCRepository(db)

	q := &models.Quest{CampaignID: campaignID, Title: "El aceite", Status: "active"}
	if err := quests.Create(ctx, q); err != nil {
		t.Fatalf("Create quest failed: %v", err)
	}
	mk := func(name string) *models.NPC {
		n := &models.NPC{CampaignID: campaignID, Name: name, NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
		if err := npcs.Create(ctx, n); err != nil {
			t.Fatalf("Create npc failed: %v", err)
		}
		return n
	}
	a, b := mk("Ana"), mk("Beto")

	if err := quests.SetNpc(ctx, q.ID, a.ID, "aliada"); err != nil {
		t.Fatalf("SetNpc failed: %v", err)
	}
	if err := quests.SetNpc(ctx, q.ID, b.ID, ""); err != nil {
		t.Fatalf("SetNpc failed: %v", err)
	}
	if err := quests.SetNpc(ctx, q.ID, a.ID, "objetivo"); err != nil {
		t.Fatalf("SetNpc update failed: %v", err)
	}

	list, err := quests.ListNpcs(ctx, q.ID)
	if err != nil || len(list) != 2 {
		t.Fatalf("Unexpected list: %+v (%v)", list, err)
	}
	if list[0].Name != "Ana" || list[0].Role != "objetivo" {
		t.Fatalf("Expected role replaced, got %+v", list[0])
	}

	if err := npcs.Delete(ctx, b.ID); err != nil {
		t.Fatalf("Delete npc failed: %v", err)
	}
	if err := quests.RemoveNpc(ctx, q.ID, a.ID); err != nil {
		t.Fatalf("RemoveNpc failed: %v", err)
	}
	list, _ = quests.ListNpcs(ctx, q.ID)
	if len(list) != 0 {
		t.Fatalf("Expected no visible NPCs, got %+v", list)
	}
}
