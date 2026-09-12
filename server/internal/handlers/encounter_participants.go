package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type CreateEncounterParticipantPayload struct {
	PcID        *int64          `json:"pc_id"`
	NpcID       *int64          `json:"npc_id"`
	DisplayName *string         `json:"display_name"`
	CurrentHp   *int64          `json:"current_hp"`
	MaxHp       *int64          `json:"max_hp"`
	Initiative  *int64          `json:"initiative_value"`
	TurnType    *string         `json:"turn_type"`
	Notes       string          `json:"notes"`
	Attributes  json.RawMessage `json:"attributes"`
	Skills      json.RawMessage `json:"skills"`
}

type UpdateEncounterParticipantPayload = CreateEncounterParticipantPayload

var validTurnTypes = map[string]bool{
	"rapido": true,
	"lento":  true,
}

func validateParticipantPayload(p CreateEncounterParticipantPayload) string {
	refs := 0
	if p.PcID != nil {
		refs++
	}
	if p.NpcID != nil {
		refs++
	}
	if p.DisplayName != nil {
		refs++
	}
	if refs > 1 {
		return "Only one of pc_id, npc_id or display_name is allowed"
	}
	if p.TurnType != nil && !validTurnTypes[*p.TurnType] {
		return "Invalid turn_type"
	}
	return ""
}

func (h *Handlers) ListEncounterParticipants(w http.ResponseWriter, r *http.Request) {
	encounterId, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid encounter_id", http.StatusBadRequest)
		return
	}
	participants, err := h.encounterParticipants.List(r.Context(), encounterId)
	if err != nil {
		http.Error(w, "Error retrieving participants", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(participants); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) CreateEncounterParticipant(w http.ResponseWriter, r *http.Request) {
	encounterId, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid encounter_id", http.StatusBadRequest)
		return
	}
	var payload CreateEncounterParticipantPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if msg := validateParticipantPayload(payload); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	participant := models.EncounterParticipant{
		EncounterID: encounterId,
		PcID:        payload.PcID,
		NpcID:       payload.NpcID,
		DisplayName: payload.DisplayName,
		CurrentHp:   payload.CurrentHp,
		MaxHp:       payload.MaxHp,
		Initiative:  payload.Initiative,
		TurnType:    payload.TurnType,
		Notes:       payload.Notes,
		Attributes:  payload.Attributes,
		Skills:      payload.Skills,
	}

	err = h.encounterParticipants.Create(r.Context(), &participant)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(participant); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) UpdateEncounterParticipant(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	var payload UpdateEncounterParticipantPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if msg := validateParticipantPayload(payload); msg != "" {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	participant := models.EncounterParticipant{
		PcID:        payload.PcID,
		NpcID:       payload.NpcID,
		DisplayName: payload.DisplayName,
		CurrentHp:   payload.CurrentHp,
		MaxHp:       payload.MaxHp,
		Initiative:  payload.Initiative,
		TurnType:    payload.TurnType,
		Notes:       payload.Notes,
		Attributes:  payload.Attributes,
		Skills:      payload.Skills,
	}
	err = h.encounterParticipants.Update(r.Context(), id, &participant)

	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Participant not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error updating participant", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(participant); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteEncounterParticipant(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.encounterParticipants.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Participant not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error deleting participant", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
