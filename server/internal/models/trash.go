package models

type TrashItem struct {
	Kind      string `json:"kind"`
	ID        int64  `json:"id"`
	Label     string `json:"label"`
	DeletedAt string `json:"deleted_at"`
}
