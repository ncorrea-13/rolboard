package models

type Timeline struct {
	ID          int64  `json:"id"`
	CampaignID  int64  `json:"campaign_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	StartLabel  string `json:"start_label"`
	EndLabel    string `json:"end_label"`
	Position    int64  `json:"position"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type TimelineEvent struct {
	ID           int64   `json:"id"`
	CampaignID   int64   `json:"campaign_id"`
	TimelineID   int64   `json:"timeline_id"`
	Title        string  `json:"title"`
	Description  string  `json:"description"`
	DateLabel    string  `json:"date_label"`
	EndDateLabel string  `json:"end_date_label"`
	SortKey      float64 `json:"sort_key"`
	ArcID        *int64  `json:"arc_id,omitempty"`
	SessionID    *int64  `json:"session_id,omitempty"`
	LocationID   *int64  `json:"location_id,omitempty"`
	GroupID      *int64  `json:"group_id,omitempty"`
	LoreEntryID  *int64  `json:"lore_entry_id,omitempty"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}
