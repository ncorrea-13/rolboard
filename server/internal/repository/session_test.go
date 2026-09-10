package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestSessionCreate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewSessionRepository(db)
	session := &models.Session{
		CampaignID:    campaignID,
		SessionNumber: 1,
		SessionType:   "session",
		Date:          "2026-01-01",
	}

	if err := repo.Create(ctx, session); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if session.ID == 0 {
		t.Error("Expected session ID to be set")
	}
	if session.ArcID != nil {
		t.Error("Expected ArcID to be nil")
	}
}

func TestSessionCreateWithArc(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	arcRepo := NewArcRepository(db)
	arc := &models.Arc{CampaignID: campaignID, Title: "Arc 1", Order: 1, Status: "planificado"}
	if err := arcRepo.Create(ctx, arc); err != nil {
		t.Fatalf("Create arc failed: %v", err)
	}

	repo := NewSessionRepository(db)
	session := &models.Session{CampaignID: campaignID, ArcID: &arc.ID, SessionNumber: 1, SessionType: "session", Date: "2026-01-01"}
	if err := repo.Create(ctx, session); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if session.ArcID == nil || *session.ArcID != arc.ID {
		t.Errorf("Expected ArcID %d, got %v", arc.ID, session.ArcID)
	}
}

func TestSessionListByCampaignOrdered(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewSessionRepository(db)
	if err := repo.Create(ctx, &models.Session{CampaignID: campaignID, SessionNumber: 2, SessionType: "session", Date: "2026-01-08"}); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if err := repo.Create(ctx, &models.Session{CampaignID: campaignID, SessionNumber: 1, SessionType: "session", Date: "2026-01-01"}); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	sessions, err := repo.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(sessions) != 2 {
		t.Fatalf("Expected 2 sessions, got %d", len(sessions))
	}
	if sessions[0].SessionNumber != 1 || sessions[1].SessionNumber != 2 {
		t.Errorf("Expected sessions ordered by session_number, got %d, %d", sessions[0].SessionNumber, sessions[1].SessionNumber)
	}
}

func TestSessionGetByIDNotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewSessionRepository(db)

	_, err := repo.GetByID(context.Background(), 9999)
	if err != ErrNotFound {
		t.Errorf("Expected ErrNotFound, got %v", err)
	}
}

func TestSessionUpdate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewSessionRepository(db)
	created := &models.Session{CampaignID: campaignID, SessionNumber: 1, SessionType: "session", Date: "2026-01-01"}
	if err := repo.Create(ctx, created); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	updated := &models.Session{SessionNumber: 1, SessionType: "interlude", Date: "2026-01-02", Summary: "Updated"}
	if err := repo.Update(ctx, created.ID, updated); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	retrieved, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID after update failed: %v", err)
	}
	if retrieved.SessionType != "interlude" || retrieved.Date != "2026-01-02" {
		t.Errorf("Update did not persist, got %+v", retrieved)
	}
}

func TestSessionDelete(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	repo := NewSessionRepository(db)
	created := &models.Session{CampaignID: campaignID, SessionNumber: 1, SessionType: "session", Date: "2026-01-01"}
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
