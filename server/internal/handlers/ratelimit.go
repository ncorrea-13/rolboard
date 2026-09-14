package handlers

import (
	"net/http"
	"strings"
	"sync"
	"time"
)

// rateLimiter is a per-key sliding-window counter, used to slow down brute
// force attempts on the login/admin-token screens. Keyed by client IP.
type rateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	limit    int
	window   time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{attempts: make(map[string][]time.Time), limit: limit, window: window}
}

func (rl *rateLimiter) allow(key string) bool {
	now := time.Now()
	rl.mu.Lock()
	defer rl.mu.Unlock()

	cutoff := now.Add(-rl.window)
	kept := rl.attempts[key][:0]
	for _, t := range rl.attempts[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= rl.limit {
		rl.attempts[key] = kept
		return false
	}
	rl.attempts[key] = append(kept, now)
	return true
}

// clientIP prefers the IP Cloudflare reports for the real client, since the
// app sits behind a Cloudflare Tunnel and otherwise only sees tunnel/proxy
// addresses — see docs/DECISIONS.md.
func clientIP(r *http.Request) string {
	if ip := r.Header.Get("CF-Connecting-IP"); ip != "" {
		return ip
	}
	if ip, _, ok := strings.Cut(r.RemoteAddr, ":"); ok {
		return ip
	}
	return r.RemoteAddr
}

func (h *Handlers) rateLimit(rl *rateLimiter, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !rl.allow(clientIP(r)) {
			http.Error(w, "Too many attempts, try again later", http.StatusTooManyRequests)
			return
		}
		next(w, r)
	}
}
