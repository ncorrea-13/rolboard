package repository

import (
	"context"
	"database/sql"
)

type VaultFileStateRepository struct {
	db *sql.DB
}

func NewVaultFileStateRepository(db *sql.DB) *VaultFileStateRepository {
	return &VaultFileStateRepository{db: db}
}

type VaultFileState struct {
	ContentHash string
	EntityType  string
	EntityID    int64
}

func (r *VaultFileStateRepository) Get(ctx context.Context, campaignID int64, path string) (*VaultFileState, error) {
	s := VaultFileState{}
	err := r.db.QueryRowContext(ctx, `
		SELECT content_hash, entity_type, entity_id FROM vault_file_state
		WHERE campaign_id = ? AND path = ?`,
		campaignID, path,
	).Scan(&s.ContentHash, &s.EntityType, &s.EntityID)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *VaultFileStateRepository) Set(ctx context.Context, campaignID int64, path, contentHash, entityType string, entityID int64) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO vault_file_state (campaign_id, path, content_hash, entity_type, entity_id)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT (campaign_id, path) DO UPDATE SET
			content_hash = excluded.content_hash, entity_type = excluded.entity_type,
			entity_id = excluded.entity_id, indexed_at = datetime('now')`,
		campaignID, path, contentHash, entityType, entityID,
	)
	return err
}
