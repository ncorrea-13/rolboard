package models

type PlayerCharacter struct {
	ID               int64   `json:"id"`
	CampaignID       int64   `json:"campaign_id"`
	PlayerName       string  `json:"player_name"`
	CharacterName    string  `json:"character_name"`
	Backstory        string  `json:"backstory"`
	ProgressionNotes string  `json:"progression_notes"`
	ObsidianPath     *string `json:"obsidian_path,omitempty"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
}
