package models

type SessionRef struct {
	ID            int64  `json:"id"`
	SessionNumber int64  `json:"session_number"`
	SubNumber     int64  `json:"sub_number"`
	SessionType   string `json:"session_type"`
	Title         string `json:"title"`
}

type QuestRef struct {
	ID     int64  `json:"id"`
	Title  string `json:"title"`
	Status string `json:"status"`
	Role   string `json:"role"`
}

type EncounterRef struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type SecretRef struct {
	ID     int64  `json:"id"`
	Title  string `json:"title"`
	Status string `json:"status"`
}

// Appearances lists where an NPC or a player character shows up.
type Appearances struct {
	Sessions   []SessionRef   `json:"sessions"`
	Quests     []QuestRef     `json:"quests"`
	Encounters []EncounterRef `json:"encounters"`
	Secrets    []SecretRef    `json:"secrets"`
}
