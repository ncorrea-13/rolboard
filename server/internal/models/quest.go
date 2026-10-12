package models

type Quest struct {
	ID          int64  `json:"id"`
	CampaignID  int64  `json:"campaign_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    *int64 `json:"priority,omitempty"`
	Notes       string `json:"notes"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

type QuestNpc struct {
	NPCID int64  `json:"npc_id"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}
