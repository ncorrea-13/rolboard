package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type CreateNPCRelationPayload struct {
	ToNPCID int64  `json:"to_npc_id"`
	Role    string `json:"role"`
}

func (h *Handlers) ListNPCRelations(w http.ResponseWriter, r *http.Request) {
	npcID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid npc id", http.StatusBadRequest)
		return
	}

	relations, err := h.npcs.ListRelations(r.Context(), npcID)
	if err != nil {
		http.Error(w, "Error retrieving npc relations", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(relations); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) CreateNPCRelation(w http.ResponseWriter, r *http.Request) {
	npcID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid npc id", http.StatusBadRequest)
		return
	}

	var payload CreateNPCRelationPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.ToNPCID == 0 || payload.Role == "" {
		http.Error(w, "to_npc_id and role are required fields", http.StatusBadRequest)
		return
	}

	rel := models.NPCRelation{FromNPCID: npcID, ToNPCID: payload.ToNPCID, Role: payload.Role}
	if err := h.npcs.CreateRelation(r.Context(), &rel); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(rel); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteNPCRelation(w http.ResponseWriter, r *http.Request) {
	npcID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid npc id", http.StatusBadRequest)
		return
	}
	toNPCID, err := strconv.ParseInt(r.PathValue("toId"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid to_npc_id", http.StatusBadRequest)
		return
	}
	role := r.PathValue("role")
	if role == "" {
		http.Error(w, "role is required", http.StatusBadRequest)
		return
	}

	if err := h.npcs.DeleteRelation(r.Context(), npcID, toNPCID, role); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
