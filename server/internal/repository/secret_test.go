package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestSecretKnownByReplacedAndDeletedNPCsHidden(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	npcs := NewNPCRepository(db)
	secrets := NewSecretRepository(db)

	mk := func(name string) *models.NPC {
		n := &models.NPC{CampaignID: campaignID, Name: name, NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
		if err := npcs.Create(ctx, n); err != nil {
			t.Fatalf("Create npc failed: %v", err)
		}
		return n
	}
	a, b := mk("Ana"), mk("Beto")

	s := &models.Secret{CampaignID: campaignID, Title: "El lord fue envenenado", Status: "hidden", NPCID: &a.ID, KnownByNPCIDs: []int64{a.ID, b.ID}}
	if err := secrets.Create(ctx, s); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if len(s.KnownByNPCIDs) != 2 {
		t.Fatalf("Expected 2 known-by NPCs, got %v", s.KnownByNPCIDs)
	}

	update := &models.Secret{Title: "El lord fue envenenado", Status: "revealed", KnownByNPCIDs: []int64{b.ID}}
	if err := secrets.Update(ctx, s.ID, update); err != nil {
		t.Fatalf("Update failed: %v", err)
	}
	if len(update.KnownByNPCIDs) != 1 || update.KnownByNPCIDs[0] != b.ID || update.NPCID != nil {
		t.Fatalf("Expected known-by replaced and npc link cleared, got %+v", update)
	}

	if err := npcs.Delete(ctx, b.ID); err != nil {
		t.Fatalf("Delete npc failed: %v", err)
	}
	list, err := secrets.List(ctx, campaignID)
	if err != nil || len(list) != 1 {
		t.Fatalf("Unexpected list: %+v (%v)", list, err)
	}
	if len(list[0].KnownByNPCIDs) != 0 {
		t.Fatalf("A deleted NPC must not appear as knowing the secret, got %v", list[0].KnownByNPCIDs)
	}
}
