package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

const maxQuestNpcRoleLen = 60

type QuestNpcPayload struct {
	Role string `json:"role"`
}

func (h *Handlers) ListQuestNpcs(w http.ResponseWriter, r *http.Request) {
	questID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid quest id", http.StatusBadRequest)
		return
	}
	npcs, err := h.quests.ListNpcs(r.Context(), questID)
	if err != nil {
		internalError(w, err, "Error retrieving quest npcs")
		return
	}
	writeJSON(w, http.StatusOK, npcs)
}

func (h *Handlers) SetQuestNpc(w http.ResponseWriter, r *http.Request) {
	questID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid quest id", http.StatusBadRequest)
		return
	}
	npcID, err := strconv.ParseInt(r.PathValue("npcId"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid npc id", http.StatusBadRequest)
		return
	}
	var payload QuestNpcPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	role := strings.TrimSpace(payload.Role)
	if utf8.RuneCountInString(role) > maxQuestNpcRoleLen {
		http.Error(w, "role is too long", http.StatusBadRequest)
		return
	}

	quest, err := h.quests.GetByID(r.Context(), questID)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Quest not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving quest")
		return
	}
	npc, err := h.npcs.GetByID(r.Context(), npcID)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "NPC not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving npc")
		return
	}
	if quest.CampaignID != npc.CampaignID {
		http.Error(w, "NPC does not belong to the same campaign as the quest", http.StatusBadRequest)
		return
	}

	if err := h.quests.SetNpc(r.Context(), questID, npcID, role); err != nil {
		internalError(w, err, "Error linking quest npc")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) RemoveQuestNpc(w http.ResponseWriter, r *http.Request) {
	questID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid quest id", http.StatusBadRequest)
		return
	}
	npcID, err := strconv.ParseInt(r.PathValue("npcId"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid npc id", http.StatusBadRequest)
		return
	}
	if err := h.quests.RemoveNpc(r.Context(), questID, npcID); err != nil {
		internalError(w, err, "Error unlinking quest npc")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
