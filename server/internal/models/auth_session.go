package models

type AuthSession struct {
	ID         int64
	CampaignID int64
	TokenHash  string
	ExpiresAt  string
	CreatedAt  string
}
