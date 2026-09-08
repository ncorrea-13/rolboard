package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type NPCService struct {
	repo *repository.NPCRepository
}

func NewNPCService(repo *repository.NPCRepository) *NPCService {
	return &NPCService{repo: repo}
}

func (s *NPCService) List(ctx context.Context, campaignID int64) ([]models.NPC, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *NPCService) Create(ctx context.Context, n *models.NPC) error {
	return s.repo.Create(ctx, n)
}

func (s *NPCService) GetByID(ctx context.Context, id int64) (*models.NPC, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *NPCService) Update(ctx context.Context, id int64, n *models.NPC) error {
	return s.repo.Update(ctx, id, n)
}

func (s *NPCService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
