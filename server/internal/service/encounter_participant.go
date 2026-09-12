package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type EncounterParticipantService struct {
	repo *repository.EncounterParticipantRepository
}

func NewEncounterParticipantService(repo *repository.EncounterParticipantRepository) *EncounterParticipantService {
	return &EncounterParticipantService{repo: repo}
}

func (s *EncounterParticipantService) List(ctx context.Context, encounterID int64) ([]models.EncounterParticipant, error) {
	return s.repo.List(ctx, encounterID)
}

func (s *EncounterParticipantService) Create(ctx context.Context, p *models.EncounterParticipant) error {
	return s.repo.Create(ctx, p)
}

func (s *EncounterParticipantService) GetByID(ctx context.Context, id int64) (*models.EncounterParticipant, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *EncounterParticipantService) Update(ctx context.Context, id int64, p *models.EncounterParticipant) error {
	return s.repo.Update(ctx, id, p)
}

func (s *EncounterParticipantService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
