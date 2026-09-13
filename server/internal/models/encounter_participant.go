package models

import "encoding/json"

type EncounterParticipant struct {
	ID          int64           `json:"id"`
	EncounterID int64           `json:"encounter_id"`
	PcID        *int64          `json:"pc_id,omitempty"`
	NpcID       *int64          `json:"npc_id,omitempty"`
	DisplayName *string         `json:"display_name,omitempty"`
	CurrentHp   *int64          `json:"current_hp,omitempty"`
	MaxHp       *int64          `json:"max_hp,omitempty"`
	Initiative  *int64          `json:"initiative_value,omitempty"`
	TurnType    *string         `json:"turn_type,omitempty"`
	Notes       string          `json:"notes"`
	Attributes  json.RawMessage `json:"attributes"`
	Skills      json.RawMessage `json:"skills"`
	CreatedAt   string          `json:"created_at"`
	UpdatedAt   string          `json:"updated_at"`
}
