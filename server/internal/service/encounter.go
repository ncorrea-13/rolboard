package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type EncounterService struct {
	repo *repository.EncounterRepository
}

func NewEncounterService(repo *repository.EncounterRepository) *EncounterService {
	return &EncounterService{repo: repo}
}

func (s *EncounterService) List(ctx context.Context, campaignID int64) ([]models.Encounter, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *EncounterService) Create(ctx context.Context, e *models.Encounter) error {
	return s.repo.Create(ctx, e)
}

func (s *EncounterService) GetByID(ctx context.Context, id int64) (*models.Encounter, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *EncounterService) Update(ctx context.Context, id int64, e *models.Encounter) error {
	return s.repo.Update(ctx, id, e)
}

func (s *EncounterService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
