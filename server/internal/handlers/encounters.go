package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type CreateEncounterPayload struct {
	SessionID *int64 `json:"session_id"`
	Round     int64  `json:"round"`
	Status    string `json:"status"`
}

type UpdateEncounterPayload struct {
	SessionID *int64 `json:"session_id"`
	Round     int64  `json:"round"`
	Status    string `json:"status"`
}

var validEncounterStatuses = map[string]bool{
	"planificado": true,
	"activo":      true,
	"cerrado":     true,
}

func (h *Handlers) ListEncounters(w http.ResponseWriter, r *http.Request) {
	campaignId, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign_id", http.StatusBadRequest)
		return
	}
	encounters, err := h.encounters.List(r.Context(), campaignId)
	if err != nil {
		http.Error(w, "Error retrieving encounters", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(encounters); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) CreateEncounter(w http.ResponseWriter, r *http.Request) {
	campaignId, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign_id", http.StatusBadRequest)
		return
	}
	var payload CreateEncounterPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Status == "" {
		payload.Status = "planificado"
	}
	if payload.Round == 0 {
		payload.Round = 1
	}
	if !validEncounterStatuses[payload.Status] {
		http.Error(w, "A valid Status is required", http.StatusBadRequest)
		return
	}

	encounter := models.Encounter{
		CampaignID: campaignId,
		SessionID:  payload.SessionID,
		Round:      payload.Round,
		Status:     payload.Status,
	}

	err = h.encounters.Create(r.Context(), &encounter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(encounter); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetEncounter(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	encounter, err := h.encounters.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Encounter not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving encounter", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(encounter); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) UpdateEncounter(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	var payload UpdateEncounterPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Round == 0 {
		payload.Round = 1
	}
	if !validEncounterStatuses[payload.Status] {
		http.Error(w, "A valid Status is required", http.StatusBadRequest)
		return
	}

	encounter := models.Encounter{
		SessionID: payload.SessionID,
		Round:     payload.Round,
		Status:    payload.Status,
	}
	err = h.encounters.Update(r.Context(), id, &encounter)

	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Encounter not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error updating encounter", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(encounter); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteEncounter(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.encounters.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Encounter not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error deleting encounter", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
