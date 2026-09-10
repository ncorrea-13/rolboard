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
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, title, "order", status, subarc_order, summary, created_at, updated_at
		FROM arcs WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY "order", subarc_order`,
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
		var subarcOrder sql.NullInt64
		if err := rows.Scan(&c.ID, &c.CampaignID, &c.Title, &c.Order, &c.Status, &subarcOrder, &c.Summary, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.SubarcOrder = fromNullInt64(subarcOrder)
		arc = append(arc, c)

	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return arc, nil
}

func (r *ArcRepository) Create(ctx context.Context, c *models.Arc) error {
	var subarcOrder sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
              INSERT INTO arcs (title, "order", status, subarc_order, summary, campaign_id)
              VALUES (?, ?, ?, ?, ?, ?)
              RETURNING id, "order", title, status, subarc_order, summary, campaign_id, created_at, updated_at`,
		c.Title, c.Order, c.Status, toNullInt64(c.SubarcOrder), c.Summary, c.CampaignID,
	).Scan(&c.ID, &c.Order, &c.Title, &c.Status, &subarcOrder, &c.Summary, &c.CampaignID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return err
	}
	c.SubarcOrder = fromNullInt64(subarcOrder)
	return nil
}

func (r *ArcRepository) GetByID(ctx context.Context, id int64) (*models.Arc, error) {
	c := models.Arc{}
	var subarcOrder sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
	SELECT id, title, "order", status, subarc_order, summary, campaign_id, created_at, updated_at FROM arcs
		WHERE id = ?
		AND deleted_at IS NULL`,
		id,
	).Scan(&c.ID, &c.Title, &c.Order, &c.Status, &subarcOrder, &c.Summary, &c.CampaignID, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	c.SubarcOrder = fromNullInt64(subarcOrder)
	return &c, nil
}

func (r *ArcRepository) Update(ctx context.Context, id int64, c *models.Arc) error {
	var subarcOrder sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
              UPDATE arcs
              SET title = ?, summary = ?, "order" = ?, status = ?, subarc_order = ?, updated_at = datetime('now')
              WHERE id = ? AND deleted_at IS NULL
              RETURNING id, title, summary, "order", status, subarc_order, campaign_id, created_at, updated_at`,
		c.Title, c.Summary, c.Order, c.Status, toNullInt64(c.SubarcOrder), id,
	).Scan(&c.ID, &c.Title, &c.Summary, &c.Order, &c.Status, &subarcOrder, &c.CampaignID, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	c.SubarcOrder = fromNullInt64(subarcOrder)
	return nil
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
