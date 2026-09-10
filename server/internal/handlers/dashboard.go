package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func (h *Handlers) GetDashboard(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	summary, err := h.dashboard.Get(r.Context(), campaignID)
	if err != nil {
		http.Error(w, "Error retrieving dashboard", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(summary); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}
