package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type CreateLocationPayload struct {
	Name             string  `json:"name"`
	LocationType     string  `json:"location_type"`
	ParentLocationID *int64  `json:"parent_location_id"`
	Description      string  `json:"description"`
	Notes            string  `json:"notes"`
	ObsidianPath     *string `json:"obsidian_path"`
}

type UpdateLocationPayload struct {
	Name             string  `json:"name"`
	LocationType     string  `json:"location_type"`
	ParentLocationID *int64  `json:"parent_location_id"`
	Description      string  `json:"description"`
	Notes            string  `json:"notes"`
	ObsidianPath     *string `json:"obsidian_path"`
}

var validLocationTypes = map[string]bool{
	"planet": true,
	"region": true,
	"city":   true,
	"site":   true,
	"plane":  true,
}

func (h *Handlers) ListLocations(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	locations, err := h.locations.List(r.Context(), campaignID)
	if err != nil {
		http.Error(w, "Error retrieving locations", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(locations); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) CreateLocation(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	var payload CreateLocationPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Name == "" || !validLocationTypes[payload.LocationType] {
		http.Error(w, "Name and a valid location_type are required fields", http.StatusBadRequest)
		return
	}

	location := models.Location{
		CampaignID:       campaignID,
		Name:             payload.Name,
		LocationType:     payload.LocationType,
		ParentLocationID: payload.ParentLocationID,
		Description:      payload.Description,
		Notes:            payload.Notes,
		ObsidianPath:     payload.ObsidianPath,
	}

	if err := h.locations.Create(r.Context(), &location); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(location); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetLocation(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	location, err := h.locations.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Location not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving location", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(location); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) UpdateLocation(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	var payload UpdateLocationPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Name == "" || !validLocationTypes[payload.LocationType] {
		http.Error(w, "Name and a valid location_type are required fields", http.StatusBadRequest)
		return
	}

	location := models.Location{
		Name:             payload.Name,
		LocationType:     payload.LocationType,
		ParentLocationID: payload.ParentLocationID,
		Description:      payload.Description,
		Notes:            payload.Notes,
		ObsidianPath:     payload.ObsidianPath,
	}
	err = h.locations.Update(r.Context(), id, &location)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Location not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error updating location", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(location); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteLocation(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.locations.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Location not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error deleting location", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
