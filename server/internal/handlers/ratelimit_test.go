package handlers

import (
	"net/http"
	"net/http/httptest"
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
