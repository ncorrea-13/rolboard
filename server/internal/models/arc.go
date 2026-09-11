package models

type Arc struct {
	ID           int64   `json:"id"`
	CampaignID   int64   `json:"campaign_id"`
	Title        string  `json:"title"`
	Order        int64   `json:"order"`
	Status       string  `json:"status"`
	SubarcOrder  *int64  `json:"subarc_order,omitempty"`
	Summary      string  `json:"summary"`
	ObsidianPath *string `json:"obsidian_path,omitempty"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}
