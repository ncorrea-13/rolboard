package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
)

func (h *Handlers) ListVaultDirs(w http.ResponseWriter, r *http.Request) {
	excludeCampaignID, _ := strconv.ParseInt(r.URL.Query().Get("campaignId"), 10, 64)
	dirs, err := h.admin.ListVaultDirs(r.Context(), excludeCampaignID)
	if err != nil {
		http.Error(w, "Error listing vault directories", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(dirs); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

type SetAccessCodePayload struct {
	Code string `json:"code"`
}

func (h *Handlers) SetAccessCode(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	var payload SetAccessCodePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if len(payload.Code) < 8 {
		http.Error(w, "Code must be at least 8 characters", http.StatusBadRequest)
		return
	}

	if err := h.auth.SetAccessCode(r.Context(), id, payload.Code); err != nil {
		http.Error(w, "Error setting access code", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
