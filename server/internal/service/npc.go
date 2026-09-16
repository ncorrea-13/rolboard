package service

import (
	"context"
	"path/filepath"

	"github.com/ncorrea-13/rolboard/server/internal/imagestore"
	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type NPCService struct {
	repo        *repository.NPCRepository
	uploadsRoot string
}

func NewNPCService(repo *repository.NPCRepository, uploadsRoot string) *NPCService {
	return &NPCService{repo: repo, uploadsRoot: uploadsRoot}
}

func (s *NPCService) SetImage(ctx context.Context, id int64, data []byte) (*models.NPC, error) {
	relPath, err := imagestore.Store(s.uploadsRoot, "npcs", id, data)
	if err != nil {
		return nil, err
	}
	return s.repo.SetImagePath(ctx, id, &relPath)
}

func (s *NPCService) DeleteImage(ctx context.Context, id int64) (*models.NPC, error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if current.ImagePath != nil {
		if err := imagestore.Delete(s.uploadsRoot, *current.ImagePath); err != nil {
			return nil, err
		}
	}
	return s.repo.SetImagePath(ctx, id, nil)
}

func (s *NPCService) ImageFile(ctx context.Context, id int64) (absPath, contentType string, err error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", "", err
	}
	if current.ImagePath == nil {
		return "", "", repository.ErrNotFound
	}
	return filepath.Join(s.uploadsRoot, *current.ImagePath), imagestore.ContentType(*current.ImagePath), nil
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
