package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type LocationRepository struct {
	db *sql.DB
}

func NewLocationRepository(db *sql.DB) *LocationRepository {
	return &LocationRepository{db: db}
}

func (r *LocationRepository) List(ctx context.Context, campaignID int64) ([]models.Location, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, name, location_type, parent_location_id, description, notes, obsidian_path, created_at, updated_at
		FROM locations WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY name`,
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			return
		}
	}()

	var locations []models.Location
	for rows.Next() {
		l := models.Location{}
		var parentLocationID sql.NullInt64
		var obsidianPath sql.NullString
		if err := rows.Scan(&l.ID, &l.CampaignID, &l.Name, &l.LocationType, &parentLocationID, &l.Description, &l.Notes, &obsidianPath, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		l.ParentLocationID = fromNullInt64(parentLocationID)
		l.ObsidianPath = fromNullString(obsidianPath)
		locations = append(locations, l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return locations, nil
}

func (r *LocationRepository) Create(ctx context.Context, l *models.Location) error {
	var parentLocationID sql.NullInt64
	var obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO locations (campaign_id, name, location_type, parent_location_id, description, notes, obsidian_path)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (campaign_id, obsidian_path) DO UPDATE SET
			name = excluded.name, location_type = excluded.location_type, parent_location_id = excluded.parent_location_id,
			description = excluded.description, notes = excluded.notes, deleted_at = NULL, updated_at = datetime('now')
		RETURNING id, campaign_id, name, location_type, parent_location_id, description, notes, obsidian_path, created_at, updated_at`,
		l.CampaignID, l.Name, l.LocationType, toNullInt64(l.ParentLocationID), l.Description, l.Notes, toNullString(l.ObsidianPath),
	).Scan(&l.ID, &l.CampaignID, &l.Name, &l.LocationType, &parentLocationID, &l.Description, &l.Notes, &obsidianPath, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return err
	}
	l.ParentLocationID = fromNullInt64(parentLocationID)
	l.ObsidianPath = fromNullString(obsidianPath)
	return nil
}

func (r *LocationRepository) GetByID(ctx context.Context, id int64) (*models.Location, error) {
	l := models.Location{}
	var parentLocationID sql.NullInt64
	var obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, name, location_type, parent_location_id, description, notes, obsidian_path, created_at, updated_at
		FROM locations WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&l.ID, &l.CampaignID, &l.Name, &l.LocationType, &parentLocationID, &l.Description, &l.Notes, &obsidianPath, &l.CreatedAt, &l.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	l.ParentLocationID = fromNullInt64(parentLocationID)
	l.ObsidianPath = fromNullString(obsidianPath)
	return &l, nil
}

func (r *LocationRepository) Update(ctx context.Context, id int64, l *models.Location) error {
	var parentLocationID sql.NullInt64
	var obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		UPDATE locations
		SET name = ?, location_type = ?, parent_location_id = ?, description = ?, notes = ?, obsidian_path = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, campaign_id, name, location_type, parent_location_id, description, notes, obsidian_path, created_at, updated_at`,
		l.Name, l.LocationType, toNullInt64(l.ParentLocationID), l.Description, l.Notes, toNullString(l.ObsidianPath), id,
	).Scan(&l.ID, &l.CampaignID, &l.Name, &l.LocationType, &parentLocationID, &l.Description, &l.Notes, &obsidianPath, &l.CreatedAt, &l.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	l.ParentLocationID = fromNullInt64(parentLocationID)
	l.ObsidianPath = fromNullString(obsidianPath)
	return nil
}

func (r *LocationRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE locations
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
