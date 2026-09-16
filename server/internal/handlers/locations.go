package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/imagestore"
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
	if payload.ParentLocationID != nil {
		parent, err := h.locations.GetByID(r.Context(), *payload.ParentLocationID)
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, "Parent location not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "Error retrieving parent location", http.StatusInternalServerError)
			return
		}
		if parent.CampaignID != campaignID {
			http.Error(w, "Parent location does not belong to the same campaign", http.StatusBadRequest)
			return
		}
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
	if payload.ParentLocationID != nil {
		current, err := h.locations.GetByID(r.Context(), id)
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, "Location not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "Error retrieving location", http.StatusInternalServerError)
			return
		}
		parent, err := h.locations.GetByID(r.Context(), *payload.ParentLocationID)
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, "Parent location not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "Error retrieving parent location", http.StatusInternalServerError)
			return
		}
		if parent.CampaignID != current.CampaignID {
			http.Error(w, "Parent location does not belong to the same campaign", http.StatusBadRequest)
			return
		}
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

func (h *Handlers) SetLocationImage(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	data, ok := readUploadedImage(w, r)
	if !ok {
		return
	}

	loc, err := h.locations.SetImage(r.Context(), id, data)
	switch {
	case errors.Is(err, imagestore.ErrUnsupportedFormat):
		http.Error(w, "Unsupported image format: use PNG or JPEG", http.StatusBadRequest)
		return
	case errors.Is(err, repository.ErrNotFound):
		http.Error(w, "Location not found", http.StatusNotFound)
		return
	case err != nil:
		http.Error(w, "Error saving image", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(loc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteLocationImage(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	loc, err := h.locations.DeleteImage(r.Context(), id)
	switch {
	case errors.Is(err, repository.ErrNotFound):
		http.Error(w, "Location not found", http.StatusNotFound)
		return
	case err != nil:
		http.Error(w, "Error deleting image", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(loc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetLocationImage(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	absPath, contentType, err := h.locations.ImageFile(r.Context(), id)
	switch {
	case errors.Is(err, repository.ErrNotFound):
		http.Error(w, "Image not found", http.StatusNotFound)
		return
	case err != nil:
		http.Error(w, "Error retrieving image", http.StatusInternalServerError)
		return
	}

	serveImage(w, r, absPath, contentType)
}
