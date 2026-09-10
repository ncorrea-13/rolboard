package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type NPCRepository struct {
	db *sql.DB
}

func NewNPCRepository(db *sql.DB) *NPCRepository {
	return &NPCRepository{db: db}
}

func (r *NPCRepository) List(ctx context.Context, campaignID int64) ([]models.NPC, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, name, npc_kind, detail_level, status, location_id, etnia, rol, tipo_spren, description, notes, obsidian_path, created_at, updated_at
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
		var locationID sql.NullInt64
		var etnia, rol, tipoSpren, obsidianPath sql.NullString
		if err := rows.Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &etnia, &rol, &tipoSpren, &n.Description, &n.Notes, &obsidianPath, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		n.LocationID = fromNullInt64(locationID)
		n.Etnia = fromNullString(etnia)
		n.Rol = fromNullString(rol)
		n.TipoSpren = fromNullString(tipoSpren)
		n.ObsidianPath = fromNullString(obsidianPath)
		npcs = append(npcs, n)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return npcs, nil
}

func (r *NPCRepository) Create(ctx context.Context, n *models.NPC) error {
	var locationID sql.NullInt64
	var etnia, rol, tipoSpren, obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO npcs (campaign_id, name, npc_kind, detail_level, status, location_id, etnia, rol, tipo_spren, description, notes, obsidian_path)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (campaign_id, obsidian_path) DO UPDATE SET
			name = excluded.name, npc_kind = excluded.npc_kind, detail_level = excluded.detail_level,
			status = excluded.status, location_id = excluded.location_id, etnia = excluded.etnia,
			rol = excluded.rol, tipo_spren = excluded.tipo_spren,
			description = excluded.description, notes = excluded.notes, deleted_at = NULL, updated_at = datetime('now')
		RETURNING id, campaign_id, name, npc_kind, detail_level, status, location_id, etnia, rol, tipo_spren, description, notes, obsidian_path, created_at, updated_at`,
		n.CampaignID, n.Name, n.NPCKind, n.DetailLevel, n.Status, toNullInt64(n.LocationID), toNullString(n.Etnia), toNullString(n.Rol), toNullString(n.TipoSpren), n.Description, n.Notes, toNullString(n.ObsidianPath),
	).Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &etnia, &rol, &tipoSpren, &n.Description, &n.Notes, &obsidianPath, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		return err
	}
	n.LocationID = fromNullInt64(locationID)
	n.Etnia = fromNullString(etnia)
	n.Rol = fromNullString(rol)
	n.TipoSpren = fromNullString(tipoSpren)
	n.ObsidianPath = fromNullString(obsidianPath)
	return nil
}

func (r *NPCRepository) GetByID(ctx context.Context, id int64) (*models.NPC, error) {
	n := models.NPC{}
	var locationID sql.NullInt64
	var etnia, rol, tipoSpren, obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, name, npc_kind, detail_level, status, location_id, etnia, rol, tipo_spren, description, notes, obsidian_path, created_at, updated_at
		FROM npcs WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &etnia, &rol, &tipoSpren, &n.Description, &n.Notes, &obsidianPath, &n.CreatedAt, &n.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	n.LocationID = fromNullInt64(locationID)
	n.Etnia = fromNullString(etnia)
	n.Rol = fromNullString(rol)
	n.TipoSpren = fromNullString(tipoSpren)
	n.ObsidianPath = fromNullString(obsidianPath)
	return &n, nil
}

func (r *NPCRepository) Update(ctx context.Context, id int64, n *models.NPC) error {
	var locationID sql.NullInt64
	var etnia, rol, tipoSpren, obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		UPDATE npcs
		SET name = ?, npc_kind = ?, detail_level = ?, status = ?, location_id = ?, etnia = ?, rol = ?, tipo_spren = ?, description = ?, notes = ?, obsidian_path = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, campaign_id, name, npc_kind, detail_level, status, location_id, etnia, rol, tipo_spren, description, notes, obsidian_path, created_at, updated_at`,
		n.Name, n.NPCKind, n.DetailLevel, n.Status, toNullInt64(n.LocationID), toNullString(n.Etnia), toNullString(n.Rol), toNullString(n.TipoSpren), n.Description, n.Notes, toNullString(n.ObsidianPath), id,
	).Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &etnia, &rol, &tipoSpren, &n.Description, &n.Notes, &obsidianPath, &n.CreatedAt, &n.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	n.LocationID = fromNullInt64(locationID)
	n.Etnia = fromNullString(etnia)
	n.Rol = fromNullString(rol)
	n.TipoSpren = fromNullString(tipoSpren)
	n.ObsidianPath = fromNullString(obsidianPath)
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
