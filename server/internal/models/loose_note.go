package models

type LooseNote struct {
	ID         int64  `json:"id"`
	CampaignID int64  `json:"campaign_id"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	Pending    bool   `json:"pending"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}
