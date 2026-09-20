package models

type NPCType struct {
	ID         int64  `json:"id"`
	CampaignID int64  `json:"campaign_id"`
	Key        string `json:"key"`
	Label      string `json:"label"`
	Color      string `json:"color"`
	Position   int    `json:"position"`
}
