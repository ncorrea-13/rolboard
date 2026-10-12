package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

const timelineEventColumns = `id, campaign_id, timeline_id, title, description, date_label, COALESCE(end_date_label, ''), sort_key, arc_id, session_id, location_id, group_id, lore_entry_id, created_at, updated_at`

type TimelineEventRepository struct {
	db *sql.DB
}

func NewTimelineEventRepository(db *sql.DB) *TimelineEventRepository {
	return &TimelineEventRepository{db: db}
}

func scanTimelineEvent(row loreScanner, e *models.TimelineEvent) error {
	var arcID, sessionID, locationID, groupID, loreID sql.NullInt64
	if err := row.Scan(&e.ID, &e.CampaignID, &e.TimelineID, &e.Title, &e.Description, &e.DateLabel, &e.EndDateLabel, &e.SortKey,
		&arcID, &sessionID, &locationID, &groupID, &loreID, &e.CreatedAt, &e.UpdatedAt); err != nil {
		return err
	}
	e.ArcID = fromNullInt64(arcID)
	e.SessionID = fromNullInt64(sessionID)
	e.LocationID = fromNullInt64(locationID)
	e.GroupID = fromNullInt64(groupID)
	e.LoreEntryID = fromNullInt64(loreID)
	return nil
}

func (r *TimelineEventRepository) List(ctx context.Context, campaignID int64) ([]models.TimelineEvent, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+timelineEventColumns+` FROM timeline_events WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY sort_key, id`,
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	events := []models.TimelineEvent{}
	for rows.Next() {
		var e models.TimelineEvent
		if err := scanTimelineEvent(rows, &e); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

func (r *TimelineEventRepository) Create(ctx context.Context, e *models.TimelineEvent) error {
	return scanTimelineEvent(r.db.QueryRowContext(ctx, `
		INSERT INTO timeline_events (campaign_id, timeline_id, title, description, date_label, end_date_label, sort_key, arc_id, session_id, location_id, group_id, lore_entry_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING `+timelineEventColumns,
		e.CampaignID, e.TimelineID, e.Title, e.Description, e.DateLabel, nullIfEmpty(e.EndDateLabel), e.SortKey,
		toNullInt64(e.ArcID), toNullInt64(e.SessionID), toNullInt64(e.LocationID), toNullInt64(e.GroupID), toNullInt64(e.LoreEntryID),
	), e)
}

func (r *TimelineEventRepository) GetByID(ctx context.Context, id int64) (*models.TimelineEvent, error) {
	var e models.TimelineEvent
	err := scanTimelineEvent(r.db.QueryRowContext(ctx,
		`SELECT `+timelineEventColumns+` FROM timeline_events WHERE id = ? AND deleted_at IS NULL`, id,
	), &e)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *TimelineEventRepository) Update(ctx context.Context, id int64, e *models.TimelineEvent) error {
	err := scanTimelineEvent(r.db.QueryRowContext(ctx, `
		UPDATE timeline_events
		SET timeline_id = ?, title = ?, description = ?, date_label = ?, end_date_label = ?, sort_key = ?,
			arc_id = ?, session_id = ?, location_id = ?, group_id = ?, lore_entry_id = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING `+timelineEventColumns,
		e.TimelineID, e.Title, e.Description, e.DateLabel, nullIfEmpty(e.EndDateLabel), e.SortKey,
		toNullInt64(e.ArcID), toNullInt64(e.SessionID), toNullInt64(e.LocationID), toNullInt64(e.GroupID), toNullInt64(e.LoreEntryID), id,
	), e)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

func (r *TimelineEventRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE timeline_events
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
