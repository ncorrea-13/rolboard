package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type CreateArcPayload struct {
	Title        string  `json:"name"`
	Order        int64   `json:"order"`
	Status       string  `json:"status"`
	SubarcOrder  *int64  `json:"subarc_order"`
	Summary      string  `json:"summary"`
	ObsidianPath *string `json:"obsidian_path"`
	CampaignID   int64   `json:"campaign_id"`
}

type UpdateArcPayload struct {
	Title        string  `json:"name"`
	Order        int64   `json:"order"`
	Status       string  `json:"status"`
	SubarcOrder  *int64  `json:"subarc_order"`
	Summary      string  `json:"summary"`
	ObsidianPath *string `json:"obsidian_path"`
}

var validArcStatuses = map[string]bool{
	"planificado": true,
	"en_curso":    true,
	"cerrado":     true,
}

func (h *Handlers) ListArcs(w http.ResponseWriter, r *http.Request) {
	campignId, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign_id", http.StatusBadRequest)
		return
	}
	arcs, err := h.arcs.List(r.Context(), campignId)
	if err != nil {
		http.Error(w, "Error retrieving arcs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(arcs); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) CreateArc(w http.ResponseWriter, r *http.Request) {
	campaignId, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign_id", http.StatusBadRequest)
		return
	}
	var payload CreateArcPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Summary == "" || payload.Title == "" || payload.Order == 0 || !validArcStatuses[payload.Status] {
		http.Error(w, "Name, Order, Summary and a valid Status are required fields", http.StatusBadRequest)
		return
	}
	arc := models.Arc{
		Title:        payload.Title,
		Order:        payload.Order,
		Status:       payload.Status,
		SubarcOrder:  payload.SubarcOrder,
		Summary:      payload.Summary,
		ObsidianPath: payload.ObsidianPath,
		CampaignID:   campaignId,
	}

	err = h.arcs.Create(r.Context(), &arc)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(arc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetArc(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	arc, err := h.arcs.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Arc not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving arc", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(arc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) UpdateArc(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	var payload UpdateArcPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Summary == "" || payload.Title == "" || payload.Order == 0 || !validArcStatuses[payload.Status] {
		http.Error(w, "Name, Order, Summary and a valid Status are required fields", http.StatusBadRequest)
		return
	}

	arc := models.Arc{
		Title:        payload.Title,
		Order:        payload.Order,
		Status:       payload.Status,
		SubarcOrder:  payload.SubarcOrder,
		Summary:      payload.Summary,
		ObsidianPath: payload.ObsidianPath,
	}
	err = h.arcs.Update(r.Context(), id, &arc)

	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Arc not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error updating arc", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(arc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteArc(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.arcs.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Arc not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error deleting arc", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
