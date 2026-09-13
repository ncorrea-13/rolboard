package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

var ErrSessionNotFound = errors.New("session not found")

const sqliteTimeLayout = "2006-01-02 15:04:05"

type AuthSessionRepository struct {
	db *sql.DB
}

func NewAuthSessionRepository(db *sql.DB) *AuthSessionRepository {
	return &AuthSessionRepository{db: db}
}

func (r *AuthSessionRepository) Create(ctx context.Context, campaignID int64, tokenHash string, ttl time.Duration) (*models.AuthSession, error) {
	s := models.AuthSession{
		CampaignID: campaignID,
		TokenHash:  tokenHash,
		ExpiresAt:  time.Now().UTC().Add(ttl).Format(sqliteTimeLayout),
	}
	err := r.db.QueryRowContext(ctx, `
              INSERT INTO auth_sessions (campaign_id, token_hash, expires_at)
              VALUES (?, ?, ?)
              RETURNING id, campaign_id, token_hash, expires_at, created_at`,
		s.CampaignID, s.TokenHash, s.ExpiresAt,
	).Scan(&s.ID, &s.CampaignID, &s.TokenHash, &s.ExpiresAt, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *AuthSessionRepository) GetValidByTokenHash(ctx context.Context, tokenHash string) (*models.AuthSession, error) {
	s := models.AuthSession{}
	err := r.db.QueryRowContext(ctx, `
              SELECT id, campaign_id, token_hash, expires_at, created_at FROM auth_sessions
              WHERE token_hash = ? AND expires_at > ?`,
		tokenHash, time.Now().UTC().Format(sqliteTimeLayout),
	).Scan(&s.ID, &s.CampaignID, &s.TokenHash, &s.ExpiresAt, &s.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrSessionNotFound
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *AuthSessionRepository) Delete(ctx context.Context, tokenHash string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM auth_sessions WHERE token_hash = ?`, tokenHash)
	return err
}
