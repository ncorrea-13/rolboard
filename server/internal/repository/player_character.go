package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type PlayerCharacterRepository struct {
	db *sql.DB
}

func NewPlayerCharacterRepository(db *sql.DB) *PlayerCharacterRepository {
	return &PlayerCharacterRepository{db: db}
}

func (r *PlayerCharacterRepository) List(ctx context.Context, campaignID int64) ([]models.PlayerCharacter, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, player_name, character_name, race, class, status, spren_npc_id, backstory, progression_notes, obsidian_path, created_at, updated_at
		FROM player_characters WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY character_name`,
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

	var pcs []models.PlayerCharacter
	for rows.Next() {
		p := models.PlayerCharacter{}
		var obsidianPath sql.NullString
		var sprenNPCID sql.NullInt64
		if err := rows.Scan(&p.ID, &p.CampaignID, &p.PlayerName, &p.CharacterName, &p.Race, &p.Class, &p.Status, &sprenNPCID, &p.Backstory, &p.ProgressionNotes, &obsidianPath, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.ObsidianPath = fromNullString(obsidianPath)
		p.SprenNPCID = fromNullInt64(sprenNPCID)
		pcs = append(pcs, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return pcs, nil
}

func (r *PlayerCharacterRepository) Create(ctx context.Context, p *models.PlayerCharacter) error {
	var obsidianPath sql.NullString
	var sprenNPCID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO player_characters (campaign_id, player_name, character_name, race, class, status, backstory, progression_notes, obsidian_path)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (campaign_id, obsidian_path) DO UPDATE SET
			player_name = excluded.player_name, character_name = excluded.character_name,
			race = excluded.race, class = excluded.class, status = excluded.status,
			backstory = excluded.backstory, progression_notes = excluded.progression_notes, deleted_at = NULL, updated_at = datetime('now')
		RETURNING id, campaign_id, player_name, character_name, race, class, status, spren_npc_id, backstory, progression_notes, obsidian_path, created_at, updated_at`,
		p.CampaignID, p.PlayerName, p.CharacterName, p.Race, p.Class, p.Status, p.Backstory, p.ProgressionNotes, toNullString(p.ObsidianPath),
	).Scan(&p.ID, &p.CampaignID, &p.PlayerName, &p.CharacterName, &p.Race, &p.Class, &p.Status, &sprenNPCID, &p.Backstory, &p.ProgressionNotes, &obsidianPath, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return err
	}
	p.ObsidianPath = fromNullString(obsidianPath)
	p.SprenNPCID = fromNullInt64(sprenNPCID)
	return nil
}

func (r *PlayerCharacterRepository) GetByID(ctx context.Context, id int64) (*models.PlayerCharacter, error) {
	p := models.PlayerCharacter{}
	var obsidianPath sql.NullString
	var sprenNPCID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, player_name, character_name, race, class, status, spren_npc_id, backstory, progression_notes, obsidian_path, created_at, updated_at
		FROM player_characters WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&p.ID, &p.CampaignID, &p.PlayerName, &p.CharacterName, &p.Race, &p.Class, &p.Status, &sprenNPCID, &p.Backstory, &p.ProgressionNotes, &obsidianPath, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	p.ObsidianPath = fromNullString(obsidianPath)
	p.SprenNPCID = fromNullInt64(sprenNPCID)
	return &p, nil
}

// Update no toca spren_npc_id a propósito: es un dato que solo resuelve el
// indexer del vault (ver Indexer, tabla pc_groups y columna spren_npc_id) —
// el form del dashboard no lo edita todavía.
func (r *PlayerCharacterRepository) Update(ctx context.Context, id int64, p *models.PlayerCharacter) error {
	var obsidianPath sql.NullString
	var sprenNPCID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		UPDATE player_characters
		SET player_name = ?, character_name = ?, race = ?, class = ?, status = ?, backstory = ?, progression_notes = ?, obsidian_path = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, campaign_id, player_name, character_name, race, class, status, spren_npc_id, backstory, progression_notes, obsidian_path, created_at, updated_at`,
		p.PlayerName, p.CharacterName, p.Race, p.Class, p.Status, p.Backstory, p.ProgressionNotes, toNullString(p.ObsidianPath), id,
	).Scan(&p.ID, &p.CampaignID, &p.PlayerName, &p.CharacterName, &p.Race, &p.Class, &p.Status, &sprenNPCID, &p.Backstory, &p.ProgressionNotes, &obsidianPath, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	p.ObsidianPath = fromNullString(obsidianPath)
	p.SprenNPCID = fromNullInt64(sprenNPCID)
	return nil
}

func (r *PlayerCharacterRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE player_characters
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
