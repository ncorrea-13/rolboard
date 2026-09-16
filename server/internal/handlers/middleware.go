package handlers

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

const (
	sessionCookieName      = "rolboard_session"
	adminSessionCookieName = "rolboard_admin_session"
	adminSessionTTL        = 24 * time.Hour
)

var adminLoginLimiter = newRateLimiter(5, 15*time.Minute)

type adminSessionStore struct {
	mu       sync.Mutex
	expiries map[string]time.Time
}

var adminSessions = &adminSessionStore{expiries: make(map[string]time.Time)}

func (s *adminSessionStore) issue() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)

	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	for existing, expiresAt := range s.expiries {
		if now.After(expiresAt) {
			delete(s.expiries, existing)
		}
	}
	s.expiries[token] = now.Add(adminSessionTTL)
	return token, nil
}

func (s *adminSessionStore) valid(token string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	expiresAt, ok := s.expiries[token]
	if !ok {
		return false
	}
	if time.Now().After(expiresAt) {
		delete(s.expiries, token)
		return false
	}
	return true
}

func (s *adminSessionStore) revoke(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.expiries, token)
}

func (h *Handlers) AdminLogin(w http.ResponseWriter, r *http.Request) {
	h.rateLimit(adminLoginLimiter, func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Token string `json:"token"`
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1024)
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if h.adminToken == "" || subtle.ConstantTimeCompare([]byte(payload.Token), []byte(h.adminToken)) != 1 {
			slog.Warn("admin login failed", "remote", r.RemoteAddr)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		session, err := adminSessions.issue()
		if err != nil {
			http.Error(w, "Error creating session", http.StatusInternalServerError)
			return
		}
		slog.Info("admin login ok", "remote", r.RemoteAddr)
		http.SetCookie(w, &http.Cookie{
			Name:     adminSessionCookieName,
			Value:    session,
			Path:     "/",
			HttpOnly: true,
			Secure:   h.cookieSecure,
			SameSite: http.SameSiteStrictMode,
			MaxAge:   int(adminSessionTTL.Seconds()),
		})
		w.WriteHeader(http.StatusNoContent)
	})(w, r)
}

func (h *Handlers) AdminLogout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(adminSessionCookieName); err == nil {
		adminSessions.revoke(cookie.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     adminSessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
	slog.Info("admin logout", "remote", r.RemoteAddr)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) AdminSession(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(adminSessionCookieName)
		if err != nil || !adminSessions.valid(cookie.Value) {
			slog.Warn("admin auth failed",
				"path", r.URL.Path,
				"method", r.Method,
				"remote", r.RemoteAddr,
			)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func isAdminRequest(r *http.Request) bool {
	cookie, err := r.Cookie(adminSessionCookieName)
	return err == nil && adminSessions.valid(cookie.Value)
}

func (h *Handlers) requireCampaign(resolve func(r *http.Request) (int64, error), next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if adminCookie, err := r.Cookie(adminSessionCookieName); err == nil && adminSessions.valid(adminCookie.Value) {
			next(w, r)
			return
		}

		cookie, err := r.Cookie(sessionCookieName)
		if err != nil {
			slog.Warn("campaign auth failed: no session cookie",
				"path", r.URL.Path,
				"method", r.Method,
				"remote", r.RemoteAddr,
			)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		sessionCampaignID, err := h.auth.ValidateToken(r.Context(), cookie.Value)
		if err != nil {
			slog.Warn("campaign auth failed: invalid session",
				"path", r.URL.Path,
				"method", r.Method,
				"remote", r.RemoteAddr,
			)
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
			slog.Warn("campaign auth failed: campaign mismatch",
				"session_campaign_id", sessionCampaignID,
				"resource_campaign_id", resourceCampaignID,
				"path", r.URL.Path,
				"remote", r.RemoteAddr,
			)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func resolveCampaignFromPath(r *http.Request) (int64, error) {
	return strconv.ParseInt(r.PathValue("id"), 10, 64)
}

func resolveCampaignIDFromQuery(r *http.Request) (int64, error) {
	return strconv.ParseInt(r.URL.Query().Get("campaignId"), 10, 64)
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
