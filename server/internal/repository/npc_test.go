package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestNPCCreate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewNPCRepository(db)
	npc := &models.NPC{
		CampaignID:  campaignID,
		Name:        "Kaladin",
		NPCKind:     "npc",
		DetailLevel: "full",
		Status:      "vivo",
	}

	if err := repo.Create(ctx, npc); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if npc.ID == 0 {
		t.Error("Expected npc ID to be set")
	}
	if npc.LocationID != nil || npc.Etnia != nil {
		t.Error("Expected nullable fields to stay nil")
	}
}

func TestNPCCreateWithNullableFields(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	locRepo := NewLocationRepository(db)
	loc := &models.Location{CampaignID: campaignID, Name: "Urithiru", LocationType: "site"}
	if err := locRepo.Create(ctx, loc); err != nil {
		t.Fatalf("Create location failed: %v", err)
	}

	repo := NewNPCRepository(db)
	etnia := "Alethi"
	npc := &models.NPC{
		CampaignID:  campaignID,
		Name:        "Kaladin",
		NPCKind:     "npc",
		DetailLevel: "full",
		Status:      "vivo",
		LocationID:  &loc.ID,
		Etnia:       &etnia,
	}

	if err := repo.Create(ctx, npc); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if npc.LocationID == nil || *npc.LocationID != loc.ID {
		t.Errorf("Expected LocationID %d, got %v", loc.ID, npc.LocationID)
	}
	if npc.Etnia == nil || *npc.Etnia != "Alethi" {
		t.Errorf("Expected Etnia 'Alethi', got %v", npc.Etnia)
	}
}

func TestNPCListByCampaign(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewNPCRepository(db)
	for i := 0; i < 3; i++ {
		npc := &models.NPC{CampaignID: campaignID, Name: "NPC", NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
		if err := repo.Create(ctx, npc); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	npcs, err := repo.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(npcs) != 3 {
		t.Errorf("Expected 3 npcs, got %d", len(npcs))
	}
}

func TestNPCGetByIDNotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewNPCRepository(db)

	_, err := repo.GetByID(context.Background(), 9999)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestNPCUpdate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewNPCRepository(db)
	created := &models.NPC{CampaignID: campaignID, Name: "Original", NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	updated := &models.NPC{Name: "Updated", NPCKind: "spren", DetailLevel: "full", Status: "consolidado"}
	if err := repo.Update(ctx, created.ID, updated); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	retrieved, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID after update failed: %v", err)
	}
	if retrieved.Name != "Updated" || retrieved.NPCKind != "spren" || retrieved.Status != "consolidado" {
		t.Errorf("Update did not persist, got %+v", retrieved)
	}
}

func TestNPCDelete(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewNPCRepository(db)
	created := &models.NPC{CampaignID: campaignID, Name: "To Delete", NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if err := repo.Delete(ctx, created.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	_, err := repo.GetByID(ctx, created.ID)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound after delete, got %v", err)
	}
}
