package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

var ErrParentDeleted = errors.New("parent record is deleted")

type trashSpec struct {
	kind          string
	table         string
	label         string
	parentDeleted string
}

var trashSpecs = []trashSpec{
	{kind: "session", table: "sessions", label: "printf('S%02d', session_number)",
		parentDeleted: `SELECT EXISTS(SELECT 1 FROM sessions s JOIN arcs a ON a.id = s.arc_id WHERE s.id = ? AND a.deleted_at IS NOT NULL)`},
	{kind: "arc", table: "arcs", label: "title"},
	{kind: "npc", table: "npcs", label: "name",
		parentDeleted: `SELECT EXISTS(SELECT 1 FROM npcs n JOIN locations l ON l.id = n.location_id WHERE n.id = ? AND l.deleted_at IS NOT NULL)`},
	{kind: "player_character", table: "player_characters", label: "character_name"},
	{kind: "location", table: "locations", label: "name",
		parentDeleted: `SELECT EXISTS(SELECT 1 FROM locations c JOIN locations p ON p.id = c.parent_location_id WHERE c.id = ? AND p.deleted_at IS NOT NULL)`},
	{kind: "group", table: "groups", label: "name"},
	{kind: "quest", table: "quests", label: "title"},
	{kind: "encounter", table: "encounters", label: "name"},
}

type TrashRepository struct {
	db *sql.DB
}

func NewTrashRepository(db *sql.DB) *TrashRepository {
	return &TrashRepository{db: db}
}

func (r *TrashRepository) List(ctx context.Context, campaignID int64) ([]models.TrashItem, error) {
	parts := make([]string, len(trashSpecs))
	args := make([]any, len(trashSpecs))
	for i, s := range trashSpecs {
		parts[i] = "SELECT '" + s.kind + "', id, " + s.label + ", deleted_at FROM " + s.table +
			" WHERE campaign_id = ? AND deleted_at IS NOT NULL"
		args[i] = campaignID
	}
	rows, err := r.db.QueryContext(ctx, strings.Join(parts, " UNION ALL ")+" ORDER BY 4 DESC, 2 DESC", args...)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = rows.Close()
	}()

	items := []models.TrashItem{}
	for rows.Next() {
		var it models.TrashItem
		if err := rows.Scan(&it.Kind, &it.ID, &it.Label, &it.DeletedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *TrashRepository) Restore(ctx context.Context, campaignID int64, kind string, id int64) error {
	for _, s := range trashSpecs {
		if s.kind != kind {
			continue
		}
		inTrash, err := hasActive(ctx, r.db,
			"SELECT EXISTS(SELECT 1 FROM "+s.table+" WHERE id = ? AND campaign_id = ? AND deleted_at IS NOT NULL)",
			id, campaignID,
		)
		if err != nil {
			return err
		}
		if !inTrash {
			return ErrNotFound
		}
		if s.parentDeleted != "" {
			blocked, err := hasActive(ctx, r.db, s.parentDeleted, id)
			if err != nil {
				return err
			}
			if blocked {
				return ErrParentDeleted
			}
		}
		err = r.db.QueryRowContext(ctx,
			"UPDATE "+s.table+" SET deleted_at = NULL WHERE id = ? AND campaign_id = ? AND deleted_at IS NOT NULL RETURNING id",
			id, campaignID,
		).Scan(&id)
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return mapConflict(err)
	}
	return ErrNotFound
}
