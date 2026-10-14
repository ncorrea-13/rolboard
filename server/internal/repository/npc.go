package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type NPCRepository struct {
	db *sql.DB
}

func NewNPCRepository(db *sql.DB) *NPCRepository {
	return &NPCRepository{db: db}
}

func (r *NPCRepository) List(ctx context.Context, campaignID int64) ([]models.NPC, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, name, npc_kind, detail_level, status, location_id, origen, rol, subtipo, description, notes, attributes, skills, current_hp, max_hp, obsidian_path, image_path, created_at, updated_at
		FROM npcs WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY name`,
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

	var npcs []models.NPC
	for rows.Next() {
		n := models.NPC{}
		var locationID, currentHp, maxHp sql.NullInt64
		var origen, rol, subtipo, obsidianPath, imagePath sql.NullString
		var attributes, skills string
		if err := rows.Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &origen, &rol, &subtipo, &n.Description, &n.Notes, &attributes, &skills, &currentHp, &maxHp, &obsidianPath, &imagePath, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		n.LocationID = fromNullInt64(locationID)
		n.Origen = fromNullString(origen)
		n.Rol = fromNullString(rol)
		n.Subtipo = fromNullString(subtipo)
		n.Attributes = json.RawMessage(attributes)
		n.Skills = json.RawMessage(skills)
		n.CurrentHp = fromNullInt64(currentHp)
		n.MaxHp = fromNullInt64(maxHp)
		n.ObsidianPath = fromNullString(obsidianPath)
		n.ImagePath = fromNullString(imagePath)
		npcs = append(npcs, n)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return npcs, nil
}

func (r *NPCRepository) Create(ctx context.Context, n *models.NPC) error {
	var locationID, currentHp, maxHp sql.NullInt64
	var origen, rol, subtipo, obsidianPath sql.NullString
	var attributes, skills string
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO npcs (campaign_id, name, npc_kind, detail_level, status, location_id, origen, rol, subtipo, description, notes, attributes, skills, current_hp, max_hp, obsidian_path)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (campaign_id, obsidian_path) DO UPDATE SET
			name = excluded.name, npc_kind = excluded.npc_kind, detail_level = excluded.detail_level,
			status = excluded.status, location_id = excluded.location_id, origen = excluded.origen,
			rol = excluded.rol, subtipo = excluded.subtipo,
			description = excluded.description, notes = excluded.notes, deleted_at = NULL, updated_at = datetime('now')
		RETURNING id, campaign_id, name, npc_kind, detail_level, status, location_id, origen, rol, subtipo, description, notes, attributes, skills, current_hp, max_hp, obsidian_path, created_at, updated_at`,
		n.CampaignID, n.Name, n.NPCKind, n.DetailLevel, n.Status, toNullInt64(n.LocationID), toNullString(n.Origen), toNullString(n.Rol), toNullString(n.Subtipo), n.Description, n.Notes, toJSONText(n.Attributes), toJSONText(n.Skills), toNullInt64(n.CurrentHp), toNullInt64(n.MaxHp), toNullString(n.ObsidianPath),
	).Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &origen, &rol, &subtipo, &n.Description, &n.Notes, &attributes, &skills, &currentHp, &maxHp, &obsidianPath, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		return err
	}
	n.LocationID = fromNullInt64(locationID)
	n.Origen = fromNullString(origen)
	n.Rol = fromNullString(rol)
	n.Subtipo = fromNullString(subtipo)
	n.Attributes = json.RawMessage(attributes)
	n.Skills = json.RawMessage(skills)
	n.CurrentHp = fromNullInt64(currentHp)
	n.MaxHp = fromNullInt64(maxHp)
	n.ObsidianPath = fromNullString(obsidianPath)
	return nil
}

func (r *NPCRepository) GetByID(ctx context.Context, id int64) (*models.NPC, error) {
	n := models.NPC{}
	var locationID, currentHp, maxHp sql.NullInt64
	var origen, rol, subtipo, obsidianPath, imagePath sql.NullString
	var attributes, skills string
	err := r.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, name, npc_kind, detail_level, status, location_id, origen, rol, subtipo, description, notes, attributes, skills, current_hp, max_hp, obsidian_path, image_path, created_at, updated_at
		FROM npcs WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &origen, &rol, &subtipo, &n.Description, &n.Notes, &attributes, &skills, &currentHp, &maxHp, &obsidianPath, &imagePath, &n.CreatedAt, &n.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	n.LocationID = fromNullInt64(locationID)
	n.Origen = fromNullString(origen)
	n.Rol = fromNullString(rol)
	n.Subtipo = fromNullString(subtipo)
	n.Attributes = json.RawMessage(attributes)
	n.Skills = json.RawMessage(skills)
	n.CurrentHp = fromNullInt64(currentHp)
	n.MaxHp = fromNullInt64(maxHp)
	n.ObsidianPath = fromNullString(obsidianPath)
	n.ImagePath = fromNullString(imagePath)
	return &n, nil
}

