// Package service holds the business logic between the HTTP handlers and the repository.
package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type CampaignService struct {
	repo *repository.CampaignRepository
}

func NewCampaignService(repo *repository.CampaignRepository) *CampaignService {
	return &CampaignService{repo: repo}
}

func (s *CampaignService) List(ctx context.Context) ([]models.Campaign, error) {
	campaign, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}

	return campaign, nil
}
