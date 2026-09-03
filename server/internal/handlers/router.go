package handlers

import (
	"net/http"
)

func NewRouter(h *Handlers) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", h.Health)
	mux.Handle("GET /api/campaigns", http.HandlerFunc(h.ListCampaigns))

	return mux
}
