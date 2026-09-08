package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type QuestService struct {
	repo *repository.QuestRepository
}

func NewQuestService(repo *repository.QuestRepository) *QuestService {
	return &QuestService{repo: repo}
}

func (s *QuestService) List(ctx context.Context, campaignID int64) ([]models.Quest, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *QuestService) Create(ctx context.Context, q *models.Quest) error {
	return s.repo.Create(ctx, q)
}

func (s *QuestService) GetByID(ctx context.Context, id int64) (*models.Quest, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *QuestService) Update(ctx context.Context, id int64, q *models.Quest) error {
	return s.repo.Update(ctx, id, q)
}

func (s *QuestService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
