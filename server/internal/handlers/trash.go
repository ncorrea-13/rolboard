package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

func (h *Handlers) ListTrash(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	items, err := h.trash.List(r.Context(), campaignID)
	if err != nil {
		internalError(w, err, "Error retrieving trash")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(items); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) RestoreTrashItem(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	itemID, err := strconv.ParseInt(r.PathValue("itemId"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.trash.Restore(r.Context(), campaignID, r.PathValue("kind"), itemID)
	switch {
	case errors.Is(err, repository.ErrNotFound):
		http.Error(w, "Item not found in trash", http.StatusNotFound)
	case errors.Is(err, repository.ErrParentDeleted):
		apiError(w, http.StatusConflict, "restore_parent_deleted")
	case errors.Is(err, repository.ErrConflict):
		apiError(w, http.StatusConflict, "session_conflict")
	case err != nil:
		internalError(w, err, "Error restoring item")
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}
