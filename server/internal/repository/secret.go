package repository

import (
	"context"
	"database/sql"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

const secretColumns = `id, campaign_id, title, body, status, revealed_session_id, npc_id, location_id, lore_entry_id, created_at, updated_at`

type SecretRepository struct {
	db *sql.DB
}

func NewSecretRepository(db *sql.DB) *SecretRepository {
	return &SecretRepository{db: db}
}

func scanSecret(row loreScanner, s *models.Secret) error {
	var sessionID, npcID, locationID, loreID sql.NullInt64
	if err := row.Scan(&s.ID, &s.CampaignID, &s.Title, &s.Body, &s.Status, &sessionID, &npcID, &locationID, &loreID, &s.CreatedAt, &s.UpdatedAt); err != nil {
		return err
	}
	s.RevealedSessionID = fromNullInt64(sessionID)
	s.NPCID = fromNullInt64(npcID)
	s.LocationID = fromNullInt64(locationID)
	s.LoreEntryID = fromNullInt64(loreID)
	s.KnownByNPCIDs = []int64{}
	return nil
}

func (r *SecretRepository) knownBy(ctx context.Context, q interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}, where string, arg int64) (map[int64][]int64, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT sn.secret_id, sn.npc_id
		FROM secret_npcs sn
		JOIN npcs n ON n.id = sn.npc_id AND n.deleted_at IS NULL
		JOIN secrets s ON s.id = sn.secret_id
		WHERE `+where+`
		ORDER BY n.name`, arg)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	result := map[int64][]int64{}
	for rows.Next() {
		var secretID, npcID int64
		if err := rows.Scan(&secretID, &npcID); err != nil {
			return nil, err
		}
		result[secretID] = append(result[secretID], npcID)
	}
	return result, rows.Err()
}

func (r *SecretRepository) List(ctx context.Context, campaignID int64) ([]models.Secret, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+secretColumns+` FROM secrets WHERE campaign_id = ? AND deleted_at IS NULL ORDER BY status DESC, updated_at DESC, id DESC`,
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	secrets := []models.Secret{}
	for rows.Next() {
		var s models.Secret
		if err := scanSecret(rows, &s); err != nil {
			_ = rows.Close()
			return nil, err
		}
		secrets = append(secrets, s)
	}
	if err := rows.Err(); err != nil {
		_ = rows.Close()
		return nil, err
	}
	_ = rows.Close()

	known, err := r.knownBy(ctx, r.db, "s.campaign_id = ? AND s.deleted_at IS NULL", campaignID)
	if err != nil {
		return nil, err
	}
	for i := range secrets {
		if ids, ok := known[secrets[i].ID]; ok {
			secrets[i].KnownByNPCIDs = ids
		}
	}
	return secrets, nil
}

func replaceKnownBy(ctx context.Context, tx *sql.Tx, secretID int64, npcIDs []int64) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM secret_npcs WHERE secret_id = ?`, secretID); err != nil {
		return err
	}
	for _, npcID := range npcIDs {
		if _, err := tx.ExecContext(ctx,
			`INSERT OR IGNORE INTO secret_npcs (secret_id, npc_id) VALUES (?, ?)`, secretID, npcID,
		); err != nil {
			return err
		}
	}
	return nil
}

func (r *SecretRepository) loadKnownBy(ctx context.Context, s *models.Secret) error {
	known, err := r.knownBy(ctx, r.db, "s.id = ?", s.ID)
	if err != nil {
		return err
	}
	if ids, ok := known[s.ID]; ok {
		s.KnownByNPCIDs = ids
	}
	return nil
}

func (r *SecretRepository) Create(ctx context.Context, s *models.Secret) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	known := s.KnownByNPCIDs
	err = scanSecret(tx.QueryRowContext(ctx, `
		INSERT INTO secrets (campaign_id, title, body, status, revealed_session_id, npc_id, location_id, lore_entry_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING `+secretColumns,
		s.CampaignID, s.Title, s.Body, s.Status, toNullInt64(s.RevealedSessionID),
		toNullInt64(s.NPCID), toNullInt64(s.LocationID), toNullInt64(s.LoreEntryID),
	), s)
	if err != nil {
		return err
	}
	if err := replaceKnownBy(ctx, tx, s.ID, known); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return r.loadKnownBy(ctx, s)
}

func (r *SecretRepository) GetByID(ctx context.Context, id int64) (*models.Secret, error) {
	var s models.Secret
	err := scanSecret(r.db.QueryRowContext(ctx,
		`SELECT `+secretColumns+` FROM secrets WHERE id = ? AND deleted_at IS NULL`, id,
	), &s)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := r.loadKnownBy(ctx, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *SecretRepository) Update(ctx context.Context, id int64, s *models.Secret) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	known := s.KnownByNPCIDs
	err = scanSecret(tx.QueryRowContext(ctx, `
		UPDATE secrets
		SET title = ?, body = ?, status = ?, revealed_session_id = ?, npc_id = ?, location_id = ?, lore_entry_id = ?,
			updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING `+secretColumns,
		s.Title, s.Body, s.Status, toNullInt64(s.RevealedSessionID),
		toNullInt64(s.NPCID), toNullInt64(s.LocationID), toNullInt64(s.LoreEntryID), id,
	), s)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if err := replaceKnownBy(ctx, tx, s.ID, known); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	return r.loadKnownBy(ctx, s)
}

func (r *SecretRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE secrets
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
