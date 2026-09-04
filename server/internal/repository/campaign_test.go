package repository

import (
	"context"
	"database/sql"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	_ "modernc.org/sqlite"
)

func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("Failed to open test DB: %v", err)
	}

	if err := Migrate(db); err != nil {
		t.Fatalf("Failed to migrate test DB: %v", err)
	}

	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Logf("error closing test DB: %v", err)
		}
	})

	return db
}

func TestCampaignCreate(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCampaignRepository(db)
	ctx := context.Background()

	campaign := &models.Campaign{
		Name:        "Test Campaign",
		System:      "D&D 5e",
		Description: "A test campaign",
	}

	err := repo.Create(ctx, campaign)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if campaign.ID == 0 {
		t.Error("Expected campaign ID to be set")
	}
	if campaign.Status != "active" {
		t.Errorf("Expected status 'active', got '%s'", campaign.Status)
	}
	if campaign.CreatedAt == "" {
		t.Error("Expected CreatedAt to be set")
	}
}

func TestCampaignList(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCampaignRepository(db)
	ctx := context.Background()

	for i := 1; i <= 3; i++ {
		campaign := &models.Campaign{
			Name:        "Campaign " + string(rune(48+i)),
			System:      "System " + string(rune(48+i)),
			Description: "Desc " + string(rune(48+i)),
		}
		if err := repo.Create(ctx, campaign); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	campaigns, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if len(campaigns) != 3 {
		t.Errorf("Expected 3 campaigns, got %d", len(campaigns))
	}
}

func TestCampaignListExcludesDeleted(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCampaignRepository(db)
	ctx := context.Background()

	c1 := &models.Campaign{Name: "Campaign 1", System: "System 1"}
	c2 := &models.Campaign{Name: "Campaign 2", System: "System 2"}
	if err := repo.Create(ctx, c1); err != nil {
		t.Fatalf("Create c1 failed: %v", err)
	}
	if err := repo.Create(ctx, c2); err != nil {
		t.Fatalf("Create c2 failed: %v", err)
	}

	if err := repo.Delete(ctx, c1.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	campaigns, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if len(campaigns) != 1 {
		t.Errorf("Expected 1 campaign after delete, got %d", len(campaigns))
	}
	if campaigns[0].ID != c2.ID {
		t.Errorf("Expected remaining campaign to be ID %d, got %d", c2.ID, campaigns[0].ID)
	}
}

func TestCampaignGetByID(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCampaignRepository(db)
	ctx := context.Background()

	created := &models.Campaign{
		Name:        "Test Campaign",
		System:      "D&D 5e",
		Description: "A test campaign",
	}
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
	if retrieved.Name != created.Name {
		t.Errorf("Expected name '%s', got '%s'", created.Name, retrieved.Name)
	}
}

func TestCampaignGetByIDNotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCampaignRepository(db)
	ctx := context.Background()

	_, err := repo.GetByID(ctx, 9999)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestCampaignUpdate(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCampaignRepository(db)
	ctx := context.Background()

	created := &models.Campaign{
		Name:        "Original Name",
		System:      "D&D 5e",
		Description: "Original description",
	}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	updated := &models.Campaign{
		Name:        "Updated Name",
		System:      "Pathfinder",
		Description: "Updated description",
		Status:      "paused",
	}
	err := repo.Update(ctx, created.ID, updated)
	if err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	retrieved, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID after update failed: %v", err)
	}

	if retrieved.Name != "Updated Name" {
		t.Errorf("Expected name 'Updated Name', got '%s'", retrieved.Name)
	}
	if retrieved.System != "Pathfinder" {
		t.Errorf("Expected system 'Pathfinder', got '%s'", retrieved.System)
	}
	if retrieved.Status != "paused" {
		t.Errorf("Expected status 'paused', got '%s'", retrieved.Status)
	}
}

func TestCampaignUpdateNotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCampaignRepository(db)
	ctx := context.Background()

	campaign := &models.Campaign{
		Name:   "Test",
		System: "Test",
	}
	err := repo.Update(ctx, 9999, campaign)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestCampaignDelete(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCampaignRepository(db)
	ctx := context.Background()

	created := &models.Campaign{
		Name:   "To Delete",
		System: "D&D 5e",
	}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	err := repo.Delete(ctx, created.ID)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	_, err = repo.GetByID(ctx, created.ID)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound after delete, got %v", err)
	}

	var count int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM campaigns WHERE id = ?", created.ID).Scan(&count); err != nil {
		t.Fatalf("Failed to check soft delete: %v", err)
	}
	if count == 0 {
		t.Error("Expected campaign to still exist in DB (soft delete)")
	}
}

func TestCampaignDeleteNotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCampaignRepository(db)
	ctx := context.Background()

	err := repo.Delete(ctx, 9999)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestCampaignTimestamps(t *testing.T) {
	db := setupTestDB(t)
	repo := NewCampaignRepository(db)
	ctx := context.Background()

	campaign := &models.Campaign{
		Name:   "Test",
		System: "D&D 5e",
	}
	if err := repo.Create(ctx, campaign); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if campaign.CreatedAt == "" {
		t.Error("Expected CreatedAt to be set")
	}
	if campaign.UpdatedAt == "" {
		t.Error("Expected UpdatedAt to be set")
	}
}
