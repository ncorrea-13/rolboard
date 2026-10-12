package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

const (
	maxCurrencyNameLen = 40
	maxCurrencySymbol  = 8
	maxItemNameLen     = 80
)

type CurrencyPayload struct {
	Name        string   `json:"name"`
	Symbol      string   `json:"symbol"`
	RateToBase  *float64 `json:"rate_to_base"`
	IsBase      bool     `json:"is_base"`
	LocationIDs []int64  `json:"location_ids"`
}

type ItemPayload struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Effect      string         `json:"effect"`
	Category    string         `json:"category"`
	Rarity      string         `json:"rarity"`
	Weight      *float64       `json:"weight"`
	Prices      []models.Price `json:"prices"`
}

func (h *Handlers) validatePrices(ctx context.Context, campaignID int64, prices []models.Price) ([]models.Price, string, bool) {
	seen := map[int64]bool{}
	clean := make([]models.Price, 0, len(prices))
	for _, p := range prices {
		if p.Amount < 0 {
			return nil, "Price amounts can't be negative", false
		}
		if seen[p.CurrencyID] {
			continue
		}
		seen[p.CurrencyID] = true
		c, err := h.economy.GetCurrency(ctx, p.CurrencyID)
		if err != nil || c.CampaignID != campaignID {
			return nil, "Currency not found in this campaign", false
		}
		clean = append(clean, p)
	}
	return clean, "", true
}

func (h *Handlers) ListCurrencies(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	currencies, err := h.economy.ListCurrencies(r.Context(), campaignID)
	if err != nil {
		internalError(w, err, "Error retrieving currencies")
		return
	}
	writeJSON(w, http.StatusOK, currencies)
}

func (h *Handlers) validateCurrency(ctx context.Context, campaignID int64, p CurrencyPayload) (string, bool) {
	name := strings.TrimSpace(p.Name)
	if name == "" || utf8.RuneCountInString(name) > maxCurrencyNameLen {
		return "Name must be 1-40 characters", false
	}
	if utf8.RuneCountInString(strings.TrimSpace(p.Symbol)) > maxCurrencySymbol {
		return "Symbol is too long", false
	}
	if p.RateToBase != nil && *p.RateToBase <= 0 {
		return "rate_to_base must be greater than zero", false
	}
	for _, id := range p.LocationIDs {
		if l, err := h.locations.GetByID(ctx, id); err != nil || l.CampaignID != campaignID {
			return "Location not found in this campaign", false
		}
	}
	return "", true
}

func currencyFromPayload(p CurrencyPayload) models.Currency {
	return models.Currency{
		Name: strings.TrimSpace(p.Name), Symbol: strings.TrimSpace(p.Symbol),
		RateToBase: p.RateToBase, IsBase: p.IsBase, LocationIDs: p.LocationIDs,
	}
}

func (h *Handlers) CreateCurrency(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	var payload CurrencyPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if msg, ok := h.validateCurrency(r.Context(), campaignID, payload); !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	c := currencyFromPayload(payload)
	c.CampaignID = campaignID
	if err := h.economy.CreateCurrency(r.Context(), &c); err != nil {
		internalError(w, err, "Error creating currency")
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (h *Handlers) UpdateCurrency(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	var payload CurrencyPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	current, err := h.economy.GetCurrency(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Currency not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving currency")
		return
	}
	if msg, ok := h.validateCurrency(r.Context(), current.CampaignID, payload); !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	c := currencyFromPayload(payload)
	err = h.economy.UpdateCurrency(r.Context(), id, &c)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Currency not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error updating currency")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *Handlers) DeleteCurrency(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	err = h.economy.DeleteCurrency(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Currency not found", http.StatusNotFound)
		return
	}
	if errors.Is(err, repository.ErrInUse) {
		apiError(w, http.StatusConflict, "currency_in_use")
		return
	}
	if err != nil {
		internalError(w, err, "Error deleting currency")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ListItems(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	items, err := h.economy.ListItems(r.Context(), campaignID)
	if err != nil {
		internalError(w, err, "Error retrieving items")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *Handlers) itemFromPayload(ctx context.Context, campaignID int64, p ItemPayload) (models.Item, string, bool) {
	name := strings.TrimSpace(p.Name)
	if name == "" || utf8.RuneCountInString(name) > maxItemNameLen {
		return models.Item{}, "Name must be 1-80 characters", false
	}
	if p.Weight != nil && *p.Weight < 0 {
		return models.Item{}, "weight can't be negative", false
	}
	prices, msg, ok := h.validatePrices(ctx, campaignID, p.Prices)
	if !ok {
		return models.Item{}, msg, false
	}
	return models.Item{
		Name: name, Description: p.Description, Effect: p.Effect,
		Category: strings.TrimSpace(p.Category), Rarity: strings.TrimSpace(p.Rarity),
		Weight: p.Weight, Prices: prices,
	}, "", true
}

func (h *Handlers) CreateItem(w http.ResponseWriter, r *http.Request) {
	campaignID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid campaign id", http.StatusBadRequest)
		return
	}
	var payload ItemPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	item, msg, ok := h.itemFromPayload(r.Context(), campaignID, payload)
	if !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	item.CampaignID = campaignID
	if err := h.economy.CreateItem(r.Context(), &item); err != nil {
		internalError(w, err, "Error creating item")
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *Handlers) GetItem(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	item, err := h.economy.GetItem(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving item")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handlers) UpdateItem(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	var payload ItemPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	current, err := h.economy.GetItem(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error retrieving item")
		return
	}
	item, msg, ok := h.itemFromPayload(r.Context(), current.CampaignID, payload)
	if !ok {
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	err = h.economy.UpdateItem(r.Context(), id, &item)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error updating item")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handlers) DeleteItem(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "Invalid id", http.StatusBadRequest)
		return
	}
	err = h.economy.DeleteItem(r.Context(), id)
	if errors.Is(err, repository.ErrNotFound) {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}
	if err != nil {
		internalError(w, err, "Error deleting item")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
