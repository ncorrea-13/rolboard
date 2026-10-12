package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

func TestCurrencyBaseIsExclusiveAndInUseBlocksDelete(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	currencies := NewCurrencyRepository(db)
	items := NewItemRepository(db)

	rate := 0.1
	gold := &models.Currency{CampaignID: campaignID, Name: "Esfera", Symbol: "E", IsBase: true}
	silver := &models.Currency{CampaignID: campaignID, Name: "Marco", Symbol: "M", RateToBase: &rate}
	for _, c := range []*models.Currency{gold, silver} {
		if err := currencies.Create(ctx, c); err != nil {
			t.Fatalf("Create currency failed: %v", err)
		}
	}

	// Making the second one the base must move the flag, not collide with the unique index.
	silver.IsBase = true
	silver.RateToBase = nil
	if err := currencies.Update(ctx, silver.ID, silver); err != nil {
		t.Fatalf("Update currency failed: %v", err)
	}
	list, err := currencies.List(ctx, campaignID)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	bases := 0
	for _, c := range list {
		if c.IsBase {
			bases++
			if c.ID != silver.ID {
				t.Fatalf("Expected %d to be the base, got %d", silver.ID, c.ID)
			}
		}
	}
	if bases != 1 {
		t.Fatalf("Expected exactly one base currency, got %d", bases)
	}

	item := &models.Item{CampaignID: campaignID, Name: "Espada", Prices: []models.Price{{CurrencyID: gold.ID, Amount: 5}, {CurrencyID: silver.ID, Amount: 50}}}
	if err := items.Create(ctx, item); err != nil {
		t.Fatalf("Create item failed: %v", err)
	}
	if len(item.Prices) != 2 {
		t.Fatalf("Expected 2 prices, got %+v", item.Prices)
	}
	if err := currencies.Delete(ctx, gold.ID); !errors.Is(err, ErrInUse) {
		t.Fatalf("Expected ErrInUse for a priced currency, got %v", err)
	}

	item.Prices = []models.Price{{CurrencyID: silver.ID, Amount: 7}}
	if err := items.Update(ctx, item.ID, item); err != nil {
		t.Fatalf("Update item failed: %v", err)
	}
	got, _ := items.GetByID(ctx, item.ID)
	if len(got.Prices) != 1 || got.Prices[0].Amount != 7 {
		t.Fatalf("Expected prices replaced, got %+v", got.Prices)
	}
	if err := currencies.Delete(ctx, gold.ID); err != nil {
		t.Fatalf("Delete unused currency failed: %v", err)
	}
}

func TestInventoryAndShopUpsert(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()
	campaignID := createTestCampaign(t, ctx, NewCampaignRepository(db))
	items := NewItemRepository(db)
	inventory := NewInventoryRepository(db)
	shops := NewShopRepository(db)
	currencies := NewCurrencyRepository(db)

	pc := &models.PlayerCharacter{CampaignID: campaignID, PlayerName: "P", CharacterName: "Kael", Status: "activo"}
	if err := NewPlayerCharacterRepository(db).Create(ctx, pc); err != nil {
		t.Fatalf("Create pc failed: %v", err)
	}
	loc := &models.Location{CampaignID: campaignID, Name: "Mercado", LocationType: "city"}
	if err := NewLocationRepository(db).Create(ctx, loc); err != nil {
		t.Fatalf("Create location failed: %v", err)
	}
	cur := &models.Currency{CampaignID: campaignID, Name: "Esfera", IsBase: true}
	if err := currencies.Create(ctx, cur); err != nil {
		t.Fatalf("Create currency failed: %v", err)
	}
	item := &models.Item{CampaignID: campaignID, Name: "Poción"}
	if err := items.Create(ctx, item); err != nil {
		t.Fatalf("Create item failed: %v", err)
	}

	if err := inventory.Set(ctx, "pc", pc.ID, item.ID, 2, ""); err != nil {
		t.Fatalf("Set inventory failed: %v", err)
	}
	if err := inventory.Set(ctx, "pc", pc.ID, item.ID, 5, "en el cinturón"); err != nil {
		t.Fatalf("Set inventory failed: %v", err)
	}
	inv, err := inventory.List(ctx, "pc", pc.ID)
	if err != nil || len(inv) != 1 || inv[0].Quantity != 5 || inv[0].Notes != "en el cinturón" {
		t.Fatalf("Unexpected inventory: %+v (%v)", inv, err)
	}
	if _, err := inventory.List(ctx, "bad", pc.ID); !errors.Is(err, ErrUnknownOwnerKind) {
		t.Fatalf("Expected ErrUnknownOwnerKind, got %v", err)
	}

	if err := shops.Set(ctx, loc.ID, item.ID, "stock limitado", []models.Price{{CurrencyID: cur.ID, Amount: 12}}); err != nil {
		t.Fatalf("Set shop failed: %v", err)
	}
	shop, err := shops.List(ctx, loc.ID)
	if err != nil || len(shop) != 1 || len(shop[0].Prices) != 1 || shop[0].Prices[0].Amount != 12 {
		t.Fatalf("Unexpected shop: %+v (%v)", shop, err)
	}
	if err := shops.Remove(ctx, loc.ID, item.ID); err != nil {
		t.Fatalf("Remove shop failed: %v", err)
	}
	shop, _ = shops.List(ctx, loc.ID)
	if len(shop) != 0 {
		t.Fatalf("Expected empty shop, got %+v", shop)
	}
}
