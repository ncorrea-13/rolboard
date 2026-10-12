package handlers

import (
	"context"
	"net/http"
	"strconv"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func TestItemRejectsForeignCurrencyAndNegativePrice(t *testing.T) {
	db := setupCampaignTestDB(t)
	ctx := context.Background()
	campaigns := repository.NewCampaignRepository(db)
	a := &models.Campaign{Name: "A", System: "x"}
	b := &models.Campaign{Name: "B", System: "x"}
	for _, c := range []*models.Campaign{a, b} {
		if err := campaigns.Create(ctx, c); err != nil {
			t.Fatalf("seed campaign: %v", err)
		}
	}
	currencyRepo := repository.NewCurrencyRepository(db)
	h := &Handlers{
		db: db,
		economy: service.NewEconomyService(
			currencyRepo, repository.NewItemRepository(db),
			repository.NewInventoryRepository(db), repository.NewShopRepository(db)),
	}
	foreign := &models.Currency{CampaignID: b.ID, Name: "Ajena"}
	own := &models.Currency{CampaignID: a.ID, Name: "Propia"}
	for _, c := range []*models.Currency{foreign, own} {
		if err := currencyRepo.Create(ctx, c); err != nil {
			t.Fatalf("seed currency: %v", err)
		}
	}
	aID := strconv.FormatInt(a.ID, 10)

	rec := call(t, h.CreateItem, http.MethodPost, aID, ItemPayload{Name: "X", Prices: []models.Price{{CurrencyID: foreign.ID, Amount: 1}}})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("foreign currency expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	rec = call(t, h.CreateItem, http.MethodPost, aID, ItemPayload{Name: "X", Prices: []models.Price{{CurrencyID: own.ID, Amount: -1}}})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("negative price expected 400, got %d", rec.Code)
	}
	rec = call(t, h.CreateItem, http.MethodPost, aID, ItemPayload{Name: "Espada", Prices: []models.Price{{CurrencyID: own.ID, Amount: 5}, {CurrencyID: own.ID, Amount: 9}}})
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	rec = call(t, h.CreateCurrency, http.MethodPost, aID, CurrencyPayload{Name: "Mala", RateToBase: ptrFloat(0)})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("zero rate expected 400, got %d", rec.Code)
	}
}

func ptrFloat(v float64) *float64 { return &v }
