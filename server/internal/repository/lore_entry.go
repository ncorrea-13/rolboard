package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

const loreEntryColumns = `id, campaign_id, category_id, title, body, arc_id, location_id, image_path, created_at, updated_at`

type LoreEntryRepository struct {
	db *sql.DB
}

func NewLoreEntryRepository(db *sql.DB) *LoreEntryRepository {
	return &LoreEntryRepository{db: db}
}

type loreScanner interface {
	Scan(dest ...any) error
}

func scanLoreEntry(row loreScanner, e *models.LoreEntry) error {
	var categoryID, arcID, locationID sql.NullInt64
	var imagePath sql.NullString
	if err := row.Scan(&e.ID, &e.CampaignID, &categoryID, &e.Title, &e.Body, &arcID, &locationID, &imagePath, &e.CreatedAt, &e.UpdatedAt); err != nil {
		return err
	}
	e.ImagePath = fromNullString(imagePath)
	e.CategoryID = fromNullInt64(categoryID)
	e.ArcID = fromNullInt64(arcID)
	e.LocationID = fromNullInt64(locationID)
	return nil
}

func (r *LoreEntryRepository) List(ctx context.Context, campaignID int64) ([]models.LoreEntry, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+loreEntryColumns+` FROM lore_entries WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY title`,
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	entries := []models.LoreEntry{}
	for rows.Next() {
		var e models.LoreEntry
		if err := scanLoreEntry(rows, &e); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (r *LoreEntryRepository) Create(ctx context.Context, e *models.LoreEntry) error {
	return scanLoreEntry(r.db.QueryRowContext(ctx, `
		INSERT INTO lore_entries (campaign_id, category_id, title, body, arc_id, location_id)
		VALUES (?, ?, ?, ?, ?, ?)
		RETURNING `+loreEntryColumns,
		e.CampaignID, toNullInt64(e.CategoryID), e.Title, e.Body, toNullInt64(e.ArcID), toNullInt64(e.LocationID),
	), e)
}

func (r *LoreEntryRepository) GetByID(ctx context.Context, id int64) (*models.LoreEntry, error) {
	var e models.LoreEntry
	err := scanLoreEntry(r.db.QueryRowContext(ctx,
		`SELECT `+loreEntryColumns+` FROM lore_entries WHERE id = ? AND deleted_at IS NULL`, id,
	), &e)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *LoreEntryRepository) Update(ctx context.Context, id int64, e *models.LoreEntry) error {
	err := scanLoreEntry(r.db.QueryRowContext(ctx, `
		UPDATE lore_entries
		SET category_id = ?, title = ?, body = ?, arc_id = ?, location_id = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING `+loreEntryColumns,
		toNullInt64(e.CategoryID), e.Title, e.Body, toNullInt64(e.ArcID), toNullInt64(e.LocationID), id,
	), e)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

func (r *LoreEntryRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE lore_entries
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
