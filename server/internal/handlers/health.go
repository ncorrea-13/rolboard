package handlers

import "net/http"

func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte(`{"status":"ok"}`)); err != nil {
		http.Error(w, "Error writing response", http.StatusInternalServerError)
	}
}
