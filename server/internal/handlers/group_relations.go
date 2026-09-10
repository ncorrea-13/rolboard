package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type AddGroupMemberPayload struct {
	NPCID int64 `json:"npc_id"`
}

func (h *Handlers) AddGroupMember(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid group id", http.StatusBadRequest)
		return
	}

	var payload AddGroupMemberPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.NPCID == 0 {
		http.Error(w, "npc_id is a required field", http.StatusBadRequest)
		return
	}

	group, err := h.groups.GetByID(r.Context(), groupID)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving group", http.StatusInternalServerError)
		return
	}
	npc, err := h.npcs.GetByID(r.Context(), payload.NPCID)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "NPC not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving npc", http.StatusInternalServerError)
		return
	}
	if group.CampaignID != npc.CampaignID {
		http.Error(w, "NPC does not belong to the same campaign as the group", http.StatusBadRequest)
		return
	}

	if err := h.groups.AddMember(r.Context(), groupID, payload.NPCID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *Handlers) RemoveGroupMember(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid group id", http.StatusBadRequest)
		return
	}
	npcID, err := strconv.ParseInt(r.PathValue("npcId"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid npc id", http.StatusBadRequest)
		return
	}

	if err := h.groups.RemoveMember(r.Context(), groupID, npcID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
