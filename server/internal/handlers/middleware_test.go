package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func TestRequireCampaignPerCampaignCookies(t *testing.T) {
	db := setupCampaignTestDB(t)
	ctx := context.Background()

	campaignRepo := repository.NewCampaignRepository(db)
	auth := service.NewAuthService(campaignRepo, repository.NewAuthSessionRepository(db))
	h := &Handlers{db: db, auth: auth}

	login := func(name string) (int64, *http.Cookie) {
		c := &models.Campaign{Name: name, System: "Cosmere RPG"}
		if err := campaignRepo.Create(ctx, c); err != nil {
			t.Fatalf("seed campaign %s: %v", name, err)
		}
		if err := auth.SetAccessCode(ctx, c.ID, "code-"+name); err != nil {
			t.Fatalf("set access code %s: %v", name, err)
		}
		token, _, err := auth.Login(ctx, c.ID, "code-"+name)
		if err != nil {
			t.Fatalf("login %s: %v", name, err)
		}
		return c.ID, &http.Cookie{Name: sessionCookieFor(c.ID), Value: token}
	}
	idA, cookieA := login("A")
	idB, cookieB := login("B")

	locRepo := repository.NewLocationRepository(db)
	locB := &models.Location{CampaignID: idB, Name: "Elsewhere", LocationType: "city"}
	if err := locRepo.Create(ctx, locB); err != nil {
		t.Fatalf("seed location B: %v", err)
	}

	ok := func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }
	byPath := h.requireCampaign(resolveCampaignFromPath, ok)
	byTable := h.requireCampaign(h.resolveViaTable("locations"), ok)

	do := func(handler http.HandlerFunc, id int64, cookies ...*http.Cookie) int {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.SetPathValue("id", strconv.FormatInt(id, 10))
		for _, c := range cookies {
			req.AddCookie(c)
		}
		rec := httptest.NewRecorder()
		handler(rec, req)
		return rec.Code
	}

	cases := []struct {
		name    string
		handler http.HandlerFunc
		id      int64
		cookies []*http.Cookie
		want    int
	}{
		{"own campaign", byPath, idA, []*http.Cookie{cookieA}, http.StatusNoContent},
		{"both sessions coexist A", byPath, idA, []*http.Cookie{cookieA, cookieB}, http.StatusNoContent},
		{"both sessions coexist B", byPath, idB, []*http.Cookie{cookieA, cookieB}, http.StatusNoContent},
		{"other campaign", byPath, idB, []*http.Cookie{cookieA}, http.StatusUnauthorized},
		{"cookie renamed to other campaign", byPath, idB, []*http.Cookie{{Name: sessionCookieFor(idB), Value: cookieA.Value}}, http.StatusUnauthorized},
		{"no cookie", byPath, idA, nil, http.StatusUnauthorized},
		{"entity of other campaign", byTable, locB.ID, []*http.Cookie{cookieA}, http.StatusUnauthorized},
		{"entity of own campaign", byTable, locB.ID, []*http.Cookie{cookieB}, http.StatusNoContent},
		{"missing entity without session", byTable, 9999, nil, http.StatusUnauthorized},
		{"missing entity with session", byTable, 9999, []*http.Cookie{cookieA}, http.StatusNotFound},
	}
	for _, tc := range cases {
		if got := do(tc.handler, tc.id, tc.cookies...); got != tc.want {
			t.Errorf("%s: got %d, want %d", tc.name, got, tc.want)
		}
	}
}

func TestRequireAdminLocalMode(t *testing.T) {
	ok := func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }
	for _, tc := range []struct {
		local bool
		want  int
	}{{true, http.StatusOK}, {false, http.StatusUnauthorized}} {
		h := &Handlers{localMode: tc.local}
		rec := httptest.NewRecorder()
		h.requireAdmin(ok)(rec, httptest.NewRequest("GET", "/api/admin/session", nil))
		if rec.Code != tc.want {
			t.Errorf("localMode=%v: got %d, want %d", tc.local, rec.Code, tc.want)
		}
	}
}
