package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/ncorrea/campaign-dashboard/server/internal/service"
)

type Handlers struct {
	campaigns *service.CampaignService
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
