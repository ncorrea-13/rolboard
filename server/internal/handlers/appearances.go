package handlers

import (
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func (h *Handlers) appearances(load func(r *http.Request, id int64) (*models.Appearances, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			http.Error(w, "Invalid id", http.StatusBadRequest)
			return
		}
		a, err := load(r, id)
		if err != nil {
			internalError(w, err, "Error retrieving appearances")
			return
		}
		writeJSON(w, http.StatusOK, a)
	}
}

func (h *Handlers) NPCAppearances() http.HandlerFunc {
	return h.appearances(func(r *http.Request, id int64) (*models.Appearances, error) {
		return h.appearanceSvc.ForNPC(r.Context(), id)
	})
}

func (h *Handlers) PCAppearances() http.HandlerFunc {
	return h.appearances(func(r *http.Request, id int64) (*models.Appearances, error) {
		return h.appearanceSvc.ForPC(r.Context(), id)
	})
}
