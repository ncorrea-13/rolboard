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
	swept    time.Time
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

func (rl *rateLimiter) reserve(key string) (time.Time, bool) {
	now := time.Now()
	rl.mu.Lock()
	defer rl.mu.Unlock()

	if now.Sub(rl.swept) >= rl.window {
		for k := range rl.attempts {
			rl.recent(k, now)
		}
		rl.swept = now
	}

	kept := rl.recent(key, now)
	if len(kept) >= rl.limit {
		return time.Time{}, false
	}
	rl.attempts[key] = append(kept, now)
	return now, true
}

func (rl *rateLimiter) allow(key string) bool {
	_, ok := rl.reserve(key)
	return ok
}

func (rl *rateLimiter) release(key string, at time.Time) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	attempts := rl.attempts[key]
	for i, t := range attempts {
		if t.Equal(at) {
			rl.attempts[key] = append(attempts[:i], attempts[i+1:]...)
			break
		}
	}
	if len(rl.attempts[key]) == 0 {
		delete(rl.attempts, key)
	}
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
		at, ok := rl.reserve(key)
		if !ok {
			http.Error(w, "Too many attempts, try again later", http.StatusTooManyRequests)
			return
		}
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next(rec, r)
		if rec.status != http.StatusUnauthorized {
			rl.release(key, at)
		}
	}
}
