package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type LooseNoteService struct {
	repo *repository.LooseNoteRepository
}

func NewLooseNoteService(repo *repository.LooseNoteRepository) *LooseNoteService {
	return &LooseNoteService{repo: repo}
}

func (s *LooseNoteService) List(ctx context.Context, campaignID int64) ([]models.LooseNote, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *LooseNoteService) Create(ctx context.Context, n *models.LooseNote) error {
	return s.repo.Create(ctx, n)
}

func (s *LooseNoteService) GetByID(ctx context.Context, id int64) (*models.LooseNote, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *LooseNoteService) Update(ctx context.Context, id int64, n *models.LooseNote) error {
	return s.repo.Update(ctx, id, n)
}

func (s *LooseNoteService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
