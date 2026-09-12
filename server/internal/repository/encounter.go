package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type EncounterRepository struct {
	db *sql.DB
}

func NewEncounterRepository(db *sql.DB) *EncounterRepository {
	return &EncounterRepository{db: db}
}

func (r *EncounterRepository) List(ctx context.Context, campaignID int64) ([]models.Encounter, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, session_id, round, status, created_at, updated_at
              FROM encounters WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY id DESC`,
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

	var encounters []models.Encounter
	for rows.Next() {
		e := models.Encounter{}
		var sessionID sql.NullInt64
		if err := rows.Scan(&e.ID, &e.CampaignID, &sessionID, &e.Round, &e.Status, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		e.SessionID = fromNullInt64(sessionID)
		encounters = append(encounters, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return encounters, nil
}

func (r *EncounterRepository) Create(ctx context.Context, e *models.Encounter) error {
	err := r.db.QueryRowContext(ctx, `
              INSERT INTO encounters (campaign_id, session_id, round, status)
              VALUES (?, ?, ?, ?)
              RETURNING id, created_at, updated_at`,
		e.CampaignID, toNullInt64(e.SessionID), e.Round, e.Status,
	).Scan(&e.ID, &e.CreatedAt, &e.UpdatedAt)
	return err
}

func (r *EncounterRepository) GetByID(ctx context.Context, id int64) (*models.Encounter, error) {
	e := models.Encounter{}
	var sessionID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
              SELECT id, campaign_id, session_id, round, status, created_at, updated_at
              FROM encounters WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&e.ID, &e.CampaignID, &sessionID, &e.Round, &e.Status, &e.CreatedAt, &e.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	e.SessionID = fromNullInt64(sessionID)
	return &e, nil
}

func (r *EncounterRepository) Update(ctx context.Context, id int64, e *models.Encounter) error {
	var sessionID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
              UPDATE encounters
              SET session_id = ?, round = ?, status = ?, updated_at = datetime('now')
              WHERE id = ? AND deleted_at IS NULL
              RETURNING id, campaign_id, session_id, round, status, created_at, updated_at`,
		toNullInt64(e.SessionID), e.Round, e.Status, id,
	).Scan(&e.ID, &e.CampaignID, &sessionID, &e.Round, &e.Status, &e.CreatedAt, &e.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	e.SessionID = fromNullInt64(sessionID)
	return nil
}

func (r *EncounterRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
              UPDATE encounters
              SET deleted_at = datetime('now')
              WHERE id = ? AND deleted_at IS NULL
              RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
