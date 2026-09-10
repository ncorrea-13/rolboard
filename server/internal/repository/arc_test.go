package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func createTestCampaign(t *testing.T, ctx context.Context, repo *CampaignRepository) int64 {
	campaign := &models.Campaign{Name: "Test Campaign", System: "D&D 5e"}
	if err := repo.Create(ctx, campaign); err != nil {
		t.Fatalf("Create campaign failed: %v", err)
	}
	return campaign.ID
}

func TestArcCreate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewArcRepository(db)
	arc := &models.Arc{
		Title:      "Arc 1",
		Order:      1,
		Status:     "planificado",
		Summary:    "First arc",
		CampaignID: campaignID,
	}

	if err := repo.Create(ctx, arc); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if arc.ID == 0 {
		t.Error("Expected arc ID to be set")
	}
	if arc.CreatedAt == "" {
		t.Error("Expected CreatedAt to be set")
	}
}

func TestArcListByCampaign(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignRepo := NewCampaignRepository(db)
	campaignID := createTestCampaign(t, ctx, campaignRepo)
	otherCampaignID := createTestCampaign(t, ctx, campaignRepo)

	repo := NewArcRepository(db)
	for i := 1; i <= 3; i++ {
		arc := &models.Arc{Title: "Arc", Order: int64(i), Status: "planificado", CampaignID: campaignID}
		if err := repo.Create(ctx, arc); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}
	if err := repo.Create(ctx, &models.Arc{Title: "Other", Order: 1, Status: "planificado", CampaignID: otherCampaignID}); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	arcs, err := repo.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if len(arcs) != 3 {
		t.Errorf("Expected 3 arcs, got %d", len(arcs))
	}
	for _, a := range arcs {
		if a.CampaignID != campaignID {
			t.Errorf("Expected campaign_id %d, got %d", campaignID, a.CampaignID)
		}
	}
}

func TestArcListExcludesDeleted(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewArcRepository(db)
	a1 := &models.Arc{Title: "Arc 1", Order: 1, Status: "planificado", CampaignID: campaignID}
	a2 := &models.Arc{Title: "Arc 2", Order: 2, Status: "planificado", CampaignID: campaignID}
	if err := repo.Create(ctx, a1); err != nil {
		t.Fatalf("Create a1 failed: %v", err)
	}
	if err := repo.Create(ctx, a2); err != nil {
		t.Fatalf("Create a2 failed: %v", err)
	}

	if err := repo.Delete(ctx, a1.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	arcs, err := repo.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if len(arcs) != 1 {
		t.Errorf("Expected 1 arc after delete, got %d", len(arcs))
	}
	if arcs[0].ID != a2.ID {
		t.Errorf("Expected remaining arc to be ID %d, got %d", a2.ID, arcs[0].ID)
	}
}

func TestArcGetByID(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewArcRepository(db)
	created := &models.Arc{Title: "Test Arc", Order: 1, Status: "planificado", Summary: "Desc", CampaignID: campaignID}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	retrieved, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}

	if retrieved.ID != created.ID {
		t.Errorf("Expected ID %d, got %d", created.ID, retrieved.ID)
	}
	if retrieved.Title != created.Title {
		t.Errorf("Expected title '%s', got '%s'", created.Title, retrieved.Title)
	}
	if retrieved.CampaignID != campaignID {
		t.Errorf("Expected campaign_id %d, got %d", campaignID, retrieved.CampaignID)
	}
}

func TestArcGetByIDNotFound(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	repo := NewArcRepository(db)

	_, err := repo.GetByID(ctx, 9999)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestArcUpdate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewArcRepository(db)
	created := &models.Arc{Title: "Original", Order: 1, Status: "planificado", Summary: "Original summary", CampaignID: campaignID}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	updated := &models.Arc{Title: "Updated", Order: 2, Status: "en_curso", Summary: "Updated summary"}
	if err := repo.Update(ctx, created.ID, updated); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	retrieved, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID after update failed: %v", err)
	}

	if retrieved.Title != "Updated" {
		t.Errorf("Expected title 'Updated', got '%s'", retrieved.Title)
	}
	if retrieved.Order != 2 {
		t.Errorf("Expected order 2, got %d", retrieved.Order)
	}
	if retrieved.CampaignID != campaignID {
		t.Errorf("Expected campaign_id %d to be preserved, got %d", campaignID, retrieved.CampaignID)
	}
}

func TestArcUpdateNotFound(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	repo := NewArcRepository(db)

	arc := &models.Arc{Title: "Test", Order: 1}
	err := repo.Update(ctx, 9999, arc)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestArcDelete(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewArcRepository(db)
	created := &models.Arc{Title: "To Delete", Order: 1, Status: "planificado", CampaignID: campaignID}
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

	var count int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM arcs WHERE id = ?", created.ID).Scan(&count); err != nil {
		t.Fatalf("Failed to check soft delete: %v", err)
	}
	if count == 0 {
		t.Error("Expected arc to still exist in DB (soft delete)")
	}
}

func TestArcDeleteNotFound(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	repo := NewArcRepository(db)

	err := repo.Delete(ctx, 9999)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}
