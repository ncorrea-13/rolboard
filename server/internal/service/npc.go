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

func (s *NPCService) ListRelations(ctx context.Context, npcID int64) ([]models.NPCRelation, error) {
	return s.repo.ListRelations(ctx, npcID)
}

func (s *NPCService) CreateRelation(ctx context.Context, rel *models.NPCRelation) error {
	return s.repo.CreateRelation(ctx, rel)
}

func (s *NPCService) DeleteRelation(ctx context.Context, fromNPCID, toNPCID int64, role string) error {
	return s.repo.DeleteRelation(ctx, fromNPCID, toNPCID, role)
}
