package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestNewCampaignHasDefaultLoreCategories(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	categories, err := NewLoreCategoryRepository(db).List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(categories) != len(DefaultLoreCategories) {
		t.Fatalf("Expected %d default categories, got %d", len(DefaultLoreCategories), len(categories))
	}
}

func TestLoreEntryLifecycleAndCategoryInUse(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	categories := NewLoreCategoryRepository(db)
	entries := NewLoreEntryRepository(db)

	cat := &models.LoreCategory{CampaignID: campaignID, Key: "bestiario", Label: "Bestiario", Color: "#aa3344"}
	if err := categories.Create(ctx, cat); err != nil {
		t.Fatalf("Create category failed: %v", err)
	}

	e := &models.LoreEntry{CampaignID: campaignID, CategoryID: &cat.ID, Title: "Los Heraldos", Body: "..."}
	if err := entries.Create(ctx, e); err != nil {
		t.Fatalf("Create entry failed: %v", err)
	}
	loose := &models.LoreEntry{CampaignID: campaignID, Title: "Sin categoría"}
	if err := entries.Create(ctx, loose); err != nil {
		t.Fatalf("Entry without category should be allowed: %v", err)
	}
	if loose.CategoryID != nil {
		t.Fatal("Expected nil category")
	}

	if err := categories.Delete(ctx, cat.ID); !errors.Is(err, ErrLoreCategoryInUse) {
		t.Fatalf("Expected ErrLoreCategoryInUse, got %v", err)
	}

	if err := entries.Delete(ctx, e.ID); err != nil {
		t.Fatalf("Delete entry failed: %v", err)
	}
	if err := categories.Delete(ctx, cat.ID); !errors.Is(err, ErrLoreCategoryInUse) {
		t.Fatalf("A soft-deleted entry must still block the category, got %v", err)
	}

	list, err := entries.List(ctx, campaignID)
	if err != nil || len(list) != 1 || list[0].ID != loose.ID {
		t.Fatalf("Unexpected list: %+v (%v)", list, err)
	}
}
