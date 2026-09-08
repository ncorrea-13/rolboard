package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type ArcService struct {
	repo *repository.ArcRepository
}

func NewArcService(repo *repository.ArcRepository) *ArcService {
	return &ArcService{repo: repo}
}

func (s *ArcService) List(ctx context.Context, campaignID int64) ([]models.Arc, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *ArcService) Create(ctx context.Context, arc *models.Arc) error {
	return s.repo.Create(ctx, arc)
}

func (s *ArcService) GetByID(ctx context.Context, id int64) (*models.Arc, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ArcService) Update(ctx context.Context, id int64, arc *models.Arc) error {
	return s.repo.Update(ctx, id, arc)
}

func (s *ArcService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
