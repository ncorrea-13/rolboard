package handlers

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func validPNGBytes(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.White)
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	return buf.Bytes()
}

func multipartImageRequest(t *testing.T, method, url string, data []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile("file", "upload.png")
	if err != nil {
		t.Fatalf("CreateFormFile: %v", err)
	}
	if _, err := part.Write(data); err != nil {
		t.Fatalf("write part: %v", err)
	}
	if err := w.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}
	req := httptest.NewRequest(method, url, &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func TestNPCImageUploadFetchDelete(t *testing.T) {
	db := setupCampaignTestDB(t)
	uploadsRoot := t.TempDir()
	npcRepo := repository.NewNPCRepository(db)
	npcSvc := service.NewNPCService(npcRepo, uploadsRoot)
	h := &Handlers{npcs: npcSvc}

	campaignRepo := repository.NewCampaignRepository(db)
	campaign := &models.Campaign{Name: "Test", System: "Cosmere RPG"}
	if err := campaignRepo.Create(context.Background(), campaign); err != nil {
		t.Fatalf("seed campaign: %v", err)
	}
	npc := &models.NPC{CampaignID: campaign.ID, Name: "Jasnah", NPCKind: "npc", DetailLevel: "minor", Status: "vivo"}
	if err := npcRepo.Create(context.Background(), npc); err != nil {
		t.Fatalf("seed npc: %v", err)
	}

	req := multipartImageRequest(t, http.MethodPost, "/api/npcs/1/image", []byte("not an image"))
	req.SetPathValue("id", strconv.FormatInt(npc.ID, 10))
	rec := httptest.NewRecorder()
	h.SetNPCImage(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for unsupported format, got %d: %s", rec.Code, rec.Body.String())
	}

	req = multipartImageRequest(t, http.MethodPost, "/api/npcs/1/image", validPNGBytes(t))
	req.SetPathValue("id", strconv.FormatInt(npc.ID, 10))
	rec = httptest.NewRecorder()
	h.SetNPCImage(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/npcs/1/image", nil)
	getReq.SetPathValue("id", strconv.FormatInt(npc.ID, 10))
	getRec := httptest.NewRecorder()
	h.GetNPCImage(getRec, getReq)
	if getRec.Code != http.StatusOK {
		t.Fatalf("expected 200 fetching image, got %d", getRec.Code)
	}
	if ct := getRec.Header().Get("Content-Type"); ct != "image/png" {
		t.Errorf("expected Content-Type image/png, got %q", ct)
	}
	if getRec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Error("expected X-Content-Type-Options: nosniff")
	}

	delReq := httptest.NewRequest(http.MethodDelete, "/api/npcs/1/image", nil)
	delReq.SetPathValue("id", strconv.FormatInt(npc.ID, 10))
	delRec := httptest.NewRecorder()
	h.DeleteNPCImage(delRec, delReq)
	if delRec.Code != http.StatusOK {
		t.Fatalf("expected 200 deleting image, got %d: %s", delRec.Code, delRec.Body.String())
	}

	getReq2 := httptest.NewRequest(http.MethodGet, "/api/npcs/1/image", nil)
	getReq2.SetPathValue("id", strconv.FormatInt(npc.ID, 10))
	getRec2 := httptest.NewRecorder()
	h.GetNPCImage(getRec2, getReq2)
	if getRec2.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", getRec2.Code)
	}
}
