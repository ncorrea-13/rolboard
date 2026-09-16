package handlers

import (
	"errors"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestInternalErrorDoesNotLeakRawError(t *testing.T) {
	rec := httptest.NewRecorder()
	rawErr := errors.New(`SQLITE_CONSTRAINT: UNIQUE constraint failed: npcs.campaign_id, npcs.obsidian_path`)

	internalError(rec, rawErr, "Error creating npc")

	if rec.Code != 500 {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
	body := rec.Body.String()
	if strings.Contains(body, "SQLITE_CONSTRAINT") || strings.Contains(body, "npcs.obsidian_path") {
		t.Errorf("response body leaked the raw error: %q", body)
	}
	if !strings.Contains(body, "Error creating npc") {
		t.Errorf("expected generic message in body, got %q", body)
	}
}
