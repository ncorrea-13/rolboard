package handlers

import (
	"crypto/subtle"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

const sessionCookieName = "rolboard_session"

func (h *Handlers) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		got := r.Header.Get("X-Admin-Token")
		if h.adminToken == "" || subtle.ConstantTimeCompare([]byte(got), []byte(h.adminToken)) != 1 {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func (h *Handlers) requireCampaign(resolve func(r *http.Request) (int64, error), next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(sessionCookieName)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		sessionCampaignID, err := h.auth.ValidateToken(r.Context(), cookie.Value)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		resourceCampaignID, err := resolve(r)
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "Invalid id", http.StatusBadRequest)
			return
		}

		if resourceCampaignID != sessionCampaignID {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func resolveCampaignFromPath(r *http.Request) (int64, error) {
	return strconv.ParseInt(r.PathValue("id"), 10, 64)
}

func (h *Handlers) resolveViaTable(table string) func(*http.Request) (int64, error) {
	return func(r *http.Request) (int64, error) {
		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			return 0, err
		}
		return repository.CampaignIDByEntity(r.Context(), h.db, table, id)
	}
}

func (h *Handlers) resolveEncounterParticipant(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		return 0, err
	}
	return repository.CampaignIDByEncounterParticipant(r.Context(), h.db, id)
}
