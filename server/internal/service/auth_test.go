package service

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	_ "modernc.org/sqlite"
)

func setupAuthTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("Failed to open test DB: %v", err)
	}
	if err := repository.Migrate(db); err != nil {
		t.Fatalf("Failed to migrate test DB: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Logf("error closing test DB: %v", err)
		}
	})
	return db
}

func newTestCampaign(t *testing.T, repo *repository.CampaignRepository, name string) int64 {
	c := &models.Campaign{Name: name, System: "Cosmere"}
	if err := repo.Create(context.Background(), c); err != nil {
		t.Fatalf("Create campaign failed: %v", err)
	}
	return c.ID
}

func TestAuthServiceLoginSuccess(t *testing.T) {
	db := setupAuthTestDB(t)
	campaignRepo := repository.NewCampaignRepository(db)
	sessionRepo := repository.NewAuthSessionRepository(db)
	auth := NewAuthService(campaignRepo, sessionRepo)
	ctx := context.Background()

	campaignID := newTestCampaign(t, campaignRepo, "Campaign A")
	if err := auth.SetAccessCode(ctx, campaignID, "correct-horse"); err != nil {
		t.Fatalf("SetAccessCode failed: %v", err)
	}

	token, expiresAt, err := auth.Login(ctx, campaignID, "correct-horse")
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if token == "" {
		t.Error("Expected non-empty token")
	}
	if expiresAt == "" {
		t.Error("Expected non-empty expiresAt")
	}

	gotCampaignID, err := auth.ValidateToken(ctx, token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if gotCampaignID != campaignID {
		t.Errorf("Expected campaignID %d, got %d", campaignID, gotCampaignID)
	}
}

func TestAuthServiceLoginWrongCode(t *testing.T) {
	db := setupAuthTestDB(t)
	campaignRepo := repository.NewCampaignRepository(db)
	sessionRepo := repository.NewAuthSessionRepository(db)
	auth := NewAuthService(campaignRepo, sessionRepo)
	ctx := context.Background()

	campaignID := newTestCampaign(t, campaignRepo, "Campaign A")
	if err := auth.SetAccessCode(ctx, campaignID, "correct-horse"); err != nil {
		t.Fatalf("SetAccessCode failed: %v", err)
	}

	_, _, err := auth.Login(ctx, campaignID, "wrong-code")
	if !errors.Is(err, ErrInvalidAccessCode) {
		t.Errorf("Expected ErrInvalidAccessCode, got %v", err)
	}
}

func TestAuthServiceLoginNoCodeSet(t *testing.T) {
	db := setupAuthTestDB(t)
	campaignRepo := repository.NewCampaignRepository(db)
	sessionRepo := repository.NewAuthSessionRepository(db)
	auth := NewAuthService(campaignRepo, sessionRepo)
	ctx := context.Background()

	campaignID := newTestCampaign(t, campaignRepo, "Campaign A")

	_, _, err := auth.Login(ctx, campaignID, "anything")
	if !errors.Is(err, ErrInvalidAccessCode) {
		t.Errorf("Expected ErrInvalidAccessCode, got %v", err)
	}
}

func TestAuthServiceLogoutInvalidatesToken(t *testing.T) {
	db := setupAuthTestDB(t)
	campaignRepo := repository.NewCampaignRepository(db)
	sessionRepo := repository.NewAuthSessionRepository(db)
	auth := NewAuthService(campaignRepo, sessionRepo)
	ctx := context.Background()

	campaignID := newTestCampaign(t, campaignRepo, "Campaign A")
	if err := auth.SetAccessCode(ctx, campaignID, "correct-horse"); err != nil {
		t.Fatalf("SetAccessCode failed: %v", err)
	}
	token, _, err := auth.Login(ctx, campaignID, "correct-horse")
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}

	if err := auth.Logout(ctx, token); err != nil {
		t.Fatalf("Logout failed: %v", err)
	}

	if _, err := auth.ValidateToken(ctx, token); !errors.Is(err, repository.ErrSessionNotFound) {
		t.Errorf("Expected ErrSessionNotFound after logout, got %v", err)
	}
}

func TestAuthServiceValidateTokenExpired(t *testing.T) {
	db := setupAuthTestDB(t)
	campaignRepo := repository.NewCampaignRepository(db)
	sessionRepo := repository.NewAuthSessionRepository(db)
	auth := NewAuthService(campaignRepo, sessionRepo)
	ctx := context.Background()

	campaignID := newTestCampaign(t, campaignRepo, "Campaign A")

	token, err := generateToken()
	if err != nil {
		t.Fatalf("generateToken failed: %v", err)
	}
	if _, err := sessionRepo.Create(ctx, campaignID, hashToken(token), -1*time.Hour); err != nil {
		t.Fatalf("Create expired session failed: %v", err)
	}

	if _, err := auth.ValidateToken(ctx, token); !errors.Is(err, repository.ErrSessionNotFound) {
		t.Errorf("Expected ErrSessionNotFound for expired token, got %v", err)
	}
}

func TestAuthServiceCrossCampaignIsolation(t *testing.T) {
	db := setupAuthTestDB(t)
	campaignRepo := repository.NewCampaignRepository(db)
	sessionRepo := repository.NewAuthSessionRepository(db)
	auth := NewAuthService(campaignRepo, sessionRepo)
	ctx := context.Background()

	campaignA := newTestCampaign(t, campaignRepo, "Campaign A")
	campaignB := newTestCampaign(t, campaignRepo, "Campaign B")
	if err := auth.SetAccessCode(ctx, campaignA, "code-a"); err != nil {
		t.Fatalf("SetAccessCode A failed: %v", err)
	}
	if err := auth.SetAccessCode(ctx, campaignB, "code-b"); err != nil {
		t.Fatalf("SetAccessCode B failed: %v", err)
	}

	tokenA, _, err := auth.Login(ctx, campaignA, "code-a")
	if err != nil {
		t.Fatalf("Login A failed: %v", err)
	}

	gotCampaignID, err := auth.ValidateToken(ctx, tokenA)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if gotCampaignID != campaignA {
		t.Errorf("Token from campaign A resolved to campaign %d, want %d", gotCampaignID, campaignA)
	}
	if gotCampaignID == campaignB {
		t.Error("Token from campaign A must never resolve to campaign B")
	}

	if _, _, err := auth.Login(ctx, campaignB, "code-a"); !errors.Is(err, ErrInvalidAccessCode) {
		t.Errorf("Expected ErrInvalidAccessCode using campaign A's code on campaign B, got %v", err)
	}
}
