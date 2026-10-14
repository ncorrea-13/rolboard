package handlers

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func TestClientIPIgnoresHeaderByDefault(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/campaigns/1/login", nil)
	req.RemoteAddr = "203.0.113.9:54321"
	req.Header.Set("CF-Connecting-IP", "1.1.1.1")

	if got := clientIP(req, false); got != "203.0.113.9" {
		t.Errorf("expected RemoteAddr to win when trustProxyHeaders is false, got %q", got)
	}
}

func TestClientIPTrustsHeaderWhenEnabled(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/campaigns/1/login", nil)
	req.RemoteAddr = "203.0.113.9:54321"
	req.Header.Set("CF-Connecting-IP", "1.1.1.1")

	if got := clientIP(req, true); got != "1.1.1.1" {
		t.Errorf("expected CF-Connecting-IP to win when trustProxyHeaders is true, got %q", got)
	}
}

func TestClientIPFallsBackToRemoteAddrWhenHeaderMissing(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/campaigns/1/login", nil)
	req.RemoteAddr = "203.0.113.9:54321"

	if got := clientIP(req, true); got != "203.0.113.9" {
		t.Errorf("expected RemoteAddr when header absent even if trusted, got %q", got)
	}
}

func TestClientIPHandlesIPv6RemoteAddr(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/campaigns/1/login", nil)
	req.RemoteAddr = "[2001:db8::1]:54321"

	if got := clientIP(req, false); got != "2001:db8::1" {
		t.Errorf("expected bare IPv6 address, got %q", got)
	}
}

func TestRateLimiterAllowsUpToLimit(t *testing.T) {
	rl := newRateLimiter(3, time.Minute)
	for i := 0; i < 3; i++ {
		if !rl.allow("1.2.3.4") {
			t.Fatalf("attempt %d: expected allowed", i)
		}
	}
	if rl.allow("1.2.3.4") {
		t.Fatal("expected 4th attempt to be blocked")
	}
}

func TestRateLimiterIsPerKey(t *testing.T) {
	rl := newRateLimiter(1, time.Minute)
	if !rl.allow("1.2.3.4") {
		t.Fatal("expected first attempt for key A to be allowed")
	}
	if !rl.allow("5.6.7.8") {
		t.Fatal("expected first attempt for key B to be allowed independently")
	}
	if rl.allow("1.2.3.4") {
		t.Fatal("expected second attempt for key A to be blocked")
	}
}

func TestRateLimiterResetsAfterWindow(t *testing.T) {
	rl := newRateLimiter(1, 10*time.Millisecond)
	if !rl.allow("1.2.3.4") {
		t.Fatal("expected first attempt to be allowed")
	}
	time.Sleep(20 * time.Millisecond)
	if !rl.allow("1.2.3.4") {
		t.Fatal("expected attempt after window to be allowed again")
	}
}

func TestRateLimitFailuresOnlyCountsUnauthorized(t *testing.T) {
	h := &Handlers{}
	rl := newRateLimiter(2, time.Minute)
	status := http.StatusNoContent
	handler := h.rateLimitFailures(rl, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
	})
	call := func() int {
		req := httptest.NewRequest(http.MethodPost, "/api/admin/login", nil)
		req.RemoteAddr = "203.0.113.9:1"
		rec := httptest.NewRecorder()
		handler(rec, req)
		return rec.Code
	}

	for i := 0; i < 5; i++ {
		if got := call(); got != http.StatusNoContent {
			t.Fatalf("successful attempt %d: expected 204, got %d", i, got)
		}
	}
	status = http.StatusUnauthorized
	call()
	call()
	if got := call(); got != http.StatusTooManyRequests {
		t.Fatalf("expected 429 after 2 failures, got %d", got)
	}
}

func TestRateLimiterPurgesIdleKeys(t *testing.T) {
	rl := newRateLimiter(1, 10*time.Millisecond)
	rl.allow("1.2.3.4")
	time.Sleep(20 * time.Millisecond)
	rl.allow("5.6.7.8")
	if _, ok := rl.attempts["1.2.3.4"]; ok {
		t.Fatal("expected idle key to be removed")
	}
}

func TestRateLimitFailuresCountsConcurrentAttempts(t *testing.T) {
	h := &Handlers{}
	rl := newRateLimiter(3, time.Minute)
	release := make(chan struct{})
	handler := h.rateLimitFailures(rl, func(w http.ResponseWriter, r *http.Request) {
		<-release
		w.WriteHeader(http.StatusUnauthorized)
	})

	var wg sync.WaitGroup
	codes := make(chan int, 10)
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := httptest.NewRequest(http.MethodPost, "/api/admin/login", nil)
			req.RemoteAddr = "203.0.113.9:1"
			rec := httptest.NewRecorder()
			handler(rec, req)
			codes <- rec.Code
		}()
	}
	time.Sleep(50 * time.Millisecond)
	close(release)
	wg.Wait()
	close(codes)

	passed := 0
	for c := range codes {
		if c == http.StatusUnauthorized {
			passed++
		}
	}
	if passed != 3 {
		t.Fatalf("expected exactly 3 attempts to reach the handler, got %d", passed)
	}
}
