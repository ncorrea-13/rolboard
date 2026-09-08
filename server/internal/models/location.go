package models

type Location struct {
	ID               int64   `json:"id"`
	CampaignID       int64   `json:"campaign_id"`
	Name             string  `json:"name"`
	LocationType     string  `json:"location_type"`
	ParentLocationID *int64  `json:"parent_location_id,omitempty"`
	Description      string  `json:"description"`
	Notes            string  `json:"notes"`
	ObsidianPath     *string `json:"obsidian_path,omitempty"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
}
