package handlers

import (
	"net/http"
)

func NewRouter(h *Handlers) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", h.Health)
	mux.Handle("GET /api/campaigns", http.HandlerFunc(h.ListCampaigns))
	mux.HandleFunc("POST /api/campaigns", h.CreateCampaign)
	mux.Handle("GET /api/campaigns/{id}", http.HandlerFunc(h.GetCampaign))
	mux.Handle("PUT /api/campaigns/{id}", http.HandlerFunc(h.UpdateCampaign))
	mux.Handle("DELETE /api/campaigns/{id}", http.HandlerFunc(h.DeleteCampaign))
	return mux
}
