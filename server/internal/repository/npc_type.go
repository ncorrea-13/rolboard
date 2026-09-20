package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

var ErrNPCTypeInUse = errors.New("npc type is used by npcs")

// ReferenceNPCKind is the reserved npc_kind for vault notes that only serve as link targets.
// It is not a user-managed type.
const ReferenceNPCKind = "referencia"

// DefaultNPCTypes are created with every new campaign.
var DefaultNPCTypes = []models.NPCType{
	{Key: "npc", Label: "Humano", Color: "#c79a55"},
	{Key: "spren", Label: "Spren", Color: "#6fa98c"},
	{Key: "entidad-cognitiva", Label: "Ent. cognitiva", Color: "#a87c9b"},
}

type NPCTypeRepository struct {
	db *sql.DB
}

func NewNPCTypeRepository(db *sql.DB) *NPCTypeRepository {
	return &NPCTypeRepository{db: db}
}

// execer is satisfied by *sql.DB and *sql.Tx.
type execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

func seedDefaultNPCTypes(ctx context.Context, ex execer, campaignID int64) error {
	for i, t := range DefaultNPCTypes {
		if _, err := ex.ExecContext(ctx,
			`INSERT INTO npc_types (campaign_id, key, label, color, position) VALUES (?, ?, ?, ?, ?)`,
			campaignID, t.Key, t.Label, t.Color, i,
		); err != nil {
			return err
		}
	}
	return nil
}

func (r *NPCTypeRepository) List(ctx context.Context, campaignID int64) ([]models.NPCType, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, campaign_id, key, label, color, position FROM npc_types WHERE campaign_id = ? ORDER BY position, id`,
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	types := []models.NPCType{}
	for rows.Next() {
		var t models.NPCType
		if err := rows.Scan(&t.ID, &t.CampaignID, &t.Key, &t.Label, &t.Color, &t.Position); err != nil {
			return nil, err
		}
		types = append(types, t)
	}
	return types, rows.Err()
}

func (r *NPCTypeRepository) Exists(ctx context.Context, campaignID int64, key string) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx,
		`SELECT 1 FROM npc_types WHERE campaign_id = ? AND key = ?`, campaignID, key,
	).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (r *NPCTypeRepository) Create(ctx context.Context, t *models.NPCType) error {
	return r.db.QueryRowContext(ctx, `
		INSERT INTO npc_types (campaign_id, key, label, color, position)
		VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM npc_types WHERE campaign_id = ?))
		RETURNING id, campaign_id, key, label, color, position`,
		t.CampaignID, t.Key, t.Label, t.Color, t.CampaignID,
	).Scan(&t.ID, &t.CampaignID, &t.Key, &t.Label, &t.Color, &t.Position)
}

func (r *NPCTypeRepository) Update(ctx context.Context, id int64, label, color string) (*models.NPCType, error) {
	var t models.NPCType
	err := r.db.QueryRowContext(ctx, `
		UPDATE npc_types SET label = ?, color = ? WHERE id = ?
		RETURNING id, campaign_id, key, label, color, position`,
		label, color, id,
	).Scan(&t.ID, &t.CampaignID, &t.Key, &t.Label, &t.Color, &t.Position)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// Delete removes a type; it fails with ErrNPCTypeInUse while any live NPC of the campaign uses its key.
func (r *NPCTypeRepository) Delete(ctx context.Context, id int64) error {
	var campaignID int64
	var key string
	err := r.db.QueryRowContext(ctx, `SELECT campaign_id, key FROM npc_types WHERE id = ?`, id).Scan(&campaignID, &key)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	var inUse int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM npcs WHERE campaign_id = ? AND npc_kind = ? AND deleted_at IS NULL`,
		campaignID, key,
	).Scan(&inUse); err != nil {
		return err
	}
	if inUse > 0 {
		return ErrNPCTypeInUse
	}

	_, err = r.db.ExecContext(ctx, `DELETE FROM npc_types WHERE id = ?`, id)
	return err
}

func CampaignIDByNPCType(ctx context.Context, db *sql.DB, id int64) (int64, error) {
	var campaignID int64
	err := db.QueryRowContext(ctx, `SELECT campaign_id FROM npc_types WHERE id = ?`, id).Scan(&campaignID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNotFound
	}
	return campaignID, err
}
