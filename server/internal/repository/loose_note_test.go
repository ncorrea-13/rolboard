package repository

import (
	"context"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestLooseNoteLifecycle(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	repo := NewLooseNoteRepository(db)

	idea := &models.LooseNote{CampaignID: campaignID, Title: "Idea", Body: "Algo", Pending: true}
	if err := repo.Create(ctx, idea); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	filed := &models.LooseNote{CampaignID: campaignID, Title: "Archivada", Pending: false}
	if err := repo.Create(ctx, filed); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	notes, err := repo.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(notes) != 2 || notes[0].ID != idea.ID {
		t.Fatalf("Expected pending note first, got %+v", notes)
	}

	updated := &models.LooseNote{Title: "Idea", Body: "Ubicada", Pending: false}
	if err := repo.Update(ctx, idea.ID, updated); err != nil {
		t.Fatalf("Update failed: %v", err)
	}
	got, err := repo.GetByID(ctx, idea.ID)
	if err != nil || got.Pending || got.Body != "Ubicada" {
		t.Fatalf("Unexpected note after update: %+v (%v)", got, err)
	}

	if err := repo.Delete(ctx, idea.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	if _, err := repo.GetByID(ctx, idea.ID); err != ErrNotFound {
		t.Fatalf("Expected ErrNotFound after delete, got %v", err)
	}
}

func TestTrashListsLooseNoteAndOneshotLabel(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))

	notes := NewLooseNoteRepository(db)
	n := &models.LooseNote{CampaignID: campaignID, Title: "Borrar", Pending: true}
	if err := notes.Create(ctx, n); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if err := notes.Delete(ctx, n.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	sessions := NewSessionRepository(db)
	s := &models.Session{CampaignID: campaignID, SessionNumber: 2, SessionType: "oneshot", Date: "2026-01-01"}
	if err := sessions.Create(ctx, s); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if err := sessions.Delete(ctx, s.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	items, err := NewTrashRepository(db).List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	labels := map[string]string{}
	for _, it := range items {
		labels[it.Kind] = it.Label
	}
	if labels["loose_note"] != "Borrar" || labels["session"] != "O02" {
		t.Fatalf("Unexpected trash labels: %+v", labels)
	}

	if err := NewTrashRepository(db).Restore(ctx, campaignID, "loose_note", n.ID); err != nil {
		t.Fatalf("Restore failed: %v", err)
	}
}
