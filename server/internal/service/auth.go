package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidAccessCode = errors.New("invalid access code")

const sessionTTL = 7 * 24 * time.Hour

type AuthService struct {
	campaignRepo *repository.CampaignRepository
	sessionRepo  *repository.AuthSessionRepository
}

func NewAuthService(campaignRepo *repository.CampaignRepository, sessionRepo *repository.AuthSessionRepository) *AuthService {
	return &AuthService{campaignRepo: campaignRepo, sessionRepo: sessionRepo}
}

func (s *AuthService) SetAccessCode(ctx context.Context, campaignID int64, code string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.campaignRepo.SetAccessCodeHash(ctx, campaignID, string(hash))
}

func (s *AuthService) Login(ctx context.Context, campaignID int64, code string) (token string, expiresAt string, err error) {
	campaign, err := s.campaignRepo.GetByID(ctx, campaignID)
	if err != nil {
		return "", "", err
	}
	if campaign.AccessCodeHash == "" {
		return "", "", ErrInvalidAccessCode
	}
	if err := bcrypt.CompareHashAndPassword([]byte(campaign.AccessCodeHash), []byte(code)); err != nil {
		return "", "", ErrInvalidAccessCode
	}

	token, err = generateToken()
	if err != nil {
		return "", "", err
	}
	session, err := s.sessionRepo.Create(ctx, campaignID, hashToken(token), sessionTTL)
	if err != nil {
		return "", "", err
	}
	return token, session.ExpiresAt, nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	return s.sessionRepo.Delete(ctx, hashToken(token))
}

func (s *AuthService) SessionTTL() time.Duration {
	return sessionTTL
}

func (s *AuthService) ValidateToken(ctx context.Context, token string) (campaignID int64, err error) {
	session, err := s.sessionRepo.GetValidByTokenHash(ctx, hashToken(token))
	if err != nil {
		return 0, err
	}
	return session.CampaignID, nil
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
