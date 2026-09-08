package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type PlayerCharacterService struct {
	repo *repository.PlayerCharacterRepository
}

func NewPlayerCharacterService(repo *repository.PlayerCharacterRepository) *PlayerCharacterService {
	return &PlayerCharacterService{repo: repo}
}

func (s *PlayerCharacterService) List(ctx context.Context, campaignID int64) ([]models.PlayerCharacter, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *PlayerCharacterService) Create(ctx context.Context, p *models.PlayerCharacter) error {
	return s.repo.Create(ctx, p)
}

func (s *PlayerCharacterService) GetByID(ctx context.Context, id int64) (*models.PlayerCharacter, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *PlayerCharacterService) Update(ctx context.Context, id int64, p *models.PlayerCharacter) error {
	return s.repo.Update(ctx, id, p)
}

func (s *PlayerCharacterService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
