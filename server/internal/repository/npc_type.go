package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

var ErrNPCTypeInUse = errors.New("npc type is used by npcs")

const ReferenceNPCKind = "referencia"

var DefaultNPCTypes = []models.NPCType{
	{Key: "npc", Label: "Humano", Color: "#c79a55"},
	{Key: "spren", Label: "Spren", Color: "#6fa98c"},
	{Key: "entidad-cognitiva", Label: "Ent. cognitiva", Color: "#a87c9b"},
}

var accentReplacer = strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n")

func NPCTypeKey(label string) string {
	s := accentReplacer.Replace(strings.ToLower(strings.TrimSpace(label)))
	var b strings.Builder
	dash := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			dash = false
		} else if !dash && b.Len() > 0 {
			b.WriteByte('-')
			dash = true
		}
	}
	return strings.Trim(b.String(), "-")
}

var autoTypeColors = []string{"#5fa8d3", "#d46a9f", "#d08a3c", "#9b7bea", "#4fb5a3", "#c2665c", "#7fb58c"}

type NPCTypeRepository struct {
	db *sql.DB
}

func NewNPCTypeRepository(db *sql.DB) *NPCTypeRepository {
	return &NPCTypeRepository{db: db}
}

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

func (r *NPCTypeRepository) Ensure(ctx context.Context, campaignID int64, key, label string) error {
	exists, err := r.Exists(ctx, campaignID, key)
	if err != nil || exists {
		return err
	}
	var count int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM npc_types WHERE campaign_id = ?`, campaignID).Scan(&count); err != nil {
		return err
	}
	return r.Create(ctx, &models.NPCType{
		CampaignID: campaignID, Key: key, Label: label, Color: autoTypeColors[count%len(autoTypeColors)],
	})
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
