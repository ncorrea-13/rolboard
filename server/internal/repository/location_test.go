package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestLocationCreate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewLocationRepository(db)
	loc := &models.Location{
		CampaignID:   campaignID,
		Name:         "Kharbranth",
		LocationType: "city",
	}

	if err := repo.Create(ctx, loc); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if loc.ID == 0 {
		t.Error("Expected location ID to be set")
	}
	if loc.ParentLocationID != nil {
		t.Error("Expected ParentLocationID to be nil")
	}
}

func TestLocationCreateWithParent(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewLocationRepository(db)
	parent := &models.Location{CampaignID: campaignID, Name: "Roshar", LocationType: "planet"}
	if err := repo.Create(ctx, parent); err != nil {
		t.Fatalf("Create parent failed: %v", err)
	}

	child := &models.Location{CampaignID: campaignID, Name: "Kharbranth", LocationType: "city", ParentLocationID: &parent.ID}
	if err := repo.Create(ctx, child); err != nil {
		t.Fatalf("Create child failed: %v", err)
	}

	if child.ParentLocationID == nil || *child.ParentLocationID != parent.ID {
		t.Errorf("Expected ParentLocationID %d, got %v", parent.ID, child.ParentLocationID)
	}
}

func TestLocationListByCampaign(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignRepo := NewCampaignRepository(db)
	campaignID := createTestCampaign(t, ctx, campaignRepo)
	otherCampaignID := createTestCampaign(t, ctx, campaignRepo)

	repo := NewLocationRepository(db)
	for i := 0; i < 2; i++ {
		if err := repo.Create(ctx, &models.Location{CampaignID: campaignID, Name: "Loc", LocationType: "city"}); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}
	if err := repo.Create(ctx, &models.Location{CampaignID: otherCampaignID, Name: "Other", LocationType: "city"}); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	locations, err := repo.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(locations) != 2 {
		t.Errorf("Expected 2 locations, got %d", len(locations))
	}
}

func TestLocationGetByIDNotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewLocationRepository(db)

	_, err := repo.GetByID(context.Background(), 9999)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestLocationUpdate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewLocationRepository(db)
	created := &models.Location{CampaignID: campaignID, Name: "Original", LocationType: "city"}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	updated := &models.Location{Name: "Updated", LocationType: "region", Description: "New desc"}
	if err := repo.Update(ctx, created.ID, updated); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	retrieved, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID after update failed: %v", err)
	}
	if retrieved.Name != "Updated" || retrieved.LocationType != "region" {
		t.Errorf("Update did not persist, got %+v", retrieved)
	}
	if retrieved.CampaignID != campaignID {
		t.Errorf("Expected campaign_id %d preserved, got %d", campaignID, retrieved.CampaignID)
	}
}

func TestLocationDelete(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewLocationRepository(db)
	created := &models.Location{CampaignID: campaignID, Name: "To Delete", LocationType: "site"}
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
