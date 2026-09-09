package models

type Group struct {
	ID           int64   `json:"id"`
	CampaignID   int64   `json:"campaign_id"`
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Notes        string  `json:"notes"`
	ObsidianPath *string `json:"obsidian_path,omitempty"`
	MemberCount  int64   `json:"member_count"`
	CreatedAt    string  `json:"created_at"`
	UpdatedAt    string  `json:"updated_at"`
}

type NPCGroupMember struct {
	NPCID       int64   `json:"npc_id"`
	Name        string  `json:"name"`
	RoleInGroup *string `json:"role_in_group,omitempty"`
}
