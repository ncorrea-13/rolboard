package models

type DashboardSummary struct {
	ActiveQuests []Quest  `json:"active_quests"`
	OnHoldQuests []Quest  `json:"on_hold_quests"`
	RecentNPCs   []NPC    `json:"recent_npcs"`
	LastSession  *Session `json:"last_session,omitempty"`
}
