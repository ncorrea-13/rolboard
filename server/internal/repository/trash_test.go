package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestTrashListAndRestore(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	arcRepo := NewArcRepository(db)
	sessionRepo := NewSessionRepository(db)
	trash := NewTrashRepository(db)

	arc := &models.Arc{CampaignID: campaignID, Title: "Arc", Order: 1, Status: "planificado"}
	if err := arcRepo.Create(ctx, arc); err != nil {
		t.Fatalf("Create arc failed: %v", err)
	}
	session := &models.Session{CampaignID: campaignID, ArcID: &arc.ID, SessionNumber: 3, SessionType: "session", Date: "2026-01-01"}
	if err := sessionRepo.Create(ctx, session); err != nil {
		t.Fatalf("Create session failed: %v", err)
	}
	if err := sessionRepo.Delete(ctx, session.ID); err != nil {
		t.Fatalf("Delete session failed: %v", err)
	}

	items, err := trash.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(items) != 1 || items[0].Kind != "session" || items[0].Label != "S03" {
		t.Fatalf("Unexpected trash: %+v", items)
	}

	if err := trash.Restore(ctx, campaignID+1, "session", session.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("Expected ErrNotFound from another campaign, got %v", err)
	}

	taken := &models.Session{CampaignID: campaignID, SessionNumber: 3, SessionType: "session", Date: "2026-02-01"}
	if err := sessionRepo.Create(ctx, taken); err != nil {
		t.Fatalf("Create taken failed: %v", err)
	}
	if err := trash.Restore(ctx, campaignID, "session", session.ID); !errors.Is(err, ErrConflict) {
		t.Fatalf("Expected ErrConflict when number is taken, got %v", err)
	}
	if err := sessionRepo.Delete(ctx, taken.ID); err != nil {
		t.Fatalf("Delete taken failed: %v", err)
	}

	if err := sessionRepo.Delete(ctx, session.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("Expected already-deleted session to be ErrNotFound, got %v", err)
	}
	if err := trash.Restore(ctx, campaignID, "arc", arc.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("Expected active arc to be ErrNotFound, got %v", err)
	}
	if err := arcRepo.Delete(ctx, arc.ID); err != nil {
		t.Fatalf("Delete arc failed: %v", err)
	}
	if err := trash.Restore(ctx, campaignID, "session", session.ID); !errors.Is(err, ErrParentDeleted) {
		t.Fatalf("Expected ErrParentDeleted, got %v", err)
	}
	if err := trash.Restore(ctx, campaignID, "arc", arc.ID); err != nil {
		t.Fatalf("Restore arc failed: %v", err)
	}
	if err := trash.Restore(ctx, campaignID, "session", session.ID); err != nil {
		t.Fatalf("Restore session failed: %v", err)
	}
	if _, err := sessionRepo.GetByID(ctx, session.ID); err != nil {
		t.Fatalf("Restored session should be readable: %v", err)
	}
}
