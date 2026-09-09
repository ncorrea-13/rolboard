package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type SessionRepository struct {
	db *sql.DB
}

func NewSessionRepository(db *sql.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) List(ctx context.Context, campaignID int64) ([]models.Session, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, arc_id, session_number, sub_number, session_type, date, summary, obsidian_path, created_at, updated_at
		FROM sessions WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY session_number, sub_number`,
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

	var sessions []models.Session
	for rows.Next() {
		s := models.Session{}
		var arcID sql.NullInt64
		var obsidianPath sql.NullString
		if err := rows.Scan(&s.ID, &s.CampaignID, &arcID, &s.SessionNumber, &s.SubNumber, &s.SessionType, &s.Date, &s.Summary, &obsidianPath, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.ArcID = fromNullInt64(arcID)
		s.ObsidianPath = fromNullString(obsidianPath)
		sessions = append(sessions, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return sessions, nil
}

func (r *SessionRepository) Create(ctx context.Context, s *models.Session) error {
	var arcID sql.NullInt64
	var obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO sessions (campaign_id, arc_id, session_number, sub_number, session_type, date, summary, obsidian_path)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (campaign_id, obsidian_path) DO UPDATE SET
			arc_id = excluded.arc_id, session_number = excluded.session_number, sub_number = excluded.sub_number,
			session_type = excluded.session_type, date = excluded.date, summary = excluded.summary,
			deleted_at = NULL, updated_at = datetime('now')
		RETURNING id, campaign_id, arc_id, session_number, sub_number, session_type, date, summary, obsidian_path, created_at, updated_at`,
		s.CampaignID, toNullInt64(s.ArcID), s.SessionNumber, s.SubNumber, s.SessionType, s.Date, s.Summary, toNullString(s.ObsidianPath),
	).Scan(&s.ID, &s.CampaignID, &arcID, &s.SessionNumber, &s.SubNumber, &s.SessionType, &s.Date, &s.Summary, &obsidianPath, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return err
	}
	s.ArcID = fromNullInt64(arcID)
	s.ObsidianPath = fromNullString(obsidianPath)
	return nil
}

func (r *SessionRepository) GetByID(ctx context.Context, id int64) (*models.Session, error) {
	s := models.Session{}
	var arcID sql.NullInt64
	var obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, arc_id, session_number, sub_number, session_type, date, summary, obsidian_path, created_at, updated_at
		FROM sessions WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&s.ID, &s.CampaignID, &arcID, &s.SessionNumber, &s.SubNumber, &s.SessionType, &s.Date, &s.Summary, &obsidianPath, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	s.ArcID = fromNullInt64(arcID)
	s.ObsidianPath = fromNullString(obsidianPath)
	return &s, nil
}

func (r *SessionRepository) Update(ctx context.Context, id int64, s *models.Session) error {
	var arcID sql.NullInt64
	var obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		UPDATE sessions
		SET arc_id = ?, session_number = ?, sub_number = ?, session_type = ?, date = ?, summary = ?, obsidian_path = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, campaign_id, arc_id, session_number, sub_number, session_type, date, summary, obsidian_path, created_at, updated_at`,
		toNullInt64(s.ArcID), s.SessionNumber, s.SubNumber, s.SessionType, s.Date, s.Summary, toNullString(s.ObsidianPath), id,
	).Scan(&s.ID, &s.CampaignID, &arcID, &s.SessionNumber, &s.SubNumber, &s.SessionType, &s.Date, &s.Summary, &obsidianPath, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	s.ArcID = fromNullInt64(arcID)
	s.ObsidianPath = fromNullString(obsidianPath)
	return nil
}

func (r *SessionRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE sessions
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
