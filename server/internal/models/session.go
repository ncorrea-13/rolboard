package models

type Session struct {
	ID            int64   `json:"id"`
	CampaignID    int64   `json:"campaign_id"`
	ArcID         *int64  `json:"arc_id,omitempty"`
	SessionNumber int64   `json:"session_number"`
	SubNumber     int64   `json:"sub_number"`
	SessionType   string  `json:"session_type"`
	Date          string  `json:"date"`
	Summary       string  `json:"summary"`
	PrepNotes     string  `json:"prep_notes"`
	ObsidianPath  *string `json:"obsidian_path,omitempty"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
}

type SessionNpc struct {
	NPCID int64  `json:"npc_id"`
	Name  string `json:"name"`
}

type SessionQuest struct {
	QuestID int64  `json:"quest_id"`
	Title   string `json:"title"`
}
