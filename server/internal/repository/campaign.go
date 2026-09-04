package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

var ErrNotFound = errors.New("campaign not found")

type CampaignRepository struct {
	db *sql.DB
}

func NewCampaignRepository(db *sql.DB) *CampaignRepository {
	return &CampaignRepository{db: db}
}

func (r *CampaignRepository) List(ctx context.Context) ([]models.Campaign, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, name, system, description, status, created_at, updated_at
		FROM campaigns WHERE deleted_at IS NULL ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			return
		}
	}()

	var campaigns []models.Campaign
	for rows.Next() {
		c := models.Campaign{}
		if err := rows.Scan(&c.ID, &c.Name, &c.System, &c.Description, &c.Status, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		campaigns = append(campaigns, c)

	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return campaigns, nil
}

func (r *CampaignRepository) Create(ctx context.Context, c *models.Campaign) error {
	return r.db.QueryRowContext(ctx, `
              INSERT INTO campaigns (name, system, description)
              VALUES (?, ?, ?)
              RETURNING id, name, system, description, status, created_at, updated_at`,
		c.Name, c.System, c.Description,
	).Scan(&c.ID, &c.Name, &c.System, &c.Description, &c.Status, &c.CreatedAt, &c.UpdatedAt)
}

func (r *CampaignRepository) GetByID(ctx context.Context, id int64) (*models.Campaign, error) {
	c := models.Campaign{}
	err := r.db.QueryRowContext(ctx, `
	SELECT id, name, system, description, status, created_at, updated_at FROM campaigns
		WHERE id = ? 
		AND deleted_at IS NULL`,
		id,
	).Scan(&c.ID, &c.Name, &c.System, &c.Description, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return &c, nil
}

func (r *CampaignRepository) Update(ctx context.Context, id int64, c *models.Campaign) error {
	err := r.db.QueryRowContext(ctx, `
              UPDATE campaigns
              SET name = ?, system = ?, description = ?, status = ?, updated_at = datetime('now')
              WHERE id = ? AND deleted_at IS NULL
              RETURNING id, name, system, description, status, created_at, updated_at`,
		c.Name, c.System, c.Description, c.Status, id,
	).Scan(&c.ID, &c.Name, &c.System, &c.Description, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

func (r *CampaignRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
              UPDATE campaigns
              SET deleted_at = datetime('now')
              WHERE id = ? AND deleted_at IS NULL
              RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
