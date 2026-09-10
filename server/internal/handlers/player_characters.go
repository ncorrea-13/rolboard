package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type CreatePlayerCharacterPayload struct {
	PlayerName       string  `json:"player_name"`
	CharacterName    string  `json:"character_name"`
	Race             string  `json:"race"`
	Class            string  `json:"class"`
	Status           string  `json:"status"`
	Backstory        string  `json:"backstory"`
	ProgressionNotes string  `json:"progression_notes"`
	ObsidianPath     *string `json:"obsidian_path"`
}

// UpdatePlayerCharacterPayload no tiene spren_npc_id a propósito: ese campo
// solo lo resuelve el indexer del vault, ver PlayerCharacterRepository.Update.
type UpdatePlayerCharacterPayload struct {
	PlayerName       string  `json:"player_name"`
	CharacterName    string  `json:"character_name"`
	Race             string  `json:"race"`
	Class            string  `json:"class"`
	Status           string  `json:"status"`
	Backstory        string  `json:"backstory"`
	ProgressionNotes string  `json:"progression_notes"`
	ObsidianPath     *string `json:"obsidian_path"`
}

var validPCStatuses = map[string]bool{
	"vivo":         true,
	"muerto":       true,
	"desaparecido": true,
	"activo":       true,
}

func (h *Handlers) ListPlayerCharacters(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	pcs, err := h.playerCharacters.List(r.Context(), campaignID)
	if err != nil {
		http.Error(w, "Error retrieving player characters", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(pcs); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) CreatePlayerCharacter(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	var payload CreatePlayerCharacterPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.PlayerName == "" || payload.CharacterName == "" || !validPCStatuses[payload.Status] {
		http.Error(w, "player_name, character_name and a valid status are required fields", http.StatusBadRequest)
		return
	}

	pc := models.PlayerCharacter{
		CampaignID:       campaignID,
		PlayerName:       payload.PlayerName,
		CharacterName:    payload.CharacterName,
		Race:             payload.Race,
		Class:            payload.Class,
		Status:           payload.Status,
		Backstory:        payload.Backstory,
		ProgressionNotes: payload.ProgressionNotes,
		ObsidianPath:     payload.ObsidianPath,
	}

	if err := h.playerCharacters.Create(r.Context(), &pc); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(pc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetPlayerCharacter(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	pc, err := h.playerCharacters.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Player character not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving player character", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(pc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) UpdatePlayerCharacter(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	var payload UpdatePlayerCharacterPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.PlayerName == "" || payload.CharacterName == "" || !validPCStatuses[payload.Status] {
		http.Error(w, "player_name, character_name and a valid status are required fields", http.StatusBadRequest)
		return
	}

	pc := models.PlayerCharacter{
		PlayerName:       payload.PlayerName,
		CharacterName:    payload.CharacterName,
		Race:             payload.Race,
		Class:            payload.Class,
		Status:           payload.Status,
		Backstory:        payload.Backstory,
		ProgressionNotes: payload.ProgressionNotes,
		ObsidianPath:     payload.ObsidianPath,
	}
	err = h.playerCharacters.Update(r.Context(), id, &pc)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Player character not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error updating player character", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(pc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeletePlayerCharacter(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.playerCharacters.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Player character not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error deleting player character", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
