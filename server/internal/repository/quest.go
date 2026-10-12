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
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, title, description, status, priority, notes, image_path, created_at, updated_at
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
		var imagePath sql.NullString
		if err := rows.Scan(&q.ID, &q.CampaignID, &q.Title, &q.Description, &q.Status, &priority, &q.Notes, &imagePath, &q.CreatedAt, &q.UpdatedAt); err != nil {
			return nil, err
		}
		q.Priority = fromNullInt64(priority)
		q.ImagePath = fromNullString(imagePath)
		quests = append(quests, q)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return quests, nil
}

func (r *QuestRepository) Create(ctx context.Context, q *models.Quest) error {
	var priority sql.NullInt64
	var imagePath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO quests (campaign_id, title, description, status, priority, notes)
		VALUES (?, ?, ?, ?, ?, ?)
		RETURNING id, campaign_id, title, description, status, priority, notes, image_path, created_at, updated_at`,
		q.CampaignID, q.Title, q.Description, q.Status, toNullInt64(q.Priority), q.Notes,
	).Scan(&q.ID, &q.CampaignID, &q.Title, &q.Description, &q.Status, &priority, &q.Notes, &imagePath, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		return err
	}
	q.Priority = fromNullInt64(priority)
	q.ImagePath = fromNullString(imagePath)
	return nil
}

func (r *QuestRepository) GetByID(ctx context.Context, id int64) (*models.Quest, error) {
	q := models.Quest{}
	var priority sql.NullInt64
	var imagePath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, title, description, status, priority, notes, image_path, created_at, updated_at
		FROM quests WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&q.ID, &q.CampaignID, &q.Title, &q.Description, &q.Status, &priority, &q.Notes, &imagePath, &q.CreatedAt, &q.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	q.Priority = fromNullInt64(priority)
	q.ImagePath = fromNullString(imagePath)
	return &q, nil
}

func (r *QuestRepository) Update(ctx context.Context, id int64, q *models.Quest) error {
	var priority sql.NullInt64
	var imagePath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		UPDATE quests
		SET title = ?, description = ?, status = ?, priority = ?, notes = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, campaign_id, title, description, status, priority, notes, image_path, created_at, updated_at`,
		q.Title, q.Description, q.Status, toNullInt64(q.Priority), q.Notes, id,
	).Scan(&q.ID, &q.CampaignID, &q.Title, &q.Description, &q.Status, &priority, &q.Notes, &imagePath, &q.CreatedAt, &q.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	q.Priority = fromNullInt64(priority)
	q.ImagePath = fromNullString(imagePath)
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

func (r *QuestRepository) ListNpcs(ctx context.Context, questID int64) ([]models.QuestNpc, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT n.id, n.name, COALESCE(qn.role, '')
		FROM quest_npcs qn
		JOIN npcs n ON n.id = qn.npc_id AND n.deleted_at IS NULL
		WHERE qn.quest_id = ?
		ORDER BY n.name`,
		questID,
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	npcs := []models.QuestNpc{}
	for rows.Next() {
		var n models.QuestNpc
		if err := rows.Scan(&n.NPCID, &n.Name, &n.Role); err != nil {
			return nil, err
		}
		npcs = append(npcs, n)
	}
	return npcs, rows.Err()
}

func (r *QuestRepository) SetNpc(ctx context.Context, questID, npcID int64, role string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO quest_npcs (quest_id, npc_id, role) VALUES (?, ?, ?)
		ON CONFLICT (quest_id, npc_id) DO UPDATE SET role = excluded.role`,
		questID, npcID, nullIfEmpty(role),
	)
	return err
}

func (r *QuestRepository) RemoveNpc(ctx context.Context, questID, npcID int64) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM quest_npcs WHERE quest_id = ? AND npc_id = ?`, questID, npcID)
	return err
}
