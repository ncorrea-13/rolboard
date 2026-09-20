package models

// NPCType is a per-campaign NPC category. Key is the value NPCs store in npc_kind and the
// vault's `tipo` frontmatter field; it never changes after creation. Label and Color are display only.
type NPCType struct {
	ID         int64  `json:"id"`
	CampaignID int64  `json:"campaign_id"`
	Key        string `json:"key"`
	Label      string `json:"label"`
	Color      string `json:"color"`
	Position   int    `json:"position"`
}
