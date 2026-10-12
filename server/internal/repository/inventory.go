package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

var ErrUnknownOwnerKind = errors.New("unknown inventory owner kind")

type inventoryTable struct{ table, column string }

var inventoryTables = map[string]inventoryTable{
	"pc":  {table: "pc_items", column: "pc_id"},
	"npc": {table: "npc_items", column: "npc_id"},
}

type InventoryRepository struct {
	db *sql.DB
}

func NewInventoryRepository(db *sql.DB) *InventoryRepository {
	return &InventoryRepository{db: db}
}

func (r *InventoryRepository) List(ctx context.Context, kind string, ownerID int64) ([]models.InventoryEntry, error) {
	t, ok := inventoryTables[kind]
	if !ok {
		return nil, ErrUnknownOwnerKind
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT i.id, i.name, inv.quantity, inv.notes
		FROM `+t.table+` inv
		JOIN items i ON i.id = inv.item_id AND i.deleted_at IS NULL
		WHERE inv.`+t.column+` = ?
		ORDER BY i.name`, ownerID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	entries := []models.InventoryEntry{}
	for rows.Next() {
		var e models.InventoryEntry
		if err := rows.Scan(&e.ItemID, &e.Name, &e.Quantity, &e.Notes); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (r *InventoryRepository) Set(ctx context.Context, kind string, ownerID, itemID, quantity int64, notes string) error {
	t, ok := inventoryTables[kind]
	if !ok {
		return ErrUnknownOwnerKind
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO `+t.table+` (`+t.column+`, item_id, quantity, notes) VALUES (?, ?, ?, ?)
		ON CONFLICT (`+t.column+`, item_id) DO UPDATE SET quantity = excluded.quantity, notes = excluded.notes`,
		ownerID, itemID, quantity, notes,
	)
	return err
}

func (r *InventoryRepository) Remove(ctx context.Context, kind string, ownerID, itemID int64) error {
	t, ok := inventoryTables[kind]
	if !ok {
		return ErrUnknownOwnerKind
	}
	_, err := r.db.ExecContext(ctx, `DELETE FROM `+t.table+` WHERE `+t.column+` = ? AND item_id = ?`, ownerID, itemID)
	return err
}
