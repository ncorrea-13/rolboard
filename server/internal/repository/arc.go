package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type ArcRepository struct {
	db *sql.DB
}

func NewArcRepository(db *sql.DB) *ArcRepository {
	return &ArcRepository{db: db}
}

func (r *ArcRepository) List(ctx context.Context, id int64) ([]models.Arc, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, title, "order", summary, created_at, updated_at
		FROM arcs WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY "order"`,
		id,
	)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			return
		}
	}()

	var arc []models.Arc
	for rows.Next() {
		c := models.Arc{}
		if err := rows.Scan(&c.ID, &c.CampaignID, &c.Title, &c.Order, &c.Summary, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		arc = append(arc, c)

	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return arc, nil
}

func (r *ArcRepository) Create(ctx context.Context, c *models.Arc) error {
	return r.db.QueryRowContext(ctx, `
              INSERT INTO arcs (title, "order", summary, campaign_id)
              VALUES (?, ?, ?, ?)
              RETURNING id, "order", title, summary, campaign_id, created_at, updated_at`,
		c.Title, c.Order, c.Summary, c.CampaignID,
	).Scan(&c.ID, &c.Order, &c.Title, &c.Summary, &c.CampaignID, &c.CreatedAt, &c.UpdatedAt)
}

func (r *ArcRepository) GetByID(ctx context.Context, id int64) (*models.Arc, error) {
	c := models.Arc{}
	err := r.db.QueryRowContext(ctx, `
	SELECT id, title, "order", summary, campaign_id, created_at, updated_at FROM arcs
		WHERE id = ? 
		AND deleted_at IS NULL`,
		id,
	).Scan(&c.ID, &c.Title, &c.Order, &c.Summary, &c.CampaignID, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return &c, nil
}

func (r *ArcRepository) Update(ctx context.Context, id int64, c *models.Arc) error {
	err := r.db.QueryRowContext(ctx, `
              UPDATE arcs
              SET title = ?, summary = ?, "order" = ?, updated_at = datetime('now')
              WHERE id = ? AND deleted_at IS NULL
              RETURNING id, title, summary, "order", campaign_id, created_at, updated_at`,
		c.Title, c.Summary, c.Order, id,
	).Scan(&c.ID, &c.Title, &c.Summary, &c.Order, &c.CampaignID, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

func (r *ArcRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
              UPDATE arcs
              SET deleted_at = datetime('now')
              WHERE id = ? AND deleted_at IS NULL
              RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
