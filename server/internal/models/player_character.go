package models

import "encoding/json"

type PlayerCharacter struct {
	ID               int64           `json:"id"`
	CampaignID       int64           `json:"campaign_id"`
	PlayerName       string          `json:"player_name"`
	CharacterName    string          `json:"character_name"`
	Race             string          `json:"race"`
	Class            string          `json:"class"`
	Status           string          `json:"status"`
	SprenNPCID       *int64          `json:"spren_npc_id,omitempty"`
	Backstory        string          `json:"backstory"`
	ProgressionNotes string          `json:"progression_notes"`
	Attributes       json.RawMessage `json:"attributes"`
	Skills           json.RawMessage `json:"skills"`
	CurrentHp        *int64          `json:"current_hp,omitempty"`
	MaxHp            *int64          `json:"max_hp,omitempty"`
	ObsidianPath     *string         `json:"obsidian_path,omitempty"`
	HistoriaPath     *string         `json:"historia_path,omitempty"`
	AvancesPath      *string         `json:"avances_path,omitempty"`
	CreatedAt        string          `json:"created_at"`
	UpdatedAt        string          `json:"updated_at"`
}
