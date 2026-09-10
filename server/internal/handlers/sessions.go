package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type CreateSessionPayload struct {
	ArcID         *int64  `json:"arc_id"`
	SessionNumber int64   `json:"session_number"`
	SubNumber     int64   `json:"sub_number"`
	SessionType   string  `json:"session_type"`
	Date          string  `json:"date"`
	Summary       string  `json:"summary"`
	PrepNotes     string  `json:"prep_notes"`
	ObsidianPath  *string `json:"obsidian_path"`
}

type UpdateSessionPayload struct {
	ArcID         *int64  `json:"arc_id"`
	SessionNumber int64   `json:"session_number"`
	SubNumber     int64   `json:"sub_number"`
	SessionType   string  `json:"session_type"`
	Date          string  `json:"date"`
	Summary       string  `json:"summary"`
	PrepNotes     string  `json:"prep_notes"`
	ObsidianPath  *string `json:"obsidian_path"`
}

var validSessionTypes = map[string]bool{
	"session":   true,
	"interlude": true,
	"planning":  true,
}

func (h *Handlers) ListSessions(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	sessions, err := h.sessions.List(r.Context(), campaignID)
	if err != nil {
		http.Error(w, "Error retrieving sessions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(sessions); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) CreateSession(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	var payload CreateSessionPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if (payload.Date == "" && payload.SessionType != "planning") || !validSessionTypes[payload.SessionType] {
		http.Error(w, "Date (except for planning sessions) and a valid session_type are required fields", http.StatusBadRequest)
		return
	}

	session := models.Session{
		CampaignID:    campaignID,
		ArcID:         payload.ArcID,
		SessionNumber: payload.SessionNumber,
		SubNumber:     payload.SubNumber,
		SessionType:   payload.SessionType,
		Date:          payload.Date,
		Summary:       payload.Summary,
		PrepNotes:     payload.PrepNotes,
		ObsidianPath:  payload.ObsidianPath,
	}

	if err := h.sessions.Create(r.Context(), &session); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(session); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetSession(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	session, err := h.sessions.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(session); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) UpdateSession(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	var payload UpdateSessionPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if (payload.Date == "" && payload.SessionType != "planning") || !validSessionTypes[payload.SessionType] {
		http.Error(w, "Date (except for planning sessions) and a valid session_type are required fields", http.StatusBadRequest)
		return
	}

	session := models.Session{
		ArcID:         payload.ArcID,
		SessionNumber: payload.SessionNumber,
		SubNumber:     payload.SubNumber,
		SessionType:   payload.SessionType,
		Date:          payload.Date,
		Summary:       payload.Summary,
		PrepNotes:     payload.PrepNotes,
		ObsidianPath:  payload.ObsidianPath,
	}
	err = h.sessions.Update(r.Context(), id, &session)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error updating session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(session); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteSession(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.sessions.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error deleting session", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
