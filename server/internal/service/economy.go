package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type EconomyService struct {
	currencies *repository.CurrencyRepository
	items      *repository.ItemRepository
	inventory  *repository.InventoryRepository
	shops      *repository.ShopRepository
}

func NewEconomyService(
	currencies *repository.CurrencyRepository,
	items *repository.ItemRepository,
	inventory *repository.InventoryRepository,
	shops *repository.ShopRepository,
) *EconomyService {
	return &EconomyService{currencies: currencies, items: items, inventory: inventory, shops: shops}
}

func (s *EconomyService) ListCurrencies(ctx context.Context, campaignID int64) ([]models.Currency, error) {
	return s.currencies.List(ctx, campaignID)
}

func (s *EconomyService) GetCurrency(ctx context.Context, id int64) (*models.Currency, error) {
	return s.currencies.GetByID(ctx, id)
}

func (s *EconomyService) CreateCurrency(ctx context.Context, c *models.Currency) error {
	return s.currencies.Create(ctx, c)
}

func (s *EconomyService) UpdateCurrency(ctx context.Context, id int64, c *models.Currency) error {
	return s.currencies.Update(ctx, id, c)
}

func (s *EconomyService) DeleteCurrency(ctx context.Context, id int64) error {
	return s.currencies.Delete(ctx, id)
}

func (s *EconomyService) ListItems(ctx context.Context, campaignID int64) ([]models.Item, error) {
	return s.items.List(ctx, campaignID)
}

func (s *EconomyService) GetItem(ctx context.Context, id int64) (*models.Item, error) {
	return s.items.GetByID(ctx, id)
}

func (s *EconomyService) CreateItem(ctx context.Context, it *models.Item) error {
	return s.items.Create(ctx, it)
}

func (s *EconomyService) UpdateItem(ctx context.Context, id int64, it *models.Item) error {
	return s.items.Update(ctx, id, it)
}

func (s *EconomyService) DeleteItem(ctx context.Context, id int64) error {
	return s.items.Delete(ctx, id)
}

func (s *EconomyService) ListInventory(ctx context.Context, kind string, ownerID int64) ([]models.InventoryEntry, error) {
	return s.inventory.List(ctx, kind, ownerID)
}

func (s *EconomyService) ListItemOwners(ctx context.Context, itemID int64) ([]models.ItemOwner, error) {
	return s.inventory.ListOwners(ctx, itemID)
}

func (s *EconomyService) SetInventory(ctx context.Context, kind string, ownerID, itemID, quantity int64, notes string) error {
	return s.inventory.Set(ctx, kind, ownerID, itemID, quantity, notes)
}

func (s *EconomyService) RemoveInventory(ctx context.Context, kind string, ownerID, itemID int64) error {
	return s.inventory.Remove(ctx, kind, ownerID, itemID)
}

func (s *EconomyService) ListShop(ctx context.Context, locationID int64) ([]models.ShopEntry, error) {
	return s.shops.List(ctx, locationID)
}

func (s *EconomyService) SetShop(ctx context.Context, locationID, itemID int64, notes string, prices []models.Price) error {
	return s.shops.Set(ctx, locationID, itemID, notes, prices)
}

func (s *EconomyService) RemoveShop(ctx context.Context, locationID, itemID int64) error {
	return s.shops.Remove(ctx, locationID, itemID)
}
