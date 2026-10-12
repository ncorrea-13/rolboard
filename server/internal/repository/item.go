package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

const itemColumns = `id, campaign_id, name, description, effect, category, rarity, weight, image_path, created_at, updated_at`

type ItemRepository struct {
	db *sql.DB
}

func NewItemRepository(db *sql.DB) *ItemRepository {
	return &ItemRepository{db: db}
}

func scanItem(row loreScanner, it *models.Item) error {
	var weight sql.NullFloat64
	var imagePath sql.NullString
	if err := row.Scan(&it.ID, &it.CampaignID, &it.Name, &it.Description, &it.Effect, &it.Category, &it.Rarity, &weight, &imagePath, &it.CreatedAt, &it.UpdatedAt); err != nil {
		return err
	}
	it.ImagePath = fromNullString(imagePath)
	it.Weight = nil
	if weight.Valid {
		v := weight.Float64
		it.Weight = &v
	}
	it.Prices = []models.Price{}
	return nil
}

func (r *ItemRepository) prices(ctx context.Context, where string, arg int64) (map[int64][]models.Price, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT ip.item_id, ip.currency_id, ip.amount
		FROM item_prices ip
		JOIN items i ON i.id = ip.item_id
		JOIN currencies c ON c.id = ip.currency_id AND c.deleted_at IS NULL
		WHERE `+where+` ORDER BY c.is_base DESC, c.name`, arg)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	result := map[int64][]models.Price{}
	for rows.Next() {
		var itemID int64
		var p models.Price
		if err := rows.Scan(&itemID, &p.CurrencyID, &p.Amount); err != nil {
			return nil, err
		}
		result[itemID] = append(result[itemID], p)
	}
	return result, rows.Err()
}

func (r *ItemRepository) List(ctx context.Context, campaignID int64) ([]models.Item, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+itemColumns+` FROM items WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY name`,
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	items := []models.Item{}
	for rows.Next() {
		var it models.Item
		if err := scanItem(rows, &it); err != nil {
			_ = rows.Close()
			return nil, err
		}
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		_ = rows.Close()
		return nil, err
	}
	_ = rows.Close()

	prices, err := r.prices(ctx, "i.campaign_id = ? AND i.deleted_at IS NULL", campaignID)
	if err != nil {
		return nil, err
	}
	for i := range items {
		if p, ok := prices[items[i].ID]; ok {
			items[i].Prices = p
		}
	}
	return items, nil
}

func (r *ItemRepository) GetByID(ctx context.Context, id int64) (*models.Item, error) {
	var it models.Item
	err := scanItem(r.db.QueryRowContext(ctx,
		`SELECT `+itemColumns+` FROM items WHERE id = ? AND deleted_at IS NULL`, id,
	), &it)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	prices, err := r.prices(ctx, "i.id = ?", id)
	if err != nil {
		return nil, err
	}
	if p, ok := prices[id]; ok {
		it.Prices = p
	}
	return &it, nil
}

func replaceItemPrices(ctx context.Context, tx *sql.Tx, itemID int64, prices []models.Price) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM item_prices WHERE item_id = ?`, itemID); err != nil {
		return err
	}
	for _, p := range prices {
		if _, err := tx.ExecContext(ctx,
			`INSERT OR REPLACE INTO item_prices (item_id, currency_id, amount) VALUES (?, ?, ?)`,
			itemID, p.CurrencyID, p.Amount,
		); err != nil {
			return err
		}
	}
	return nil
}

func (r *ItemRepository) Create(ctx context.Context, it *models.Item) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	prices := it.Prices
	err = scanItem(tx.QueryRowContext(ctx, `
		INSERT INTO items (campaign_id, name, description, effect, category, rarity, weight)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		RETURNING `+itemColumns,
		it.CampaignID, it.Name, it.Description, it.Effect, it.Category, it.Rarity, nullFloat(it.Weight),
	), it)
	if err != nil {
		return err
	}
	if err := replaceItemPrices(ctx, tx, it.ID, prices); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return r.fillPrices(ctx, it)
}

func (r *ItemRepository) fillPrices(ctx context.Context, it *models.Item) error {
	prices, err := r.prices(ctx, "i.id = ?", it.ID)
	if err != nil {
		return err
	}
	if p, ok := prices[it.ID]; ok {
		it.Prices = p
	}
	return nil
}

func (r *ItemRepository) Update(ctx context.Context, id int64, it *models.Item) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	prices := it.Prices
	err = scanItem(tx.QueryRowContext(ctx, `
		UPDATE items
		SET name = ?, description = ?, effect = ?, category = ?, rarity = ?, weight = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING `+itemColumns,
		it.Name, it.Description, it.Effect, it.Category, it.Rarity, nullFloat(it.Weight), id,
	), it)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if err := replaceItemPrices(ctx, tx, id, prices); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return r.fillPrices(ctx, it)
}

func (r *ItemRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE items
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
