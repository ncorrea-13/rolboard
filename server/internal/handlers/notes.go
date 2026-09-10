package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
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
	if errors.Is(err, os.ErrInvalid) {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	if os.IsNotExist(err) {
		http.Error(w, "Note not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error rendering note", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"html": html}); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}
