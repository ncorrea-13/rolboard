package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var imageTables = map[string]bool{
	"items":        true,
	"arcs":         true,
	"lore_entries": true,
	"quests":       true,
}

var errUnknownImageTable = errors.New("table does not store images")

// EntityImageRepository reads and writes the image_path column of the tables
// that keep a single image per row.
type EntityImageRepository struct {
	db *sql.DB
}

func NewEntityImageRepository(db *sql.DB) *EntityImageRepository {
	return &EntityImageRepository{db: db}
}

func (r *EntityImageRepository) Path(ctx context.Context, table string, id int64) (*string, error) {
	if !imageTables[table] {
		return nil, fmt.Errorf("%w: %s", errUnknownImageTable, table)
	}
	var path sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT image_path FROM `+table+` WHERE id = ? AND deleted_at IS NULL`, id,
	).Scan(&path)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return fromNullString(path), nil
}

func (r *EntityImageRepository) SetPath(ctx context.Context, table string, id int64, path *string) error {
	if !imageTables[table] {
		return fmt.Errorf("%w: %s", errUnknownImageTable, table)
	}
	res, err := r.db.ExecContext(ctx,
		`UPDATE `+table+` SET image_path = ?, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`,
		toNullString(path), id,
	)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}
