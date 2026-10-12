package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type LooseNotePayload struct {
	Title   string `json:"title"`
	Body    string `json:"body"`
	Pending bool   `json:"pending"`
}

func decodeLooseNote(w http.ResponseWriter, r *http.Request) (LooseNotePayload, bool) {
	var payload LooseNotePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return payload, false
	}
	payload.Title = strings.TrimSpace(payload.Title)
	if payload.Title == "" {
		http.Error(w, "Title is a required field", http.StatusBadRequest)
		return payload, false
	}
	return payload, true
}

func (h *Handlers) ListLooseNotes(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	notes, err := h.looseNotes.List(r.Context(), campaignID)
	if err != nil {
		internalError(w, err, "Error retrieving notes")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(notes); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) CreateLooseNote(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	payload, ok := decodeLooseNote(w, r)
	if !ok {
		return
	}

	note := models.LooseNote{CampaignID: campaignID, Title: payload.Title, Body: payload.Body, Pending: payload.Pending}
	if err := h.looseNotes.Create(r.Context(), &note); err != nil {
		internalError(w, err, "Error creating note")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(note); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetLooseNote(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	note, err := h.looseNotes.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Note not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving note")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(note); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) UpdateLooseNote(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	payload, ok := decodeLooseNote(w, r)
	if !ok {
		return
	}

	note := models.LooseNote{Title: payload.Title, Body: payload.Body, Pending: payload.Pending}
	err = h.looseNotes.Update(r.Context(), id, &note)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Note not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error updating note")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(note); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteLooseNote(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.looseNotes.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Note not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error deleting note")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
