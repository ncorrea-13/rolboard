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

type LoreCategoryPayload struct {
	Label string `json:"label"`
	Color string `json:"color"`
}

type LoreEntryPayload struct {
	CategoryID *int64 `json:"category_id"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	ArcID      *int64 `json:"arc_id"`
	LocationID *int64 `json:"location_id"`
}

func (h *Handlers) resolveLoreCategory(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		return 0, err
	}
	return repository.CampaignIDByLoreCategory(r.Context(), h.db, id)
}

func (h *Handlers) ListLoreCategories(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	categories, err := h.lore.ListCategories(r.Context(), campaignID)
	if err != nil {
		internalError(w, err, "Error retrieving lore categories")
		return
	}
	writeJSON(w, http.StatusOK, categories)
}

func (h *Handlers) CreateLoreCategory(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	var payload LoreCategoryPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	c, err := h.lore.CreateCategory(r.Context(), campaignID, payload.Label, payload.Color)
	if errors.Is(err, service.ErrInvalidLoreCategory) {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err != nil {
		internalError(w, err, "Error creating lore category")
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (h *Handlers) UpdateLoreCategory(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	var payload LoreCategoryPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	c, err := h.lore.UpdateCategory(r.Context(), id, payload.Label, payload.Color)
	if errors.Is(err, service.ErrInvalidLoreCategory) {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Lore category not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error updating lore category")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *Handlers) DeleteLoreCategory(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.lore.DeleteCategory(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Lore category not found", http.StatusNotFound)
		return
	}
	if errors.Is(err, repository.ErrLoreCategoryInUse) {
		http.Error(w, "Lore category is in use", http.StatusConflict)
		return
	}
	if err != nil {
		internalError(w, err, "Error deleting lore category")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListLoreEntries(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	entries, err := h.lore.ListEntries(r.Context(), campaignID)
	if err != nil {
		internalError(w, err, "Error retrieving lore entries")
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

func (h *Handlers) validateLoreEntry(ctx context.Context, campaignID int64, p LoreEntryPayload) (string, bool) {
	if strings.TrimSpace(p.Title) == "" {
		return "Title is a required field", false
	}
	if p.CategoryID != nil {
		c, err := h.lore.GetCategory(ctx, *p.CategoryID)
		if err != nil || c.CampaignID != campaignID {
			return "Lore category not found in this campaign", false
		}
	}
	if p.ArcID != nil {
		a, err := h.arcs.GetByID(ctx, *p.ArcID)
		if err != nil || a.CampaignID != campaignID {
			return "Arc not found in this campaign", false
		}
	}
	if p.LocationID != nil {
		l, err := h.locations.GetByID(ctx, *p.LocationID)
		if err != nil || l.CampaignID != campaignID {
			return "Location not found in this campaign", false
		}
	}
	return "", true
}

func (h *Handlers) CreateLoreEntry(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	var payload LoreEntryPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if msg, ok := h.validateLoreEntry(r.Context(), campaignID, payload); !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	entry := models.LoreEntry{
		CampaignID: campaignID,
		CategoryID: payload.CategoryID,
		Title:      strings.TrimSpace(payload.Title),
		Body:       payload.Body,
		ArcID:      payload.ArcID,
		LocationID: payload.LocationID,
	}
	if err := h.lore.CreateEntry(r.Context(), &entry); err != nil {
		internalError(w, err, "Error creating lore entry")
		return
	}
	writeJSON(w, http.StatusCreated, entry)
}

func (h *Handlers) GetLoreEntry(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	entry, err := h.lore.GetEntry(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Lore entry not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving lore entry")
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

func (h *Handlers) UpdateLoreEntry(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	var payload LoreEntryPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	current, err := h.lore.GetEntry(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Lore entry not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving lore entry")
		return
	}
	if msg, ok := h.validateLoreEntry(r.Context(), current.CampaignID, payload); !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	entry := models.LoreEntry{
		CategoryID: payload.CategoryID,
		Title:      strings.TrimSpace(payload.Title),
		Body:       payload.Body,
		ArcID:      payload.ArcID,
		LocationID: payload.LocationID,
	}
	err = h.lore.UpdateEntry(r.Context(), id, &entry)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Lore entry not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error updating lore entry")
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

func (h *Handlers) DeleteLoreEntry(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.lore.DeleteEntry(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Lore entry not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error deleting lore entry")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
