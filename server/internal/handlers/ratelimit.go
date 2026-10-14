package handlers

import (
	"net"
	"net/http"
	"sync"
	"time"
)

type rateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	limit    int
	window   time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{attempts: make(map[string][]time.Time), limit: limit, window: window}
}

func (rl *rateLimiter) recent(key string, now time.Time) []time.Time {
	cutoff := now.Add(-rl.window)
	kept := rl.attempts[key][:0]
	for _, t := range rl.attempts[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) == 0 {
		delete(rl.attempts, key)
		return nil
	}
	rl.attempts[key] = kept
	return kept
}

func (rl *rateLimiter) allow(key string) bool {
	now := time.Now()
	rl.mu.Lock()
	defer rl.mu.Unlock()

	kept := rl.recent(key, now)
	if len(kept) >= rl.limit {
		return false
	}
	rl.attempts[key] = append(kept, now)
	return true
}

func (rl *rateLimiter) blocked(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	return len(rl.recent(key, time.Now())) >= rl.limit
}

func (rl *rateLimiter) fail(key string) {
	now := time.Now()
	rl.mu.Lock()
	defer rl.mu.Unlock()
	rl.attempts[key] = append(rl.recent(key, now), now)
}

func clientIP(r *http.Request, trustProxyHeaders bool) string {
	if trustProxyHeaders {
		if ip := r.Header.Get("CF-Connecting-IP"); ip != "" {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (h *Handlers) rateLimit(rl *rateLimiter, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !rl.allow(clientIP(r, h.trustProxyHeaders)) {
			http.Error(w, "Too many attempts, try again later", http.StatusTooManyRequests)
			return
		}
		next(w, r)
	}
}

func (h *Handlers) rateLimitFailures(rl *rateLimiter, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r, h.trustProxyHeaders)
		if rl.blocked(key) {
			http.Error(w, "Too many attempts, try again later", http.StatusTooManyRequests)
			return
		}
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next(rec, r)
		if rec.status == http.StatusUnauthorized {
			rl.fail(key)
		}
	}
}
