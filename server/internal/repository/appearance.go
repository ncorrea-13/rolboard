package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type AppearanceRepository struct {
	db *sql.DB
}

func NewAppearanceRepository(db *sql.DB) *AppearanceRepository {
	return &AppearanceRepository{db: db}
}

func (r *AppearanceRepository) sessions(ctx context.Context, query string, id int64) ([]models.SessionRef, error) {
	rows, err := r.db.QueryContext(ctx, query, id)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	refs := []models.SessionRef{}
	for rows.Next() {
		var s models.SessionRef
		if err := rows.Scan(&s.ID, &s.SessionNumber, &s.SubNumber, &s.SessionType, &s.Title); err != nil {
			return nil, err
		}
		refs = append(refs, s)
	}
	return refs, rows.Err()
}

func (r *AppearanceRepository) encounters(ctx context.Context, column string, id int64) ([]models.EncounterRef, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT e.id, e.name
		FROM encounter_participants ep
		JOIN encounters e ON e.id = ep.encounter_id AND e.deleted_at IS NULL
		WHERE ep.`+column+` = ? AND ep.deleted_at IS NULL
		ORDER BY e.id DESC`, id)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	refs := []models.EncounterRef{}
	for rows.Next() {
		var e models.EncounterRef
		if err := rows.Scan(&e.ID, &e.Name); err != nil {
			return nil, err
		}
		refs = append(refs, e)
	}
	return refs, rows.Err()
}

func (r *AppearanceRepository) ForNPC(ctx context.Context, npcID int64) (*models.Appearances, error) {
	a := &models.Appearances{Quests: []models.QuestRef{}, Secrets: []models.SecretRef{}}

	var err error
	a.Sessions, err = r.sessions(ctx, `
		SELECT s.id, s.session_number, s.sub_number, s.session_type, s.title
		FROM session_npcs sn
		JOIN sessions s ON s.id = sn.session_id AND s.deleted_at IS NULL
		WHERE sn.npc_id = ?
		ORDER BY (s.date = ''), s.date, s.session_number, s.sub_number`, npcID)
	if err != nil {
		return nil, err
	}

	a.Encounters, err = r.encounters(ctx, "npc_id", npcID)
	if err != nil {
		return nil, err
	}

	qrows, err := r.db.QueryContext(ctx, `
		SELECT q.id, q.title, q.status, COALESCE(qn.role, '')
		FROM quest_npcs qn
		JOIN quests q ON q.id = qn.quest_id AND q.deleted_at IS NULL
		WHERE qn.npc_id = ?
		ORDER BY q.title`, npcID)
	if err != nil {
		return nil, err
	}
	for qrows.Next() {
		var q models.QuestRef
		if err := qrows.Scan(&q.ID, &q.Title, &q.Status, &q.Role); err != nil {
			_ = qrows.Close()
			return nil, err
		}
		a.Quests = append(a.Quests, q)
	}
	if err := qrows.Err(); err != nil {
		_ = qrows.Close()
		return nil, err
	}
	_ = qrows.Close()

	srows, err := r.db.QueryContext(ctx, `
		SELECT id, title, status FROM secrets
		WHERE deleted_at IS NULL
		  AND (npc_id = ? OR id IN (SELECT secret_id FROM secret_npcs WHERE npc_id = ?))
		ORDER BY status DESC, title`, npcID, npcID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = srows.Close() }()
	for srows.Next() {
		var s models.SecretRef
		if err := srows.Scan(&s.ID, &s.Title, &s.Status); err != nil {
			return nil, err
		}
		a.Secrets = append(a.Secrets, s)
	}
	return a, srows.Err()
}

func (r *AppearanceRepository) ForPC(ctx context.Context, pcID int64) (*models.Appearances, error) {
	a := &models.Appearances{Quests: []models.QuestRef{}, Secrets: []models.SecretRef{}}

	var err error
	a.Sessions, err = r.sessions(ctx, `
		SELECT s.id, s.session_number, s.sub_number, s.session_type, s.title
		FROM session_pcs sp
		JOIN sessions s ON s.id = sp.session_id AND s.deleted_at IS NULL
		WHERE sp.pc_id = ?
		ORDER BY (s.date = ''), s.date, s.session_number, s.sub_number`, pcID)
	if err != nil {
		return nil, err
	}
	a.Encounters, err = r.encounters(ctx, "pc_id", pcID)
	if err != nil {
		return nil, err
	}
	return a, nil
}
