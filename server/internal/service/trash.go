package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type TrashService struct {
	repo *repository.TrashRepository
}

func NewTrashService(repo *repository.TrashRepository) *TrashService {
	return &TrashService{repo: repo}
}

func (s *TrashService) List(ctx context.Context, campaignID int64) ([]models.TrashItem, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *TrashService) Restore(ctx context.Context, campaignID int64, kind string, id int64) error {
	return s.repo.Restore(ctx, campaignID, kind, id)
}
