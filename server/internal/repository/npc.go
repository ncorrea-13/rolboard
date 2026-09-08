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
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, name, npc_kind, detail_level, status, location_id, etnia, rol, vinculo_con, tipo_spren, description, notes, obsidian_path, created_at, updated_at
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
		var locationID, vinculoCon sql.NullInt64
		var etnia, rol, tipoSpren, obsidianPath sql.NullString
		if err := rows.Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &etnia, &rol, &vinculoCon, &tipoSpren, &n.Description, &n.Notes, &obsidianPath, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		n.LocationID = fromNullInt64(locationID)
		n.VinculoCon = fromNullInt64(vinculoCon)
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
	var locationID, vinculoCon sql.NullInt64
	var etnia, rol, tipoSpren, obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO npcs (campaign_id, name, npc_kind, detail_level, status, location_id, etnia, rol, vinculo_con, tipo_spren, description, notes, obsidian_path)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id, campaign_id, name, npc_kind, detail_level, status, location_id, etnia, rol, vinculo_con, tipo_spren, description, notes, obsidian_path, created_at, updated_at`,
		n.CampaignID, n.Name, n.NPCKind, n.DetailLevel, n.Status, toNullInt64(n.LocationID), toNullString(n.Etnia), toNullString(n.Rol), toNullInt64(n.VinculoCon), toNullString(n.TipoSpren), n.Description, n.Notes, toNullString(n.ObsidianPath),
	).Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &etnia, &rol, &vinculoCon, &tipoSpren, &n.Description, &n.Notes, &obsidianPath, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		return err
	}
	n.LocationID = fromNullInt64(locationID)
	n.VinculoCon = fromNullInt64(vinculoCon)
	n.Etnia = fromNullString(etnia)
	n.Rol = fromNullString(rol)
	n.TipoSpren = fromNullString(tipoSpren)
	n.ObsidianPath = fromNullString(obsidianPath)
	return nil
}

func (r *NPCRepository) GetByID(ctx context.Context, id int64) (*models.NPC, error) {
	n := models.NPC{}
	var locationID, vinculoCon sql.NullInt64
	var etnia, rol, tipoSpren, obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, name, npc_kind, detail_level, status, location_id, etnia, rol, vinculo_con, tipo_spren, description, notes, obsidian_path, created_at, updated_at
		FROM npcs WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &etnia, &rol, &vinculoCon, &tipoSpren, &n.Description, &n.Notes, &obsidianPath, &n.CreatedAt, &n.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	n.LocationID = fromNullInt64(locationID)
	n.VinculoCon = fromNullInt64(vinculoCon)
	n.Etnia = fromNullString(etnia)
	n.Rol = fromNullString(rol)
	n.TipoSpren = fromNullString(tipoSpren)
	n.ObsidianPath = fromNullString(obsidianPath)
	return &n, nil
}

func (r *NPCRepository) Update(ctx context.Context, id int64, n *models.NPC) error {
	var locationID, vinculoCon sql.NullInt64
	var etnia, rol, tipoSpren, obsidianPath sql.NullString
	err := r.db.QueryRowContext(ctx, `
		UPDATE npcs
		SET name = ?, npc_kind = ?, detail_level = ?, status = ?, location_id = ?, etnia = ?, rol = ?, vinculo_con = ?, tipo_spren = ?, description = ?, notes = ?, obsidian_path = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, campaign_id, name, npc_kind, detail_level, status, location_id, etnia, rol, vinculo_con, tipo_spren, description, notes, obsidian_path, created_at, updated_at`,
		n.Name, n.NPCKind, n.DetailLevel, n.Status, toNullInt64(n.LocationID), toNullString(n.Etnia), toNullString(n.Rol), toNullInt64(n.VinculoCon), toNullString(n.TipoSpren), n.Description, n.Notes, toNullString(n.ObsidianPath), id,
	).Scan(&n.ID, &n.CampaignID, &n.Name, &n.NPCKind, &n.DetailLevel, &n.Status, &locationID, &etnia, &rol, &vinculoCon, &tipoSpren, &n.Description, &n.Notes, &obsidianPath, &n.CreatedAt, &n.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	n.LocationID = fromNullInt64(locationID)
	n.VinculoCon = fromNullInt64(vinculoCon)
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