func (r *NPCRepository) SetImagePath(ctx context.Context, id int64, path *string) (*models.NPC, error) {
	query := `UPDATE npcs SET image_path = ?, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`
	res, err := r.db.ExecContext(ctx, query, toNullString(path), id)
	if err != nil {
		return nil, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected == 0 {
		return nil, ErrNotFound
	}
	return r.GetByID(ctx, id)
}

func (r *NPCRepository) Update(ctx context.Context, id int64, n *models.NPC) error {
	var locationID, currentHp, maxHp sql.NullInt64
	var origen, rol, subtipo, obsidianPath, imagePath sql.NullString
	var attributes, skills string
	err := r.db.QueryRowContext(ctx, `
		UPDATE npcs
		SET name = ?, npc_kind = ?, detail_level = ?, status = ?, location_id = ?, origen = ?, rol = ?, subtipo = ?, description = ?, notes = ?, attributes = ?, skills = ?, current_hp = ?, max_hp = ?, obsidian_path = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, campaign_id, name, npc_kind, detail_level, status, location_id, origen, rol, subtipo, description, notes, attributes, skills, current_hp, max_hp, obsidian_path, image_path, created_at, updated_at`,
		n.Name, n.NPCKind, n.DetailLevel, n.Status, toNullInt64(n.LocationID), toNullString(n.Origen), toNullString(n.Rol), toNullString(n.Subtipo), n.Description, n.Notes, toJSONText(n.Attributes), toJSONText(n.Skills), toNullInt64(n.CurrentHp), toNullInt64(n.MaxHp), toNullString(n.ObsidianPath), id,
	).Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &origen, &rol, &subtipo, &n.Description, &n.Notes, &attributes, &skills, &currentHp, &maxHp, &obsidianPath, &imagePath, &n.CreatedAt, &n.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	n.LocationID = fromNullInt64(locationID)
	n.Origen = fromNullString(origen)
	n.Rol = fromNullString(rol)
	n.Subtipo = fromNullString(subtipo)
	n.Attributes = json.RawMessage(attributes)
	n.Skills = json.RawMessage(skills)
	n.CurrentHp = fromNullInt64(currentHp)
	n.MaxHp = fromNullInt64(maxHp)
	n.ObsidianPath = fromNullString(obsidianPath)
	n.ImagePath = fromNullString(imagePath)
	return nil
}

func (r *NPCRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE npcs
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

func (r *NPCRepository) ListRelations(ctx context.Context, npcID int64) ([]models.NPCRelation, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT from_npc_id, to_npc_id, role FROM npc_relations
		WHERE from_npc_id = ? OR to_npc_id = ?`,
		npcID, npcID,
	)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			return
		}
	}()

	var relations []models.NPCRelation
	for rows.Next() {
		var rel models.NPCRelation
		if err := rows.Scan(&rel.FromNPCID, &rel.ToNPCID, &rel.Role); err != nil {
			return nil, err
		}
		relations = append(relations, rel)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return relations, nil
}

func (r *NPCRepository) CreateRelation(ctx context.Context, rel *models.NPCRelation) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO npc_relations (from_npc_id, to_npc_id, role) VALUES (?, ?, ?)
		ON CONFLICT (from_npc_id, to_npc_id, role) DO NOTHING`,
		rel.FromNPCID, rel.ToNPCID, rel.Role,
	)
	return err
}

func (r *NPCRepository) DeleteRelation(ctx context.Context, fromNPCID, toNPCID int64, role string) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM npc_relations WHERE from_npc_id = ? AND to_npc_id = ? AND role = ?`,
		fromNPCID, toNPCID, role,
	)
	return err
}

func (r *NPCRepository) ListPlayerLinks(ctx context.Context, npcID int64) ([]models.NPCPlayerRelation, error) {
	return r.listPlayerLinks(ctx, `r.npc_id = ?`, npcID)
}

func (r *NPCRepository) ListLinksOfPlayer(ctx context.Context, pcID int64) ([]models.NPCPlayerRelation, error) {
	return r.listPlayerLinks(ctx, `r.player_character_id = ?`, pcID)
}

func (r *NPCRepository) listPlayerLinks(ctx context.Context, where string, id int64) ([]models.NPCPlayerRelation, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT r.npc_id, r.player_character_id, r.role
		FROM npc_player_relations r
		JOIN npcs n ON n.id = r.npc_id AND n.deleted_at IS NULL
		JOIN player_characters p ON p.id = r.player_character_id AND p.deleted_at IS NULL
		WHERE r.source != 'removed' AND `+where+`
		ORDER BY n.name`, id)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			return
		}
	}()

	links := []models.NPCPlayerRelation{}
	for rows.Next() {
		var l models.NPCPlayerRelation
		if err := rows.Scan(&l.NPCID, &l.PlayerCharacterID, &l.Role); err != nil {
			return nil, err
		}
		links = append(links, l)
	}
	return links, rows.Err()
}

func (r *NPCRepository) SetPlayerLink(ctx context.Context, l *models.NPCPlayerRelation) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO npc_player_relations (npc_id, player_character_id, role, source) VALUES (?, ?, ?, 'dashboard')
		ON CONFLICT (npc_id, player_character_id) DO UPDATE SET role = excluded.role, source = 'dashboard'`,
		l.NPCID, l.PlayerCharacterID, l.Role,
	)
	return err
}

func (r *NPCRepository) RemovePlayerLink(ctx context.Context, npcID, pcID int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE npc_player_relations SET source = 'removed' WHERE npc_id = ? AND player_character_id = ?`,
		npcID, pcID,
	)
	return err
}
