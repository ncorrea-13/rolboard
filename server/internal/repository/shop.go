package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type ShopRepository struct {
	db *sql.DB
}

func NewShopRepository(db *sql.DB) *ShopRepository {
	return &ShopRepository{db: db}
}

func (r *ShopRepository) List(ctx context.Context, locationID int64) ([]models.ShopEntry, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT i.id, i.name, li.notes
		FROM location_items li
		JOIN items i ON i.id = li.item_id AND i.deleted_at IS NULL
		WHERE li.location_id = ?
		ORDER BY i.name`, locationID)
	if err != nil {
		return nil, err
	}
	entries := []models.ShopEntry{}
	for rows.Next() {
		var e models.ShopEntry
		if err := rows.Scan(&e.ItemID, &e.Name, &e.Notes); err != nil {
			_ = rows.Close()
			return nil, err
		}
		e.Prices = []models.Price{}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		_ = rows.Close()
		return nil, err
	}
	_ = rows.Close()

	priceRows, err := r.db.QueryContext(ctx, `
		SELECT lp.item_id, lp.currency_id, lp.amount
		FROM location_item_prices lp
		JOIN currencies c ON c.id = lp.currency_id AND c.deleted_at IS NULL
		WHERE lp.location_id = ?
		ORDER BY c.is_base DESC, c.name`, locationID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = priceRows.Close() }()

	byItem := map[int64][]models.Price{}
	for priceRows.Next() {
		var itemID int64
		var p models.Price
		if err := priceRows.Scan(&itemID, &p.CurrencyID, &p.Amount); err != nil {
			return nil, err
		}
		byItem[itemID] = append(byItem[itemID], p)
	}
	if err := priceRows.Err(); err != nil {
		return nil, err
	}
	for i := range entries {
		if p, ok := byItem[entries[i].ItemID]; ok {
			entries[i].Prices = p
		}
	}
	return entries, nil
}

func (r *ShopRepository) Set(ctx context.Context, locationID, itemID int64, notes string, prices []models.Price) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO location_items (location_id, item_id, notes) VALUES (?, ?, ?)
		ON CONFLICT (location_id, item_id) DO UPDATE SET notes = excluded.notes`,
		locationID, itemID, notes,
	); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx,
		`DELETE FROM location_item_prices WHERE location_id = ? AND item_id = ?`, locationID, itemID,
	); err != nil {
		return err
	}
	for _, p := range prices {
		if _, err := tx.ExecContext(ctx, `
			INSERT OR REPLACE INTO location_item_prices (location_id, item_id, currency_id, amount) VALUES (?, ?, ?, ?)`,
			locationID, itemID, p.CurrencyID, p.Amount,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *ShopRepository) Remove(ctx context.Context, locationID, itemID int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx,
		`DELETE FROM location_item_prices WHERE location_id = ? AND item_id = ?`, locationID, itemID,
	); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx,
		`DELETE FROM location_items WHERE location_id = ? AND item_id = ?`, locationID, itemID,
	); err != nil {
		return err
	}
	return tx.Commit()
}
