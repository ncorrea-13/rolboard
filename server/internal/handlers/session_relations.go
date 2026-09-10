package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type AddSessionNpcPayload struct {
	NPCID int64 `json:"npc_id"`
}

type AddSessionQuestPayload struct {
	QuestID int64 `json:"quest_id"`
}

func (h *Handlers) ListSessionNpcs(w http.ResponseWriter, r *http.Request) {
	sessionID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid session id", http.StatusBadRequest)
		return
	}

	npcs, err := h.sessions.ListNpcs(r.Context(), sessionID)
	if err != nil {
		http.Error(w, "Error retrieving session npcs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(npcs); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) AddSessionNpc(w http.ResponseWriter, r *http.Request) {
	sessionID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid session id", http.StatusBadRequest)
		return
	}

	var payload AddSessionNpcPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.NPCID == 0 {
		http.Error(w, "npc_id is a required field", http.StatusBadRequest)
		return
	}

	sess, err := h.sessions.GetByID(r.Context(), sessionID)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving session", http.StatusInternalServerError)
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
	if sess.CampaignID != npc.CampaignID {
		http.Error(w, "NPC does not belong to the same campaign as the session", http.StatusBadRequest)
		return
	}

	if err := h.sessions.AddNpc(r.Context(), sessionID, payload.NPCID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *Handlers) RemoveSessionNpc(w http.ResponseWriter, r *http.Request) {
	sessionID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid session id", http.StatusBadRequest)
		return
	}
	npcID, err := strconv.ParseInt(r.PathValue("npcId"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid npc id", http.StatusBadRequest)
		return
	}

	if err := h.sessions.RemoveNpc(r.Context(), sessionID, npcID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListSessionQuests(w http.ResponseWriter, r *http.Request) {
	sessionID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid session id", http.StatusBadRequest)
		return
	}

	quests, err := h.sessions.ListQuests(r.Context(), sessionID)
	if err != nil {
		http.Error(w, "Error retrieving session quests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(quests); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) AddSessionQuest(w http.ResponseWriter, r *http.Request) {
	sessionID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid session id", http.StatusBadRequest)
		return
	}

	var payload AddSessionQuestPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.QuestID == 0 {
		http.Error(w, "quest_id is a required field", http.StatusBadRequest)
		return
	}

	sess, err := h.sessions.GetByID(r.Context(), sessionID)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving session", http.StatusInternalServerError)
		return
	}
	quest, err := h.quests.GetByID(r.Context(), payload.QuestID)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Quest not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving quest", http.StatusInternalServerError)
		return
	}
	if sess.CampaignID != quest.CampaignID {
		http.Error(w, "Quest does not belong to the same campaign as the session", http.StatusBadRequest)
		return
	}

	if err := h.sessions.AddQuest(r.Context(), sessionID, payload.QuestID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *Handlers) RemoveSessionQuest(w http.ResponseWriter, r *http.Request) {
	sessionID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid session id", http.StatusBadRequest)
		return
	}
	questID, err := strconv.ParseInt(r.PathValue("questId"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid quest id", http.StatusBadRequest)
		return
	}

	if err := h.sessions.RemoveQuest(r.Context(), sessionID, questID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
