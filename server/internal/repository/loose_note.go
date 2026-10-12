package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type LooseNoteRepository struct {
	db *sql.DB
}

func NewLooseNoteRepository(db *sql.DB) *LooseNoteRepository {
	return &LooseNoteRepository{db: db}
}

func (r *LooseNoteRepository) List(ctx context.Context, campaignID int64) ([]models.LooseNote, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, title, body, pending, created_at, updated_at
		FROM notes WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY pending DESC, updated_at DESC, id DESC`,
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

	notes := []models.LooseNote{}
	for rows.Next() {
		n := models.LooseNote{}
		if err := rows.Scan(&n.ID, &n.CampaignID, &n.Title, &n.Body, &n.Pending, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, rows.Err()
}

func (r *LooseNoteRepository) Create(ctx context.Context, n *models.LooseNote) error {
	return r.db.QueryRowContext(ctx, `
		INSERT INTO notes (campaign_id, title, body, pending)
		VALUES (?, ?, ?, ?)
		RETURNING id, campaign_id, title, body, pending, created_at, updated_at`,
		n.CampaignID, n.Title, n.Body, n.Pending,
	).Scan(&n.ID, &n.CampaignID, &n.Title, &n.Body, &n.Pending, &n.CreatedAt, &n.UpdatedAt)
}

func (r *LooseNoteRepository) GetByID(ctx context.Context, id int64) (*models.LooseNote, error) {
	n := models.LooseNote{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, title, body, pending, created_at, updated_at
		FROM notes WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&n.ID, &n.CampaignID, &n.Title, &n.Body, &n.Pending, &n.CreatedAt, &n.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (r *LooseNoteRepository) Update(ctx context.Context, id int64, n *models.LooseNote) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE notes
		SET title = ?, body = ?, pending = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, campaign_id, title, body, pending, created_at, updated_at`,
		n.Title, n.Body, n.Pending, id,
	).Scan(&n.ID, &n.CampaignID, &n.Title, &n.Body, &n.Pending, &n.CreatedAt, &n.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

func (r *LooseNoteRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE notes
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
