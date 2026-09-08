package handlers

import (
	"encoding/json"
	"net/http"
)

func (h *Handlers) Reindex(w http.ResponseWriter, r *http.Request) {
	result, err := h.admin.Reindex(r.Context())
	if err != nil {
		http.Error(w, "Error reindexing vault", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}
