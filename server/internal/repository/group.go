package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type GroupRepository struct {
	db *sql.DB
}

func NewGroupRepository(db *sql.DB) *GroupRepository {
	return &GroupRepository{db: db}
}

func (r *GroupRepository) List(ctx context.Context, campaignID int64) ([]models.Group, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, campaign_id, name, description, notes, alineacion, lider_npc_id, obsidian_path,
			(SELECT COUNT(*) FROM npc_groups WHERE npc_groups.group_id = groups.id) AS member_count,
			created_at, updated_at
		FROM groups WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY name`,
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

	var groups []models.Group
	for rows.Next() {
		g := models.Group{}
		var obsidianPath sql.NullString
		var liderNPCID sql.NullInt64
		if err := rows.Scan(&g.ID, &g.CampaignID, &g.Name, &g.Description, &g.Notes, &g.Alineacion, &liderNPCID, &obsidianPath, &g.MemberCount, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		g.ObsidianPath = fromNullString(obsidianPath)
		g.LiderNPCID = fromNullInt64(liderNPCID)
		groups = append(groups, g)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return groups, nil
}

func (r *GroupRepository) Create(ctx context.Context, g *models.Group) error {
	var obsidianPath sql.NullString
	var liderNPCID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO groups (campaign_id, name, description, notes, alineacion, lider_npc_id, obsidian_path)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (campaign_id, obsidian_path) DO UPDATE SET
			name = excluded.name, description = excluded.description, notes = excluded.notes,
			alineacion = excluded.alineacion, lider_npc_id = excluded.lider_npc_id, deleted_at = NULL, updated_at = datetime('now')
		RETURNING id, campaign_id, name, description, notes, alineacion, lider_npc_id, obsidian_path, created_at, updated_at`,
		g.CampaignID, g.Name, g.Description, g.Notes, g.Alineacion, toNullInt64(g.LiderNPCID), toNullString(g.ObsidianPath),
	).Scan(&g.ID, &g.CampaignID, &g.Name, &g.Description, &g.Notes, &g.Alineacion, &liderNPCID, &obsidianPath, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		return err
	}
	g.ObsidianPath = fromNullString(obsidianPath)
	g.LiderNPCID = fromNullInt64(liderNPCID)
	return nil
}

func (r *GroupRepository) GetByID(ctx context.Context, id int64) (*models.Group, error) {
	g := models.Group{}
	var obsidianPath sql.NullString
	var liderNPCID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, name, description, notes, alineacion, lider_npc_id, obsidian_path, created_at, updated_at
		FROM groups WHERE id = ? AND deleted_at IS NULL`,
		id,
	).Scan(&g.ID, &g.CampaignID, &g.Name, &g.Description, &g.Notes, &g.Alineacion, &liderNPCID, &obsidianPath, &g.CreatedAt, &g.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	g.ObsidianPath = fromNullString(obsidianPath)
	g.LiderNPCID = fromNullInt64(liderNPCID)
	return &g, nil
}

func (r *GroupRepository) GetMembers(ctx context.Context, groupID int64) ([]models.NPCGroupMember, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT npcs.id, npcs.name, npc_groups.role_in_group
		FROM npc_groups
			JOIN npcs ON npcs.id = npc_groups.npc_id
		WHERE npc_groups.group_id = ?
		  AND npc_groups.source != 'removed'
		  AND npcs.deleted_at IS NULL
		ORDER BY npcs.name
		`, groupID)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			return
		}
	}()
	var members []models.NPCGroupMember
	for rows.Next() {
		m := models.NPCGroupMember{}
		var roleInGroup sql.NullString
		if err := rows.Scan(&m.NPCID, &m.Name, &roleInGroup); err != nil {
			return nil, err
		}
		m.RoleInGroup = fromNullString(roleInGroup)
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return members, nil
}

func (r *GroupRepository) GetPCMembers(ctx context.Context, groupID int64) ([]models.PCGroupMember, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT player_characters.id, player_characters.character_name, pc_groups.role_in_group
		FROM pc_groups
			JOIN player_characters ON player_characters.id = pc_groups.pc_id
		WHERE pc_groups.group_id = ?
		  AND pc_groups.source != 'removed'
		  AND player_characters.deleted_at IS NULL
		ORDER BY player_characters.character_name
		`, groupID)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			return
		}
	}()
	var members []models.PCGroupMember
	for rows.Next() {
		m := models.PCGroupMember{}
		var roleInGroup sql.NullString
		if err := rows.Scan(&m.PCID, &m.CharacterName, &roleInGroup); err != nil {
			return nil, err
		}
		m.RoleInGroup = fromNullString(roleInGroup)
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return members, nil
}

func (r *GroupRepository) AddMember(ctx context.Context, groupID, npcID int64) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO npc_groups (group_id, npc_id, source) VALUES (?, ?, 'dashboard')
		ON CONFLICT (npc_id, group_id) DO UPDATE SET source = 'dashboard'`,
		groupID, npcID,
	)
	return err
}

func (r *GroupRepository) AddPCMember(ctx context.Context, groupID, pcID int64) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO pc_groups (group_id, pc_id, source) VALUES (?, ?, 'dashboard')
		ON CONFLICT (pc_id, group_id) DO UPDATE SET source = 'dashboard'`,
		groupID, pcID,
	)
	return err
}

func (r *GroupRepository) RemovePCMember(ctx context.Context, groupID, pcID int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE pc_groups SET source = 'removed' WHERE group_id = ? AND pc_id = ?`,
		groupID, pcID,
	)
	return err
}

func (r *GroupRepository) RemoveMember(ctx context.Context, groupID, npcID int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE npc_groups SET source = 'removed' WHERE group_id = ? AND npc_id = ?`,
		groupID, npcID,
	)
	return err
}

func (r *GroupRepository) Update(ctx context.Context, id int64, g *models.Group) error {
	var obsidianPath sql.NullString
	var liderNPCID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		UPDATE groups
		SET name = ?, description = ?, notes = ?, alineacion = ?, lider_npc_id = ?, obsidian_path = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, campaign_id, name, description, notes, alineacion, lider_npc_id, obsidian_path, created_at, updated_at`,
		g.Name, g.Description, g.Notes, g.Alineacion, toNullInt64(g.LiderNPCID), toNullString(g.ObsidianPath), id,
	).Scan(&g.ID, &g.CampaignID, &g.Name, &g.Description, &g.Notes, &g.Alineacion, &liderNPCID, &obsidianPath, &g.CreatedAt, &g.UpdatedAt)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	g.ObsidianPath = fromNullString(obsidianPath)
	g.LiderNPCID = fromNullInt64(liderNPCID)
	return nil
}

func (r *GroupRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE groups
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
