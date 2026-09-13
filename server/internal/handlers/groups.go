package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type CreateGroupPayload struct {
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Notes        string  `json:"notes"`
	Alineacion   string  `json:"alineacion"`
	LiderNPCID   *int64  `json:"lider_npc_id"`
	ObsidianPath *string `json:"obsidian_path"`
}

type UpdateGroupPayload struct {
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Notes        string  `json:"notes"`
	Alineacion   string  `json:"alineacion"`
	LiderNPCID   *int64  `json:"lider_npc_id"`
	ObsidianPath *string `json:"obsidian_path"`
}

func (h *Handlers) ListGroups(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	groups, err := h.groups.List(r.Context(), campaignID)
	if err != nil {
		http.Error(w, "Error retrieving groups", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(groups); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) CreateGroup(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	var payload CreateGroupPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Name == "" {
		http.Error(w, "Name is a required field", http.StatusBadRequest)
		return
	}

	group := models.Group{
		CampaignID:   campaignID,
		Name:         payload.Name,
		Description:  payload.Description,
		Notes:        payload.Notes,
		Alineacion:   payload.Alineacion,
		LiderNPCID:   payload.LiderNPCID,
		ObsidianPath: payload.ObsidianPath,
	}

	if err := h.groups.Create(r.Context(), &group); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(group); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetGroup(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	group, err := h.groups.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving group", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(group); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetMembers(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	members, err := h.groups.GetMembers(r.Context(), id)
	if err != nil {
		http.Error(w, "Error retrieving group members", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(members); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetPCMembers(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	members, err := h.groups.GetPCMembers(r.Context(), id)
	if err != nil {
		http.Error(w, "Error retrieving group PC members", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(members); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	var payload UpdateGroupPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Name == "" {
		http.Error(w, "Name is a required field", http.StatusBadRequest)
		return
	}

	group := models.Group{
		Name:         payload.Name,
		Description:  payload.Description,
		Notes:        payload.Notes,
		Alineacion:   payload.Alineacion,
		LiderNPCID:   payload.LiderNPCID,
		ObsidianPath: payload.ObsidianPath,
	}
	err = h.groups.Update(r.Context(), id, &group)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error updating group", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(group); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.groups.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error deleting group", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
