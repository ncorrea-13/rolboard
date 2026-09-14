package handlers

import (
	"testing"
	"time"
)

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
