package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

type NPCTypePayload struct {
	Label string `json:"label"`
	Color string `json:"color"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("encode response", "err", err)
	}
}

func (h *Handlers) resolveNPCType(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		return 0, err
	}
	return repository.CampaignIDByNPCType(r.Context(), h.db, id)
}

func (h *Handlers) ListNPCTypes(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	types, err := h.npcTypes.List(r.Context(), campaignID)
	if err != nil {
		http.Error(w, "Error retrieving npc types", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, types)
}

func (h *Handlers) CreateNPCType(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	var payload NPCTypePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	t, err := h.npcTypes.Create(r.Context(), campaignID, payload.Label, payload.Color)
	if errors.Is(err, service.ErrInvalidNPCType) {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "Error creating npc type", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (h *Handlers) UpdateNPCType(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	var payload NPCTypePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	t, err := h.npcTypes.Update(r.Context(), id, payload.Label, payload.Color)
	if errors.Is(err, service.ErrInvalidNPCType) {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "NPC type not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error updating npc type", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (h *Handlers) DeleteNPCType(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.npcTypes.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "NPC type not found", http.StatusNotFound)
		return
	}
	if errors.Is(err, repository.ErrNPCTypeInUse) {
		http.Error(w, "NPC type is in use", http.StatusConflict)
		return
	}
	if err != nil {
		http.Error(w, "Error deleting npc type", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
