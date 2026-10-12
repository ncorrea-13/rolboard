package models

type Secret struct {
	ID                int64   `json:"id"`
	CampaignID        int64   `json:"campaign_id"`
	Title             string  `json:"title"`
	Body              string  `json:"body"`
	Status            string  `json:"status"`
	RevealedSessionID *int64  `json:"revealed_session_id,omitempty"`
	NPCID             *int64  `json:"npc_id,omitempty"`
	LocationID        *int64  `json:"location_id,omitempty"`
	LoreEntryID       *int64  `json:"lore_entry_id,omitempty"`
	KnownByNPCIDs     []int64 `json:"known_by_npc_ids"`
	CreatedAt         string  `json:"created_at"`
	UpdatedAt         string  `json:"updated_at"`
}
