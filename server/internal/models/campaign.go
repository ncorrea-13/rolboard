// Package models holds the structs shared across repository, service, and handlers.
package models

type Campaign struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	System      string `json:"system"`
	Description string `json:"description"`
	Status      string `json:"status"`
	VaultPath   string `json:"vault_path"`
	Wardails    string `json:"wardails"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`

	AccessCodeHash string `json:"-"`
}
