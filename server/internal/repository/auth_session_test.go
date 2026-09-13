package repository

import (
	"context"
	"testing"
	"time"
)

func TestAuthSessionCreateAndGetValid(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	sessionRepo := NewAuthSessionRepository(db)

	created, err := sessionRepo.Create(ctx, campaignID, "some-hash", time.Hour)
	if err != nil {
		t.Fatalf("Create session failed: %v", err)
	}
	if created.ID == 0 {
		t.Error("Expected session ID to be set")
	}

	got, err := sessionRepo.GetValidByTokenHash(ctx, "some-hash")
	if err != nil {
		t.Fatalf("GetValidByTokenHash failed: %v", err)
	}
	if got.CampaignID != campaignID {
		t.Errorf("Expected campaign_id %d, got %d", campaignID, got.CampaignID)
	}
}

func TestAuthSessionGetValidExcludesExpired(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	sessionRepo := NewAuthSessionRepository(db)

	if _, err := sessionRepo.Create(ctx, campaignID, "expired-hash", -1*time.Hour); err != nil {
		t.Fatalf("Create expired session failed: %v", err)
	}

	if _, err := sessionRepo.GetValidByTokenHash(ctx, "expired-hash"); err != ErrSessionNotFound {
		t.Errorf("Expected ErrSessionNotFound for expired session, got %v", err)
	}
}

func TestAuthSessionGetValidUnknownHash(t *testing.T) {
	db := setupTestDB(t)
	sessionRepo := NewAuthSessionRepository(db)
	ctx := context.Background()

	if _, err := sessionRepo.GetValidByTokenHash(ctx, "nope"); err != ErrSessionNotFound {
		t.Errorf("Expected ErrSessionNotFound, got %v", err)
	}
}

func TestAuthSessionDelete(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	sessionRepo := NewAuthSessionRepository(db)

	if _, err := sessionRepo.Create(ctx, campaignID, "to-delete", time.Hour); err != nil {
		t.Fatalf("Create session failed: %v", err)
	}

	if err := sessionRepo.Delete(ctx, "to-delete"); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	if _, err := sessionRepo.GetValidByTokenHash(ctx, "to-delete"); err != ErrSessionNotFound {
		t.Errorf("Expected ErrSessionNotFound after delete, got %v", err)
	}
}
