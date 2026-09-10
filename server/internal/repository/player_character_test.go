package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestPlayerCharacterCreate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewPlayerCharacterRepository(db)
	pc := &models.PlayerCharacter{
		CampaignID:    campaignID,
		PlayerName:    "Nico",
		CharacterName: "Shallan",
		Status:        "activo",
	}

	if err := repo.Create(ctx, pc); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if pc.ID == 0 {
		t.Error("Expected pc ID to be set")
	}
}

func TestPlayerCharacterListByCampaign(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewPlayerCharacterRepository(db)
	for i := 0; i < 2; i++ {
		pc := &models.PlayerCharacter{CampaignID: campaignID, PlayerName: "Player", CharacterName: "Character", Status: "activo"}
		if err := repo.Create(ctx, pc); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	pcs, err := repo.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(pcs) != 2 {
		t.Errorf("Expected 2 player characters, got %d", len(pcs))
	}
}

func TestPlayerCharacterGetByIDNotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewPlayerCharacterRepository(db)

	_, err := repo.GetByID(context.Background(), 9999)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestPlayerCharacterUpdate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewPlayerCharacterRepository(db)
	created := &models.PlayerCharacter{CampaignID: campaignID, PlayerName: "Nico", CharacterName: "Shallan", Status: "activo"}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	updated := &models.PlayerCharacter{PlayerName: "Nico", CharacterName: "Veil", Status: "activo", Backstory: "New backstory"}
	if err := repo.Update(ctx, created.ID, updated); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	retrieved, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID after update failed: %v", err)
	}
	if retrieved.CharacterName != "Veil" {
		t.Errorf("Expected character_name 'Veil', got '%s'", retrieved.CharacterName)
	}
}

func TestPlayerCharacterDelete(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewPlayerCharacterRepository(db)
	created := &models.PlayerCharacter{CampaignID: campaignID, PlayerName: "Nico", CharacterName: "To Delete", Status: "activo"}
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
