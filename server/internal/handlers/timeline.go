package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

type TimelinePayload struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	StartLabel  string `json:"start_label"`
	EndLabel    string `json:"end_label"`
}

type TimelineEventPayload struct {
	TimelineID   int64   `json:"timeline_id"`
	Title        string  `json:"title"`
	Description  string  `json:"description"`
	DateLabel    string  `json:"date_label"`
	EndDateLabel string  `json:"end_date_label"`
	SortKey      float64 `json:"sort_key"`
	ArcID        *int64  `json:"arc_id"`
	SessionID    *int64  `json:"session_id"`
	LocationID   *int64  `json:"location_id"`
	GroupID      *int64  `json:"group_id"`
	LoreEntryID  *int64  `json:"lore_entry_id"`
}

func (h *Handlers) ListTimelines(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	timelines, err := h.timeline.ListTimelines(r.Context(), campaignID)
	if err != nil {
		internalError(w, err, "Error retrieving timelines")
		return
	}
	writeJSON(w, http.StatusOK, timelines)
}

func (h *Handlers) CreateTimeline(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	var payload TimelinePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	t := models.Timeline{
		CampaignID: campaignID, Name: payload.Name, Description: payload.Description,
		Color: payload.Color, StartLabel: payload.StartLabel, EndLabel: payload.EndLabel,
	}
	err = h.timeline.CreateTimeline(r.Context(), &t)
	if errors.Is(err, service.ErrInvalidTimeline) {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err != nil {
		internalError(w, err, "Error creating timeline")
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (h *Handlers) UpdateTimeline(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	var payload TimelinePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	t := models.Timeline{
		Name: payload.Name, Description: payload.Description,
		Color: payload.Color, StartLabel: payload.StartLabel, EndLabel: payload.EndLabel,
	}
	err = h.timeline.UpdateTimeline(r.Context(), id, &t)
	if errors.Is(err, service.ErrInvalidTimeline) {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Timeline not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error updating timeline")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (h *Handlers) DeleteTimeline(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.timeline.DeleteTimeline(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Timeline not found", http.StatusNotFound)
		return
	}
	if errors.Is(err, repository.ErrInUse) {
		apiError(w, http.StatusConflict, "timeline_in_use")
		return
	}
	if err != nil {
		internalError(w, err, "Error deleting timeline")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListTimelineEvents(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	events, err := h.timeline.ListEvents(r.Context(), campaignID)
	if err != nil {
		internalError(w, err, "Error retrieving timeline events")
		return
	}
	writeJSON(w, http.StatusOK, events)
}

func (h *Handlers) validateTimelineEvent(ctx context.Context, campaignID int64, p TimelineEventPayload) (string, bool) {
	if strings.TrimSpace(p.Title) == "" {
		return "Title is a required field", false
	}
	if t, err := h.timeline.GetTimeline(ctx, p.TimelineID); err != nil || t.CampaignID != campaignID {
		return "Timeline not found in this campaign", false
	}
	if p.ArcID != nil {
		if a, err := h.arcs.GetByID(ctx, *p.ArcID); err != nil || a.CampaignID != campaignID {
			return "Arc not found in this campaign", false
		}
	}
	if p.SessionID != nil {
		if s, err := h.sessions.GetByID(ctx, *p.SessionID); err != nil || s.CampaignID != campaignID {
			return "Session not found in this campaign", false
		}
	}
	if p.LocationID != nil {
		if l, err := h.locations.GetByID(ctx, *p.LocationID); err != nil || l.CampaignID != campaignID {
			return "Location not found in this campaign", false
		}
	}
	if p.GroupID != nil {
		if g, err := h.groups.GetByID(ctx, *p.GroupID); err != nil || g.CampaignID != campaignID {
			return "Group not found in this campaign", false
		}
	}
	if p.LoreEntryID != nil {
		if e, err := h.lore.GetEntry(ctx, *p.LoreEntryID); err != nil || e.CampaignID != campaignID {
			return "Lore entry not found in this campaign", false
		}
	}
	return "", true
}

func eventFromPayload(p TimelineEventPayload) models.TimelineEvent {
	return models.TimelineEvent{
		TimelineID: p.TimelineID, Title: strings.TrimSpace(p.Title), Description: p.Description,
		DateLabel: strings.TrimSpace(p.DateLabel), EndDateLabel: strings.TrimSpace(p.EndDateLabel), SortKey: p.SortKey,
		ArcID: p.ArcID, SessionID: p.SessionID, LocationID: p.LocationID, GroupID: p.GroupID, LoreEntryID: p.LoreEntryID,
	}
}

func (h *Handlers) CreateTimelineEvent(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	var payload TimelineEventPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if msg, ok := h.validateTimelineEvent(r.Context(), campaignID, payload); !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	event := eventFromPayload(payload)
	event.CampaignID = campaignID
	if err := h.timeline.CreateEvent(r.Context(), &event); err != nil {
		internalError(w, err, "Error creating timeline event")
		return
	}
	writeJSON(w, http.StatusCreated, event)
}

func (h *Handlers) GetTimelineEvent(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	event, err := h.timeline.GetEvent(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Timeline event not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving timeline event")
		return
	}
	writeJSON(w, http.StatusOK, event)
}

func (h *Handlers) UpdateTimelineEvent(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	var payload TimelineEventPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	current, err := h.timeline.GetEvent(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Timeline event not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving timeline event")
		return
	}
	if msg, ok := h.validateTimelineEvent(r.Context(), current.CampaignID, payload); !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	event := eventFromPayload(payload)
	err = h.timeline.UpdateEvent(r.Context(), id, &event)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Timeline event not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error updating timeline event")
		return
	}
	writeJSON(w, http.StatusOK, event)
}

func (h *Handlers) DeleteTimelineEvent(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	err = h.timeline.DeleteEvent(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Timeline event not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error deleting timeline event")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
