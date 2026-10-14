package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

var ErrLoreCategoryInUse = errors.New("lore category is used by entries")

var DefaultLoreCategories = []models.LoreCategory{
	{Key: "historia", Label: "Historia", Color: "#c79a55"},
	{Key: "geografia", Label: "Geografía", Color: "#6fa98c"},
	{Key: "religion", Label: "Religión", Color: "#a87c9b"},
	{Key: "magia", Label: "Magia", Color: "#5fa8d3"},
	{Key: "cultura", Label: "Cultura", Color: "#d08a3c"},
}

func seedDefaultLoreCategories(ctx context.Context, ex execer, campaignID int64) error {
	for i, c := range DefaultLoreCategories {
		if _, err := ex.ExecContext(ctx,
			`INSERT INTO lore_categories (campaign_id, key, label, color, position) VALUES (?, ?, ?, ?, ?)`,
			campaignID, c.Key, c.Label, c.Color, i,
		); err != nil {
			return err
		}
	}
	return nil
}

type LoreCategoryRepository struct {
	db *sql.DB
}

func NewLoreCategoryRepository(db *sql.DB) *LoreCategoryRepository {
	return &LoreCategoryRepository{db: db}
}

func (r *LoreCategoryRepository) List(ctx context.Context, campaignID int64) ([]models.LoreCategory, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, campaign_id, key, label, color, position FROM lore_categories WHERE campaign_id = ? ORDER BY position, id`,
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	categories := []models.LoreCategory{}
	for rows.Next() {
		var c models.LoreCategory
		if err := rows.Scan(&c.ID, &c.CampaignID, &c.Key, &c.Label, &c.Color, &c.Position); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

func (r *LoreCategoryRepository) Exists(ctx context.Context, campaignID int64, key string) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx,
		`SELECT 1 FROM lore_categories WHERE campaign_id = ? AND key = ?`, campaignID, key,
	).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (r *LoreCategoryRepository) GetByID(ctx context.Context, id int64) (*models.LoreCategory, error) {
	var c models.LoreCategory
	err := r.db.QueryRowContext(ctx,
		`SELECT id, campaign_id, key, label, color, position FROM lore_categories WHERE id = ?`, id,
	).Scan(&c.ID, &c.CampaignID, &c.Key, &c.Label, &c.Color, &c.Position)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *LoreCategoryRepository) Create(ctx context.Context, c *models.LoreCategory) error {
	return r.db.QueryRowContext(ctx, `
		INSERT INTO lore_categories (campaign_id, key, label, color, position)
		VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM lore_categories WHERE campaign_id = ?))
		RETURNING id, campaign_id, key, label, color, position`,
		c.CampaignID, c.Key, c.Label, c.Color, c.CampaignID,
	).Scan(&c.ID, &c.CampaignID, &c.Key, &c.Label, &c.Color, &c.Position)
}

func (r *LoreCategoryRepository) Update(ctx context.Context, id int64, label, color string) (*models.LoreCategory, error) {
	var c models.LoreCategory
	err := r.db.QueryRowContext(ctx, `
		UPDATE lore_categories SET label = ?, color = ? WHERE id = ?
		RETURNING id, campaign_id, key, label, color, position`,
		label, color, id,
	).Scan(&c.ID, &c.CampaignID, &c.Key, &c.Label, &c.Color, &c.Position)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *LoreCategoryRepository) Delete(ctx context.Context, id int64) error {
	var exists int
	err := r.db.QueryRowContext(ctx, `SELECT 1 FROM lore_categories WHERE id = ?`, id).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	var inUse int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM lore_entries WHERE category_id = ?`, id,
	).Scan(&inUse); err != nil {
		return err
	}
	if inUse > 0 {
		return ErrLoreCategoryInUse
	}

	_, err = r.db.ExecContext(ctx, `DELETE FROM lore_categories WHERE id = ?`, id)
	return err
}

func CampaignIDByLoreCategory(ctx context.Context, db *sql.DB, id int64) (int64, error) {
	var campaignID int64
	err := db.QueryRowContext(ctx, `SELECT campaign_id FROM lore_categories WHERE id = ?`, id).Scan(&campaignID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNotFound
	}
	return campaignID, err
}

func (r *LoreCategoryRepository) Ensure(ctx context.Context, campaignID int64, key, label string) (*models.LoreCategory, error) {
	var c models.LoreCategory
	err := r.db.QueryRowContext(ctx,
		`SELECT id, campaign_id, key, label, color, position FROM lore_categories WHERE campaign_id = ? AND key = ?`, campaignID, key,
	).Scan(&c.ID, &c.CampaignID, &c.Key, &c.Label, &c.Color, &c.Position)
	if err == nil {
		return &c, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	var count int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM lore_categories WHERE campaign_id = ?`, campaignID).Scan(&count); err != nil {
		return nil, err
	}
	c = models.LoreCategory{CampaignID: campaignID, Key: key, Label: label, Color: autoTypeColors[count%len(autoTypeColors)]}
	if err := r.Create(ctx, &c); err != nil {
		return nil, err
	}
	return &c, nil
}
