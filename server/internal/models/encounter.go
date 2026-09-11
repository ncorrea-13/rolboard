package models

type Encounter struct {
	ID         int64  `json:"id"`
	CampaignID int64  `json:"campaign_id"`
	SessionID  *int64 `json:"session_id,omitempty"`
	Round      int64  `json:"round"`
	Status     string `json:"status"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}
