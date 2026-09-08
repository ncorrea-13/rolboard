package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type LocationService struct {
	repo *repository.LocationRepository
}

func NewLocationService(repo *repository.LocationRepository) *LocationService {
	return &LocationService{repo: repo}
}

func (s *LocationService) List(ctx context.Context, campaignID int64) ([]models.Location, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *LocationService) Create(ctx context.Context, l *models.Location) error {
	return s.repo.Create(ctx, l)
}

func (s *LocationService) GetByID(ctx context.Context, id int64) (*models.Location, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *LocationService) Update(ctx context.Context, id int64, l *models.Location) error {
	return s.repo.Update(ctx, id, l)
}

func (s *LocationService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
