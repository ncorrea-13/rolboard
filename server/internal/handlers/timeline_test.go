package handlers

import (
	"context"
	"net/http"
	"strconv"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func TestTimelineEventRejectsForeignTimeline(t *testing.T) {
	db := setupCampaignTestDB(t)
	ctx := context.Background()
	campaigns := repository.NewCampaignRepository(db)
	a := &models.Campaign{Name: "A", System: "x"}
	b := &models.Campaign{Name: "B", System: "x"}
	for _, c := range []*models.Campaign{a, b} {
		if err := campaigns.Create(ctx, c); err != nil {
			t.Fatalf("seed campaign: %v", err)
		}
	}
	h := &Handlers{
		db: db,
		timeline: service.NewTimelineService(
			repository.NewTimelineRepository(db), repository.NewTimelineEventRepository(db)),
	}

	foreign := &models.Timeline{CampaignID: b.ID, Name: "De B", Color: "#aa3344"}
	if err := h.timeline.CreateTimeline(ctx, foreign); err != nil {
		t.Fatalf("seed timeline: %v", err)
	}
	own := &models.Timeline{CampaignID: a.ID, Name: "De A", Color: "#33aa44"}
	if err := h.timeline.CreateTimeline(ctx, own); err != nil {
		t.Fatalf("seed timeline: %v", err)
	}

	aID := strconv.FormatInt(a.ID, 10)
	rec := call(t, h.CreateTimelineEvent, http.MethodPost, aID, TimelineEventPayload{Title: "X", TimelineID: foreign.ID})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("foreign timeline expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	rec = call(t, h.CreateTimelineEvent, http.MethodPost, aID, TimelineEventPayload{Title: "Propio", TimelineID: own.ID, SortKey: 12.5})
	if rec.Code != http.StatusCreated {
		t.Fatalf("own timeline expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	rec = call(t, h.CreateTimeline, http.MethodPost, aID, TimelinePayload{Name: "Mala", Color: "rojo"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid color expected 400, got %d", rec.Code)
	}
}
