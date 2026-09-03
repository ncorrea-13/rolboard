// Package handlers exposes the REST API's HTTP endpoints.
package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

type Handlers struct {
	campaigns *service.CampaignService
}

type CreateCampaignPayload struct {
	Name        string `json:"name"`
	System      string `json:"system"`
	Description string `json:"description"`
}

func NewHandlers(campaigns *service.CampaignService) *Handlers {
	return &Handlers{campaigns: campaigns}
}

func (h *Handlers) ListCampaigns(w http.ResponseWriter, r *http.Request) {
	campaigns, err := h.campaigns.List(r.Context())
	if err != nil {
		http.Error(w, "Error retrieving campaigns", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(campaigns)
}

func (h *Handlers) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	var payload CreateCampaignPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Name == "" || payload.System == "" {
		http.Error(w, "Name and System are required fields", http.StatusBadRequest)
		return
	}
	campaign := models.Campaign{
		Name:        payload.Name,
		System:      payload.System,
		Description: payload.Description,
	}

	err := h.campaigns.Create(r.Context(), &campaign)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(campaign)
}
