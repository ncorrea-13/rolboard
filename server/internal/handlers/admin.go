package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func (h *Handlers) ListVaultDirs(w http.ResponseWriter, r *http.Request) {
	dirs, err := h.admin.ListVaultDirs(r.Context())
	if err != nil {
		http.Error(w, "Error listing vault directories", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(dirs); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) Reindex(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	result, err := h.admin.Reindex(r.Context(), id)
	if err != nil {
		http.Error(w, "Error reindexing vault", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}
