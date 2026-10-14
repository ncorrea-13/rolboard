package models

type LoreCategory struct {
	ID         int64  `json:"id"`
	CampaignID int64  `json:"campaign_id"`
	Key        string `json:"key"`
	Label      string `json:"label"`
	Color      string `json:"color"`
	Position   int64  `json:"position"`
}

type LoreEntry struct {
	ID           int64   `json:"id"`
	CampaignID   int64   `json:"campaign_id"`
	CategoryID   *int64  `json:"category_id,omitempty"`
	Title        string  `json:"title"`
	Body         string  `json:"body"`
	ArcID        *int64  `json:"arc_id,omitempty"`
	LocationID   *int64  `json:"location_id,omitempty"`
	ObsidianPath *string `json:"obsidian_path,omitempty"`
	ImagePath    *string `json:"image_path,omitempty"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}
