package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type SecretPayload struct {
	Title             string  `json:"title"`
	Body              string  `json:"body"`
	Status            string  `json:"status"`
	RevealedSessionID *int64  `json:"revealed_session_id"`
	NPCID             *int64  `json:"npc_id"`
	LocationID        *int64  `json:"location_id"`
	LoreEntryID       *int64  `json:"lore_entry_id"`
	KnownByNPCIDs     []int64 `json:"known_by_npc_ids"`
}

var validSecretStatuses = map[string]bool{
	"hidden":   true,
	"revealed": true,
}

func (h *Handlers) validateSecret(ctx context.Context, campaignID int64, p SecretPayload) (string, bool) {
	if strings.TrimSpace(p.Title) == "" || !validSecretStatuses[p.Status] {
		return "Title and a valid status are required fields", false
	}
	if p.RevealedSessionID != nil {
		if s, err := h.sessions.GetByID(ctx, *p.RevealedSessionID); err != nil || s.CampaignID != campaignID {
			return "Session not found in this campaign", false
		}
	}
	if p.NPCID != nil {
		if n, err := h.npcs.GetByID(ctx, *p.NPCID); err != nil || n.CampaignID != campaignID {
			return "NPC not found in this campaign", false
		}
	}
	if p.LocationID != nil {
		if l, err := h.locations.GetByID(ctx, *p.LocationID); err != nil || l.CampaignID != campaignID {
			return "Location not found in this campaign", false
		}
	}
	if p.LoreEntryID != nil {
		if e, err := h.lore.GetEntry(ctx, *p.LoreEntryID); err != nil || e.CampaignID != campaignID {
			return "Lore entry not found in this campaign", false
		}
	}
	for _, id := range p.KnownByNPCIDs {
		if n, err := h.npcs.GetByID(ctx, id); err != nil || n.CampaignID != campaignID {
			return "Known-by NPC not found in this campaign", false
		}
	}
	return "", true
}

func secretFromPayload(p SecretPayload) models.Secret {
	s := models.Secret{
		Title: strings.TrimSpace(p.Title), Body: p.Body, Status: p.Status,
		NPCID: p.NPCID, LocationID: p.LocationID, LoreEntryID: p.LoreEntryID,
		KnownByNPCIDs: p.KnownByNPCIDs,
	}
	if p.Status == "revealed" {
		s.RevealedSessionID = p.RevealedSessionID
	}
	return s
}

func (h *Handlers) ListSecrets(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	secrets, err := h.secrets.List(r.Context(), campaignID)
	if err != nil {
		internalError(w, err, "Error retrieving secrets")
		return
	}
	writeJSON(w, http.StatusOK, secrets)
}

func (h *Handlers) CreateSecret(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	var payload SecretPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if msg, ok := h.validateSecret(r.Context(), campaignID, payload); !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	secret := secretFromPayload(payload)
	secret.CampaignID = campaignID
	if err := h.secrets.Create(r.Context(), &secret); err != nil {
		internalError(w, err, "Error creating secret")
		return
	}
	writeJSON(w, http.StatusCreated, secret)
}

func (h *Handlers) GetSecret(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	secret, err := h.secrets.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Secret not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving secret")
		return
	}
	writeJSON(w, http.StatusOK, secret)
}

func (h *Handlers) UpdateSecret(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	var payload SecretPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	current, err := h.secrets.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Secret not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving secret")
		return
	}
	if msg, ok := h.validateSecret(r.Context(), current.CampaignID, payload); !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	secret := secretFromPayload(payload)
	err = h.secrets.Update(r.Context(), id, &secret)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Secret not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error updating secret")
		return
	}
	writeJSON(w, http.StatusOK, secret)
}

func (h *Handlers) DeleteSecret(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	err = h.secrets.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Secret not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error deleting secret")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
