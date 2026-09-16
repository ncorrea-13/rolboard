package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/imagestore"
	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type CreateNPCPayload struct {
	Name         string          `json:"name"`
	NPCKind      string          `json:"npc_kind"`
	DetailLevel  string          `json:"detail_level"`
	Status       string          `json:"status"`
	LocationID   *int64          `json:"location_id"`
	Etnia        *string         `json:"etnia"`
	Rol          *string         `json:"rol"`
	TipoSpren    *string         `json:"tipo_spren"`
	Description  string          `json:"description"`
	Notes        string          `json:"notes"`
	Attributes   json.RawMessage `json:"attributes"`
	Skills       json.RawMessage `json:"skills"`
	ObsidianPath *string         `json:"obsidian_path"`
}

type UpdateNPCPayload struct {
	Name         string          `json:"name"`
	NPCKind      string          `json:"npc_kind"`
	DetailLevel  string          `json:"detail_level"`
	Status       string          `json:"status"`
	LocationID   *int64          `json:"location_id"`
	Etnia        *string         `json:"etnia"`
	Rol          *string         `json:"rol"`
	TipoSpren    *string         `json:"tipo_spren"`
	Description  string          `json:"description"`
	Notes        string          `json:"notes"`
	Attributes   json.RawMessage `json:"attributes"`
	Skills       json.RawMessage `json:"skills"`
	ObsidianPath *string         `json:"obsidian_path"`
}

var validNPCKinds = map[string]bool{
	"npc":               true,
	"spren":             true,
	"entidad-cognitiva": true,
	"referencia":        true,
}

var validNPCDetailLevels = map[string]bool{
	"full":  true,
	"minor": true,
}

var validNPCStatuses = map[string]bool{
	"vivo":         true,
	"muerto":       true,
	"desaparecido": true,
	"activo":       true,
	"consolidado":  true,
	"paused":       true,
}

func (h *Handlers) ListNPCs(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	npcs, err := h.npcs.List(r.Context(), campaignID)
	if err != nil {
		http.Error(w, "Error retrieving npcs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(npcs); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) CreateNPC(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}

	var payload CreateNPCPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Name == "" || !validNPCKinds[payload.NPCKind] || !validNPCDetailLevels[payload.DetailLevel] || !validNPCStatuses[payload.Status] {
		http.Error(w, "Name, npc_kind, detail_level and status are required fields", http.StatusBadRequest)
		return
	}
	if payload.LocationID != nil {
		loc, err := h.locations.GetByID(r.Context(), *payload.LocationID)
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, "Location not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "Error retrieving location", http.StatusInternalServerError)
			return
		}
		if loc.CampaignID != campaignID {
			http.Error(w, "Location does not belong to the same campaign as the NPC", http.StatusBadRequest)
			return
		}
	}

	npc := models.NPC{
		CampaignID:   campaignID,
		Name:         payload.Name,
		NPCKind:      payload.NPCKind,
		DetailLevel:  payload.DetailLevel,
		Status:       payload.Status,
		LocationID:   payload.LocationID,
		Etnia:        payload.Etnia,
		Rol:          payload.Rol,
		TipoSpren:    payload.TipoSpren,
		Description:  payload.Description,
		Notes:        payload.Notes,
		Attributes:   payload.Attributes,
		Skills:       payload.Skills,
		ObsidianPath: payload.ObsidianPath,
	}

	if err := h.npcs.Create(r.Context(), &npc); err != nil {
		internalError(w, err, "Error creating npc")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(npc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetNPC(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	npc, err := h.npcs.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "NPC not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error retrieving npc", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(npc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) UpdateNPC(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	var payload UpdateNPCPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if payload.Name == "" || !validNPCKinds[payload.NPCKind] || !validNPCDetailLevels[payload.DetailLevel] || !validNPCStatuses[payload.Status] {
		http.Error(w, "Name, npc_kind, detail_level and status are required fields", http.StatusBadRequest)
		return
	}
	if payload.LocationID != nil {
		current, err := h.npcs.GetByID(r.Context(), id)
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, "NPC not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "Error retrieving npc", http.StatusInternalServerError)
			return
		}
		loc, err := h.locations.GetByID(r.Context(), *payload.LocationID)
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, "Location not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "Error retrieving location", http.StatusInternalServerError)
			return
		}
		if loc.CampaignID != current.CampaignID {
			http.Error(w, "Location does not belong to the same campaign as the NPC", http.StatusBadRequest)
			return
		}
	}

	npc := models.NPC{
		Name:         payload.Name,
		NPCKind:      payload.NPCKind,
		DetailLevel:  payload.DetailLevel,
		Status:       payload.Status,
		LocationID:   payload.LocationID,
		Etnia:        payload.Etnia,
		Rol:          payload.Rol,
		TipoSpren:    payload.TipoSpren,
		Description:  payload.Description,
		Notes:        payload.Notes,
		Attributes:   payload.Attributes,
		Skills:       payload.Skills,
		ObsidianPath: payload.ObsidianPath,
	}
	err = h.npcs.Update(r.Context(), id, &npc)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "NPC not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error updating npc", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(npc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteNPC(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	err = h.npcs.Delete(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "NPC not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Error deleting npc", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) SetNPCImage(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}

	data, ok := readUploadedImage(w, r)
	if !ok {
		return
	}

	npc, err := h.npcs.SetImage(r.Context(), id, data)
	switch {
	case errors.Is(err, imagestore.ErrUnsupportedFormat):
		http.Error(w, "Unsupported image format: use PNG or JPEG", http.StatusBadRequest)
		return
	case errors.Is(err, repository.ErrNotFound):
		http.Error(w, "NPC not found", http.StatusNotFound)
		return
	case err != nil:
		log.Printf("SetNPCImage: %v", err)
		http.Error(w, "Error saving image", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(npc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) DeleteNPCImage(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	npc, err := h.npcs.DeleteImage(r.Context(), id)
	switch {
	case errors.Is(err, repository.ErrNotFound):
		http.Error(w, "NPC not found", http.StatusNotFound)
		return
	case err != nil:
		http.Error(w, "Error deleting image", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(npc); err != nil {
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func (h *Handlers) GetNPCImage(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	absPath, contentType, err := h.npcs.ImageFile(r.Context(), id)
	switch {
	case errors.Is(err, repository.ErrNotFound):
		http.Error(w, "Image not found", http.StatusNotFound)
		return
	case err != nil:
		http.Error(w, "Error retrieving image", http.StatusInternalServerError)
		return
	}

	serveImage(w, r, absPath, contentType)
}
