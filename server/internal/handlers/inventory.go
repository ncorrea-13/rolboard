package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type InventoryPayload struct {
	Quantity int64  `json:"quantity"`
	Notes    string `json:"notes"`
}

type ShopPayload struct {
	Notes  string         `json:"notes"`
	Prices []models.Price `json:"prices"`
}

func (h *Handlers) ownerCampaign(r *http.Request, kind string, ownerID int64) (int64, error) {
	switch kind {
	case "pc":
		pc, err := h.playerCharacters.GetByID(r.Context(), ownerID)
		if err != nil {
			return 0, err
		}
		return pc.CampaignID, nil
	case "npc":
		npc, err := h.npcs.GetByID(r.Context(), ownerID)
		if err != nil {
			return 0, err
		}
		return npc.CampaignID, nil
	}
	return 0, repository.ErrUnknownOwnerKind
}

func (h *Handlers) inventoryHandlers(kind string) (list, set, remove http.HandlerFunc) {
	list = func(w http.ResponseWriter, r *http.Request) {
		ownerID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			http.Error(w, "Invalid id", http.StatusBadRequest)
			return
		}
		entries, err := h.economy.ListInventory(r.Context(), kind, ownerID)
		if err != nil {
			internalError(w, err, "Error retrieving inventory")
			return
		}
		writeJSON(w, http.StatusOK, entries)
	}
	set = func(w http.ResponseWriter, r *http.Request) {
		ownerID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			http.Error(w, "Invalid id", http.StatusBadRequest)
			return
		}
		itemID, err := strconv.ParseInt(r.PathValue("itemId"), 10, 64)
		if err != nil {
			http.Error(w, "Invalid item id", http.StatusBadRequest)
			return
		}
		var payload InventoryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if payload.Quantity < 1 {
			http.Error(w, "quantity must be at least 1", http.StatusBadRequest)
			return
		}
		campaignID, err := h.ownerCampaign(r, kind, ownerID)
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, "Owner not found", http.StatusNotFound)
			return
		}
		if err != nil {
			internalError(w, err, "Error retrieving owner")
			return
		}
		item, err := h.economy.GetItem(r.Context(), itemID)
		if errors.Is(err, repository.ErrNotFound) || (err == nil && item.CampaignID != campaignID) {
			http.Error(w, "Item not found in this campaign", http.StatusBadRequest)
			return
		}
		if err != nil {
			internalError(w, err, "Error retrieving item")
			return
		}
		if err := h.economy.SetInventory(r.Context(), kind, ownerID, itemID, payload.Quantity, payload.Notes); err != nil {
			internalError(w, err, "Error updating inventory")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
	remove = func(w http.ResponseWriter, r *http.Request) {
		ownerID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil {
			http.Error(w, "Invalid id", http.StatusBadRequest)
			return
		}
		itemID, err := strconv.ParseInt(r.PathValue("itemId"), 10, 64)
		if err != nil {
			http.Error(w, "Invalid item id", http.StatusBadRequest)
			return
		}
		if err := h.economy.RemoveInventory(r.Context(), kind, ownerID, itemID); err != nil {
			internalError(w, err, "Error updating inventory")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
	return list, set, remove
}

func (h *Handlers) ListShop(w http.ResponseWriter, r *http.Request) {
	locationID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid location id", http.StatusBadRequest)
		return
	}
	entries, err := h.economy.ListShop(r.Context(), locationID)
	if err != nil {
		internalError(w, err, "Error retrieving shop")
		return
	}
	writeJSON(w, http.StatusOK, entries)
}

func (h *Handlers) SetShopItem(w http.ResponseWriter, r *http.Request) {
	locationID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid location id", http.StatusBadRequest)
		return
	}
	itemID, err := strconv.ParseInt(r.PathValue("itemId"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid item id", http.StatusBadRequest)
		return
	}
	var payload ShopPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	location, err := h.locations.GetByID(r.Context(), locationID)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Location not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving location")
		return
	}
	item, err := h.economy.GetItem(r.Context(), itemID)
	if errors.Is(err, repository.ErrNotFound) || (err == nil && item.CampaignID != location.CampaignID) {
		http.Error(w, "Item not found in this campaign", http.StatusBadRequest)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving item")
		return
	}
	prices, msg, ok := h.validatePrices(r.Context(), location.CampaignID, payload.Prices)
	if !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	if err := h.economy.SetShop(r.Context(), locationID, itemID, payload.Notes, prices); err != nil {
		internalError(w, err, "Error updating shop")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) RemoveShopItem(w http.ResponseWriter, r *http.Request) {
	locationID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid location id", http.StatusBadRequest)
		return
	}
	itemID, err := strconv.ParseInt(r.PathValue("itemId"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid item id", http.StatusBadRequest)
		return
	}
	if err := h.economy.RemoveShop(r.Context(), locationID, itemID); err != nil {
		internalError(w, err, "Error updating shop")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
