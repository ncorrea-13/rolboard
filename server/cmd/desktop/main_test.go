package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOpenURLRejectsNonHTTPS(t *testing.T) {
	d := &desktopApp{}
	for _, body := range []string{
		`{"url":"file:///etc/passwd"}`,
		`{"url":"javascript:alert(1)"}`,
		`{"url":"http://example.com"}`,
		`{"url":"https://"}`,
		`not json`,
	} {
		rec := httptest.NewRecorder()
		d.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/desktop/open", strings.NewReader(body)))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: got %d, want 400", body, rec.Code)
		}
	}
}

func TestSaveExportRejectsBadCampaignID(t *testing.T) {
	d := &desktopApp{}
	for _, body := range []string{`{"campaignId":"../admin"}`, `{"campaignId":""}`, `{"campaignId":"1/export?x"}`, `not json`} {
		rec := httptest.NewRecorder()
		d.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/desktop/save-export", strings.NewReader(body)))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: got %d, want 400", body, rec.Code)
		}
	}
}
