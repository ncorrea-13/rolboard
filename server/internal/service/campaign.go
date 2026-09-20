// Package service holds the business logic between the HTTP handlers and the repository.
package service

import (
	"context"
	"errors"
	"path/filepath"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

var ErrInvalidVaultPath = errors.New("invalid vault_path")

type CampaignService struct {
	repo *repository.CampaignRepository
}

func NewCampaignService(repo *repository.CampaignRepository) *CampaignService {
	return &CampaignService{repo: repo}
}

func safeVaultPath(vaultPath string) bool {
	if vaultPath == "" {
		return true
	}
	clean := filepath.Clean(vaultPath)
	if filepath.IsAbs(clean) || clean == "." || clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return false
	}
	return true
}

func (s *CampaignService) List(ctx context.Context) ([]models.Campaign, error) {
	campaign, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}

	return campaign, nil
}

func (s *CampaignService) Create(ctx context.Context, campaign *models.Campaign) error {
	if !safeVaultPath(campaign.VaultPath) {
		return ErrInvalidVaultPath
	}
	return s.repo.Create(ctx, campaign)
}

func (s *CampaignService) GetByID(ctx context.Context, id int64) (*models.Campaign, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *CampaignService) Update(ctx context.Context, id int64, campaign *models.Campaign) error {
	if !safeVaultPath(campaign.VaultPath) {
		return ErrInvalidVaultPath
	}
	return s.repo.Update(ctx, id, campaign)
}

func (s *CampaignService) SetWardails(ctx context.Context, id int64, wardails string) error {
	return s.repo.SetWardails(ctx, id, wardails)
}

func (s *CampaignService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
