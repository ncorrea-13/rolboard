package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type AppearanceService struct {
	repo *repository.AppearanceRepository
}

func NewAppearanceService(repo *repository.AppearanceRepository) *AppearanceService {
	return &AppearanceService{repo: repo}
}

func (s *AppearanceService) ForNPC(ctx context.Context, id int64) (*models.Appearances, error) {
	return s.repo.ForNPC(ctx, id)
}

func (s *AppearanceService) ForPC(ctx context.Context, id int64) (*models.Appearances, error) {
	return s.repo.ForPC(ctx, id)
}
