package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestQuestCreate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewQuestRepository(db)
	quest := &models.Quest{
		CampaignID: campaignID,
		Title:      "Find the Words",
		Status:     "active",
	}

	if err := repo.Create(ctx, quest); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if quest.ID == 0 {
		t.Error("Expected quest ID to be set")
	}
	if quest.Priority != nil {
		t.Error("Expected Priority to be nil")
	}
}

func TestQuestCreateWithPriority(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewQuestRepository(db)
	priority := int64(1)
	quest := &models.Quest{CampaignID: campaignID, Title: "Urgent quest", Status: "active", Priority: &priority}

	if err := repo.Create(ctx, quest); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if quest.Priority == nil || *quest.Priority != 1 {
		t.Errorf("Expected Priority 1, got %v", quest.Priority)
	}
}

func TestQuestListByCampaign(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewQuestRepository(db)
	for i := 0; i < 2; i++ {
		if err := repo.Create(ctx, &models.Quest{CampaignID: campaignID, Title: "Quest", Status: "active"}); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	quests, err := repo.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(quests) != 2 {
		t.Errorf("Expected 2 quests, got %d", len(quests))
	}
}

func TestQuestGetByIDNotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewQuestRepository(db)

	_, err := repo.GetByID(context.Background(), 9999)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestQuestUpdate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewQuestRepository(db)
	created := &models.Quest{CampaignID: campaignID, Title: "Original", Status: "active"}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	updated := &models.Quest{Title: "Updated", Status: "completed"}
	if err := repo.Update(ctx, created.ID, updated); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	retrieved, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID after update failed: %v", err)
	}
	if retrieved.Title != "Updated" || retrieved.Status != "completed" {
		t.Errorf("Update did not persist, got %+v", retrieved)
	}
}

func TestQuestDelete(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewQuestRepository(db)
	created := &models.Quest{CampaignID: campaignID, Title: "To Delete", Status: "active"}
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
