package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func (h *Handlers) RenderNote(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "Missing path query param", http.StatusBadRequest)
		return
	}

	html, err := h.notes.Render(r.Context(), campaignID, path)
	if err != nil {
		http.Error(w, "Error rendering note", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"html": html}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}
