package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type QuestRepository struct {
	db *sql.DB
}

func NewQuestRepository(db *sql.DB) *QuestRepository {
	return &QuestRepository{db: db}
}

func (r *QuestRepository) List(ctx context.Context, campaignID int64) ([]models.Quest, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, title, description, status, priority, notes, created_at, updated_at
		FROM quests WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY title`,
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

	var quests []models.Quest
	for rows.Next() {
		q := models.Quest{}
		var priority sql.NullInt64
		if err := rows.Scan(&q.ID, &q.CampaignID, &q.Title, &q.Description, &q.Status, &priority, &q.Notes, &q.CreatedAt, &q.UpdatedAt); err != nil {
			return nil, err
		}
		q.Priority = fromNullInt64(priority)
		quests = append(quests, q)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return quests, nil
}

func (r *QuestRepository) Create(ctx context.Context, q *models.Quest) error {
	var priority sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO quests (campaign_id, title, description, status, priority, notes)
		VALUES (?, ?, ?, ?, ?, ?)
		RETURNING id, campaign_id, title, description, status, priority, notes, created_at, updated_at`,
		q.CampaignID, q.Title, q.Description, q.Status, toNullInt64(q.Priority), q.Notes,
	).Scan(&q.ID, &q.CampaignID, &q.Title, &q.Description, &q.Status, &priority, &q.Notes, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		return err
	}
	q.Priority = fromNullInt64(priority)
	return nil
}

func (r *QuestRepository) GetByID(ctx context.Context, id int64) (*models.Quest, error) {
	q := models.Quest{}
	var priority sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, title, description, status, priority, notes, created_at, updated_at
		FROM quests WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&q.ID, &q.CampaignID, &q.Title, &q.Description, &q.Status, &priority, &q.Notes, &q.CreatedAt, &q.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	q.Priority = fromNullInt64(priority)
	return &q, nil
}

func (r *QuestRepository) Update(ctx context.Context, id int64, q *models.Quest) error {
	var priority sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		UPDATE quests
		SET title = ?, description = ?, status = ?, priority = ?, notes = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, campaign_id, title, description, status, priority, notes, created_at, updated_at`,
		q.Title, q.Description, q.Status, toNullInt64(q.Priority), q.Notes, id,
	).Scan(&q.ID, &q.CampaignID, &q.Title, &q.Description, &q.Status, &priority, &q.Notes, &q.CreatedAt, &q.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	q.Priority = fromNullInt64(priority)
	return nil
}

func (r *QuestRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE quests
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
