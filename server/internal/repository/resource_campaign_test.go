package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestCampaignIDByEntity(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	arcRepo := NewArcRepository(db)
	arc := &models.Arc{Title: "Arc 1", Order: 1, Status: "planificado", CampaignID: campaignID}
	if err := arcRepo.Create(ctx, arc); err != nil {
		t.Fatalf("Create arc failed: %v", err)
	}

	got, err := CampaignIDByEntity(ctx, db, "arcs", arc.ID)
	if err != nil {
		t.Fatalf("CampaignIDByEntity failed: %v", err)
	}
	if got != campaignID {
		t.Errorf("Expected campaign_id %d, got %d", campaignID, got)
	}
}

func TestCampaignIDByEntityNotFound(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	if _, err := CampaignIDByEntity(ctx, db, "arcs", 9999); err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestCampaignIDByEntityExcludesDeleted(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	arcRepo := NewArcRepository(db)
	arc := &models.Arc{Title: "Arc 1", Order: 1, Status: "planificado", CampaignID: campaignID}
	if err := arcRepo.Create(ctx, arc); err != nil {
		t.Fatalf("Create arc failed: %v", err)
	}
	if err := arcRepo.Delete(ctx, arc.ID); err != nil {
		t.Fatalf("Delete arc failed: %v", err)
	}

	if _, err := CampaignIDByEntity(ctx, db, "arcs", arc.ID); err != ErrNotFound {
		t.Errorf("Expected ErrNotFound for soft-deleted arc, got %v", err)
	}
}
