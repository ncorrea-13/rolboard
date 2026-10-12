package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestTimelineEventsOrderedBySortKeyAndTimelineInUse(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	timelines := NewTimelineRepository(db)
	events := NewTimelineEventRepository(db)

	world := &models.Timeline{CampaignID: campaignID, Name: "Historia del mundo", Color: "#aa3344", StartLabel: "Año 0"}
	if err := timelines.Create(ctx, world); err != nil {
		t.Fatalf("Create timeline failed: %v", err)
	}
	other := &models.Timeline{CampaignID: campaignID, Name: "Guerra", Color: "#33aa44"}
	if err := timelines.Create(ctx, other); err != nil {
		t.Fatalf("Create timeline failed: %v", err)
	}
	if other.Position != world.Position+1 {
		t.Fatalf("Expected consecutive positions, got %d and %d", world.Position, other.Position)
	}

	late := &models.TimelineEvent{CampaignID: campaignID, TimelineID: world.ID, Title: "Tarde", DateLabel: "Año 300", SortKey: 300}
	early := &models.TimelineEvent{CampaignID: campaignID, TimelineID: other.ID, Title: "Temprano", DateLabel: "Año -3000", SortKey: -3000}
	for _, e := range []*models.TimelineEvent{late, early} {
		if err := events.Create(ctx, e); err != nil {
			t.Fatalf("Create event failed: %v", err)
		}
	}

	list, err := events.List(ctx, campaignID)
	if err != nil || len(list) != 2 || list[0].ID != early.ID {
		t.Fatalf("Expected events ordered by sort_key, got %+v (%v)", list, err)
	}

	if err := timelines.Delete(ctx, world.ID); !errors.Is(err, ErrInUse) {
		t.Fatalf("Expected ErrInUse for a timeline with events, got %v", err)
	}
	if err := events.Delete(ctx, late.ID); err != nil {
		t.Fatalf("Delete event failed: %v", err)
	}
	if err := timelines.Delete(ctx, world.ID); err != nil {
		t.Fatalf("Delete timeline failed: %v", err)
	}

	trash := NewTrashRepository(db)
	if err := trash.Restore(ctx, campaignID, "timeline_event", late.ID); !errors.Is(err, ErrParentDeleted) {
		t.Fatalf("Expected ErrParentDeleted restoring an event of a deleted timeline, got %v", err)
	}
	if err := trash.Restore(ctx, campaignID, "timeline", world.ID); err != nil {
		t.Fatalf("Restore timeline failed: %v", err)
	}
	if err := trash.Restore(ctx, campaignID, "timeline_event", late.ID); err != nil {
		t.Fatalf("Restore event failed: %v", err)
	}
}
