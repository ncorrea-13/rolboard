package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea/campaign-dashboard/server/internal/models"
)

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
	defer rows.Close()

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
