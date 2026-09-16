package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/service"
)

type LoginPayload struct {
	Code string `json:"code"`
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	var payload LoginPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	token, _, err := h.auth.Login(r.Context(), campaignID, payload.Code)
	if errors.Is(err, service.ErrInvalidAccessCode) {
		slog.Warn("login failed: invalid access code",
			"campaign_id", campaignID,
			"remote", r.RemoteAddr,
		)
		http.Error(w, "Invalid access code", http.StatusUnauthorized)
		return
	}
	if err != nil {
		http.Error(w, "Error logging in", http.StatusInternalServerError)
		return
	}

	slog.Info("login ok",
		"campaign_id", campaignID,
		"remote", r.RemoteAddr,
	)
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(h.auth.SessionTTL().Seconds()),
	})
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		_ = h.auth.Logout(r.Context(), cookie.Value)
	}
	slog.Info("logout",
		"campaign_id", r.PathValue("id"),
		"remote", r.RemoteAddr,
	)
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
	w.WriteHeader(http.StatusNoContent)
}
