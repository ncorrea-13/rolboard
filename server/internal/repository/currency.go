package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

const currencyColumns = `id, campaign_id, name, symbol, rate_to_base, is_base, created_at, updated_at`

type CurrencyRepository struct {
	db *sql.DB
}

func NewCurrencyRepository(db *sql.DB) *CurrencyRepository {
	return &CurrencyRepository{db: db}
}

func scanCurrency(row loreScanner, c *models.Currency) error {
	var rate sql.NullFloat64
	if err := row.Scan(&c.ID, &c.CampaignID, &c.Name, &c.Symbol, &rate, &c.IsBase, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return err
	}
	c.RateToBase = nil
	if rate.Valid {
		v := rate.Float64
		c.RateToBase = &v
	}
	c.LocationIDs = []int64{}
	return nil
}

func nullFloat(v *float64) sql.NullFloat64 {
	if v == nil {
		return sql.NullFloat64{}
	}
	return sql.NullFloat64{Float64: *v, Valid: true}
}

func (r *CurrencyRepository) locations(ctx context.Context, where string, arg int64) (map[int64][]int64, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT cl.currency_id, cl.location_id
		FROM currency_locations cl
		JOIN currencies c ON c.id = cl.currency_id
		JOIN locations l ON l.id = cl.location_id AND l.deleted_at IS NULL
		WHERE `+where+` ORDER BY l.name`, arg)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	result := map[int64][]int64{}
	for rows.Next() {
		var currencyID, locationID int64
		if err := rows.Scan(&currencyID, &locationID); err != nil {
			return nil, err
		}
		result[currencyID] = append(result[currencyID], locationID)
	}
	return result, rows.Err()
}

func (r *CurrencyRepository) List(ctx context.Context, campaignID int64) ([]models.Currency, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+currencyColumns+` FROM currencies WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY is_base DESC, name`,
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	currencies := []models.Currency{}
	for rows.Next() {
		var c models.Currency
		if err := scanCurrency(rows, &c); err != nil {
			_ = rows.Close()
			return nil, err
		}
		currencies = append(currencies, c)
	}
	if err := rows.Err(); err != nil {
		_ = rows.Close()
		return nil, err
	}
	_ = rows.Close()

	locs, err := r.locations(ctx, "c.campaign_id = ? AND c.deleted_at IS NULL", campaignID)
	if err != nil {
		return nil, err
	}
	for i := range currencies {
		if ids, ok := locs[currencies[i].ID]; ok {
			currencies[i].LocationIDs = ids
		}
	}
	return currencies, nil
}

func (r *CurrencyRepository) GetByID(ctx context.Context, id int64) (*models.Currency, error) {
	var c models.Currency
	err := scanCurrency(r.db.QueryRowContext(ctx,
		`SELECT `+currencyColumns+` FROM currencies WHERE id = ? AND deleted_at IS NULL`, id,
	), &c)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	locs, err := r.locations(ctx, "c.id = ?", id)
	if err != nil {
		return nil, err
	}
	if ids, ok := locs[id]; ok {
		c.LocationIDs = ids
	}
	return &c, nil
}

func replaceCurrencyLocations(ctx context.Context, tx *sql.Tx, currencyID int64, locationIDs []int64) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM currency_locations WHERE currency_id = ?`, currencyID); err != nil {
		return err
	}
	for _, id := range locationIDs {
		if _, err := tx.ExecContext(ctx,
			`INSERT OR IGNORE INTO currency_locations (currency_id, location_id) VALUES (?, ?)`, currencyID, id,
		); err != nil {
			return err
		}
	}
	return nil
}

func (r *CurrencyRepository) Create(ctx context.Context, c *models.Currency) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	locationIDs := c.LocationIDs
	if c.IsBase {
		if _, err := tx.ExecContext(ctx,
			`UPDATE currencies SET is_base = 0 WHERE campaign_id = ? AND is_base = 1 AND deleted_at IS NULL`, c.CampaignID,
		); err != nil {
			return err
		}
	}
	err = scanCurrency(tx.QueryRowContext(ctx, `
		INSERT INTO currencies (campaign_id, name, symbol, rate_to_base, is_base)
		VALUES (?, ?, ?, ?, ?)
		RETURNING `+currencyColumns,
		c.CampaignID, c.Name, c.Symbol, nullFloat(c.RateToBase), c.IsBase,
	), c)
	if err != nil {
		return err
	}
	if err := replaceCurrencyLocations(ctx, tx, c.ID, locationIDs); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	c.LocationIDs = locationIDs
	if c.LocationIDs == nil {
		c.LocationIDs = []int64{}
	}
	return nil
}

func (r *CurrencyRepository) Update(ctx context.Context, id int64, c *models.Currency) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	locationIDs := c.LocationIDs
	if c.IsBase {
		if _, err := tx.ExecContext(ctx, `
			UPDATE currencies SET is_base = 0
			WHERE is_base = 1 AND deleted_at IS NULL AND id <> ?
			  AND campaign_id = (SELECT campaign_id FROM currencies WHERE id = ?)`, id, id,
		); err != nil {
			return err
		}
	}
	err = scanCurrency(tx.QueryRowContext(ctx, `
		UPDATE currencies
		SET name = ?, symbol = ?, rate_to_base = ?, is_base = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING `+currencyColumns,
		c.Name, c.Symbol, nullFloat(c.RateToBase), c.IsBase, id,
	), c)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if err := replaceCurrencyLocations(ctx, tx, id, locationIDs); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	c.LocationIDs = locationIDs
	if c.LocationIDs == nil {
		c.LocationIDs = []int64{}
	}
	return nil
}

func (r *CurrencyRepository) Delete(ctx context.Context, id int64) error {
	used, err := hasActive(ctx, r.db, `
		SELECT EXISTS(
			SELECT 1 FROM item_prices ip JOIN items i ON i.id = ip.item_id AND i.deleted_at IS NULL WHERE ip.currency_id = ?
		) OR EXISTS(
			SELECT 1 FROM location_item_prices lp
			JOIN locations l ON l.id = lp.location_id AND l.deleted_at IS NULL
			JOIN items i ON i.id = lp.item_id AND i.deleted_at IS NULL
			WHERE lp.currency_id = ?
		)`, id, id)
	if err != nil {
		return err
	}
	if used {
		return ErrInUse
	}
	err = r.db.QueryRowContext(ctx, `
		UPDATE currencies
		SET deleted_at = datetime('now'), is_base = 0
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
