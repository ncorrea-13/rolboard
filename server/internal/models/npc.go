package models

type NPC struct {
	ID           int64   `json:"id"`
	CampaignID   int64   `json:"campaign_id"`
	Name         string  `json:"name"`
	NPCKind      string  `json:"npc_kind"`
	DetailLevel  string  `json:"detail_level"`
	Status       string  `json:"status"`
	LocationID   *int64  `json:"location_id,omitempty"`
	Etnia        *string `json:"etnia,omitempty"`
	Rol          *string `json:"rol,omitempty"`
	VinculoCon   *int64  `json:"vinculo_con,omitempty"`
	TipoSpren    *string `json:"tipo_spren,omitempty"`
	Description  string  `json:"description"`
	Notes        string  `json:"notes"`
	ObsidianPath *string `json:"obsidian_path,omitempty"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}
