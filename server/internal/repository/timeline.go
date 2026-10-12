package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

const timelineColumns = `id, campaign_id, name, description, color, COALESCE(start_label, ''), COALESCE(end_label, ''), position, created_at, updated_at`

type TimelineRepository struct {
	db *sql.DB
}

func NewTimelineRepository(db *sql.DB) *TimelineRepository {
	return &TimelineRepository{db: db}
}

func nullIfEmpty(s string) sql.NullString {
	return sql.NullString{String: s, Valid: s != ""}
}

func scanTimeline(row loreScanner, t *models.Timeline) error {
	return row.Scan(&t.ID, &t.CampaignID, &t.Name, &t.Description, &t.Color, &t.StartLabel, &t.EndLabel, &t.Position, &t.CreatedAt, &t.UpdatedAt)
}

func (r *TimelineRepository) List(ctx context.Context, campaignID int64) ([]models.Timeline, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+timelineColumns+` FROM timelines WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY position, id`,
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	timelines := []models.Timeline{}
	for rows.Next() {
		var t models.Timeline
		if err := scanTimeline(rows, &t); err != nil {
			return nil, err
		}
		timelines = append(timelines, t)
	}
	return timelines, rows.Err()
}

func (r *TimelineRepository) Create(ctx context.Context, t *models.Timeline) error {
	return scanTimeline(r.db.QueryRowContext(ctx, `
		INSERT INTO timelines (campaign_id, name, description, color, start_label, end_label, position)
		VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM timelines WHERE campaign_id = ? AND deleted_at IS NULL))
		RETURNING `+timelineColumns,
		t.CampaignID, t.Name, t.Description, t.Color, nullIfEmpty(t.StartLabel), nullIfEmpty(t.EndLabel), t.CampaignID,
	), t)
}

func (r *TimelineRepository) GetByID(ctx context.Context, id int64) (*models.Timeline, error) {
	var t models.Timeline
	err := scanTimeline(r.db.QueryRowContext(ctx,
		`SELECT `+timelineColumns+` FROM timelines WHERE id = ? AND deleted_at IS NULL`, id,
	), &t)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TimelineRepository) Update(ctx context.Context, id int64, t *models.Timeline) error {
	err := scanTimeline(r.db.QueryRowContext(ctx, `
		UPDATE timelines
		SET name = ?, description = ?, color = ?, start_label = ?, end_label = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING `+timelineColumns,
		t.Name, t.Description, t.Color, nullIfEmpty(t.StartLabel), nullIfEmpty(t.EndLabel), id,
	), t)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

func (r *TimelineRepository) Delete(ctx context.Context, id int64) error {
	if used, err := hasActive(ctx, r.db, `SELECT EXISTS(SELECT 1 FROM timeline_events WHERE timeline_id = ? AND deleted_at IS NULL)`, id); err != nil {
		return err
	} else if used {
		return ErrInUse
	}
	err := r.db.QueryRowContext(ctx, `
		UPDATE timelines
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
