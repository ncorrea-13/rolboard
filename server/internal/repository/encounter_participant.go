package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

type EncounterParticipantRepository struct {
	db *sql.DB
}

func NewEncounterParticipantRepository(db *sql.DB) *EncounterParticipantRepository {
	return &EncounterParticipantRepository{db: db}
}

func scanEncounterParticipant(row interface {
	Scan(dest ...any) error
}, p *models.EncounterParticipant) error {
	var pcID, npcID, currentHp, maxHp, initiative sql.NullInt64
	var displayName, turnType sql.NullString
	var attributes, skills string
	err := row.Scan(&p.ID, &p.EncounterID, &pcID, &npcID, &displayName, &currentHp, &maxHp,
		&initiative, &turnType, &p.Notes, &attributes, &skills, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return err
	}
	p.PcID = fromNullInt64(pcID)
	p.NpcID = fromNullInt64(npcID)
	p.DisplayName = fromNullString(displayName)
	p.CurrentHp = fromNullInt64(currentHp)
	p.MaxHp = fromNullInt64(maxHp)
	p.Initiative = fromNullInt64(initiative)
	p.TurnType = fromNullString(turnType)
	p.Attributes = json.RawMessage(attributes)
	p.Skills = json.RawMessage(skills)
	return nil
}

func (r *EncounterParticipantRepository) List(ctx context.Context, encounterID int64) ([]models.EncounterParticipant, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, encounter_id, pc_id, npc_id, display_name, current_hp, max_hp, initiative_value, turn_type, notes, attributes, skills, created_at, updated_at
		FROM encounter_participants WHERE encounter_id = ? AND deleted_at IS NULL ORDER BY id`,
		encounterID,
	)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := rows.Close(); err != nil {
			return
		}
	}()

	var participants []models.EncounterParticipant
	for rows.Next() {
		p := models.EncounterParticipant{}
		if err := scanEncounterParticipant(rows, &p); err != nil {
			return nil, err
		}
		participants = append(participants, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return participants, nil
}

func (r *EncounterParticipantRepository) Create(ctx context.Context, p *models.EncounterParticipant) error {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO encounter_participants (encounter_id, pc_id, npc_id, display_name, current_hp, max_hp, initiative_value, turn_type, notes, attributes, skills)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id, encounter_id, pc_id, npc_id, display_name, current_hp, max_hp, initiative_value, turn_type, notes, attributes, skills, created_at, updated_at`,
		p.EncounterID, toNullInt64(p.PcID), toNullInt64(p.NpcID), toNullString(p.DisplayName),
		toNullInt64(p.CurrentHp), toNullInt64(p.MaxHp), toNullInt64(p.Initiative), toNullString(p.TurnType), p.Notes,
		toJSONText(p.Attributes), toJSONText(p.Skills),
	)
	return scanEncounterParticipant(row, p)
}

func (r *EncounterParticipantRepository) GetByID(ctx context.Context, id int64) (*models.EncounterParticipant, error) {
	p := models.EncounterParticipant{}
	row := r.db.QueryRowContext(ctx, `
		SELECT id, encounter_id, pc_id, npc_id, display_name, current_hp, max_hp, initiative_value, turn_type, notes, attributes, skills, created_at, updated_at
		FROM encounter_participants WHERE id = ? AND deleted_at IS NULL`,
		id,
	)
	err := scanEncounterParticipant(row, &p)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *EncounterParticipantRepository) Update(ctx context.Context, id int64, p *models.EncounterParticipant) error {
	row := r.db.QueryRowContext(ctx, `
		UPDATE encounter_participants
		SET pc_id = ?, npc_id = ?, display_name = ?, current_hp = ?, max_hp = ?,
		    initiative_value = ?, turn_type = ?, notes = ?, attributes = ?, skills = ?, updated_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id, encounter_id, pc_id, npc_id, display_name, current_hp, max_hp, initiative_value, turn_type, notes, attributes, skills, created_at, updated_at`,
		toNullInt64(p.PcID), toNullInt64(p.NpcID), toNullString(p.DisplayName),
		toNullInt64(p.CurrentHp), toNullInt64(p.MaxHp), toNullInt64(p.Initiative), toNullString(p.TurnType), p.Notes,
		toJSONText(p.Attributes), toJSONText(p.Skills), id,
	)
	err := scanEncounterParticipant(row, p)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}

func (r *EncounterParticipantRepository) Delete(ctx context.Context, id int64) error {
	err := r.db.QueryRowContext(ctx, `
		UPDATE encounter_participants
		SET deleted_at = datetime('now')
		WHERE id = ? AND deleted_at IS NULL
		RETURNING id`,
		id).Scan(&id)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	return err
}
