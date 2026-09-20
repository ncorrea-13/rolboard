package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func setupNPCTypeHandlers(t *testing.T) (*Handlers, *models.Campaign) {
	db := setupCampaignTestDB(t)
	c := &models.Campaign{Name: "Cosmere", System: "Cosmere RPG"}
	if err := repository.NewCampaignRepository(db).Create(context.Background(), c); err != nil {
		t.Fatalf("seed campaign: %v", err)
	}
	h := &Handlers{
		db:       db,
		npcs:     service.NewNPCService(repository.NewNPCRepository(db), t.TempDir()),
		npcTypes: service.NewNPCTypeService(repository.NewNPCTypeRepository(db)),
	}
	return h, c
}

func call(t *testing.T, fn http.HandlerFunc, method, id string, payload any) *httptest.ResponseRecorder {
	t.Helper()
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(method, "/x", bytes.NewReader(body))
	req.SetPathValue("id", id)
	rec := httptest.NewRecorder()
	fn(rec, req)
	return rec
}

func TestNPCTypeLifecycle(t *testing.T) {
	h, c := setupNPCTypeHandlers(t)
	cid := strconv.FormatInt(c.ID, 10)

	rec := call(t, h.ListNPCTypes, http.MethodGet, cid, nil)
	var types []models.NPCType
	if err := json.Unmarshal(rec.Body.Bytes(), &types); err != nil || len(types) != len(repository.DefaultNPCTypes) {
		t.Fatalf("expected %d default types, got %d (%v)", len(repository.DefaultNPCTypes), len(types), err)
	}

	rec = call(t, h.CreateNPCType, http.MethodPost, cid, NPCTypePayload{Label: "Monstruo Élite", Color: "#aa3344"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	var created models.NPCType
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if created.Key != "monstruo-elite" {
		t.Errorf("expected key monstruo-elite, got %q", created.Key)
	}
	rec = call(t, h.CreateNPCType, http.MethodPost, cid, NPCTypePayload{Label: "monstruo elite", Color: "#aa3344"})
	var dup models.NPCType
	_ = json.Unmarshal(rec.Body.Bytes(), &dup)
	if dup.Key != "monstruo-elite-2" {
		t.Errorf("expected key monstruo-elite-2, got %q", dup.Key)
	}

	if rec := call(t, h.CreateNPCType, http.MethodPost, cid, NPCTypePayload{Label: "", Color: "#aa3344"}); rec.Code != http.StatusBadRequest {
		t.Errorf("empty label expected 400, got %d", rec.Code)
	}
	if rec := call(t, h.CreateNPCType, http.MethodPost, cid, NPCTypePayload{Label: "X", Color: "red"}); rec.Code != http.StatusBadRequest {
		t.Errorf("bad color expected 400, got %d", rec.Code)
	}
	if rec := call(t, h.CreateNPCType, http.MethodPost, cid, NPCTypePayload{Label: "Referencia", Color: "#aa3344"}); rec.Code != http.StatusBadRequest {
		t.Errorf("reserved key expected 400, got %d", rec.Code)
	}

	tid := strconv.FormatInt(created.ID, 10)
	rec = call(t, h.UpdateNPCType, http.MethodPut, tid, NPCTypePayload{Label: "Jefe", Color: "#112233"})
	var updated models.NPCType
	_ = json.Unmarshal(rec.Body.Bytes(), &updated)
	if rec.Code != http.StatusOK || updated.Label != "Jefe" || updated.Key != "monstruo-elite" {
		t.Errorf("update wrong: %d %+v", rec.Code, updated)
	}

	npc := func(kind string) int {
		return call(t, h.CreateNPC, http.MethodPost, cid, CreateNPCPayload{Name: "N", NPCKind: kind, DetailLevel: "minor", Status: "vivo"}).Code
	}
	if code := npc("nope"); code != http.StatusBadRequest {
		t.Errorf("unknown kind expected 400, got %d", code)
	}
	if code := npc("monstruo-elite"); code != http.StatusCreated {
		t.Errorf("custom kind expected 201, got %d", code)
	}
	if code := npc("referencia"); code != http.StatusCreated {
		t.Errorf("referencia expected 201, got %d", code)
	}

	if rec := call(t, h.DeleteNPCType, http.MethodDelete, tid, nil); rec.Code != http.StatusConflict {
		t.Errorf("delete in use expected 409, got %d", rec.Code)
	}
	did := strconv.FormatInt(dup.ID, 10)
	if rec := call(t, h.DeleteNPCType, http.MethodDelete, did, nil); rec.Code != http.StatusNoContent {
		t.Errorf("delete unused expected 204, got %d", rec.Code)
	}
}
