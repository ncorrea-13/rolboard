package service

import (
	"context"
	"path/filepath"

	"github.com/ncorrea-13/rolboard/server/internal/imagestore"
	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type GroupService struct {
	repo        *repository.GroupRepository
	uploadsRoot string
}

func NewGroupService(repo *repository.GroupRepository, uploadsRoot string) *GroupService {
	return &GroupService{repo: repo, uploadsRoot: uploadsRoot}
}

func (s *GroupService) SetImage(ctx context.Context, id int64, data []byte) (*models.Group, error) {
	relPath, err := imagestore.Store(s.uploadsRoot, "groups", id, data)
	if err != nil {
		return nil, err
	}
	return s.repo.SetImagePath(ctx, id, &relPath)
}

func (s *GroupService) DeleteImage(ctx context.Context, id int64) (*models.Group, error) {
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

func (s *GroupService) ImageFile(ctx context.Context, id int64) (absPath, contentType string, err error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", "", err
	}
	if current.ImagePath == nil {
		return "", "", repository.ErrNotFound
	}
	return filepath.Join(s.uploadsRoot, *current.ImagePath), imagestore.ContentType(*current.ImagePath), nil
}

func (s *GroupService) List(ctx context.Context, campaignID int64) ([]models.Group, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *GroupService) Create(ctx context.Context, g *models.Group) error {
	return s.repo.Create(ctx, g)
}

func (s *GroupService) GetByID(ctx context.Context, id int64) (*models.Group, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *GroupService) GetMembers(ctx context.Context, groupID int64) ([]models.NPCGroupMember, error) {
	return s.repo.GetMembers(ctx, groupID)
}

func (s *GroupService) GetPCMembers(ctx context.Context, groupID int64) ([]models.PCGroupMember, error) {
	return s.repo.GetPCMembers(ctx, groupID)
}

func (s *GroupService) AddPCMember(ctx context.Context, groupID, pcID int64) error {
	return s.repo.AddPCMember(ctx, groupID, pcID)
}

func (s *GroupService) RemovePCMember(ctx context.Context, groupID, pcID int64) error {
	return s.repo.RemovePCMember(ctx, groupID, pcID)
}

func (s *GroupService) AddMember(ctx context.Context, groupID, npcID int64) error {
	return s.repo.AddMember(ctx, groupID, npcID)
}

func (s *GroupService) RemoveMember(ctx context.Context, groupID, npcID int64) error {
	return s.repo.RemoveMember(ctx, groupID, npcID)
}

func (s *GroupService) Update(ctx context.Context, id int64, g *models.Group) error {
	return s.repo.Update(ctx, id, g)
}

func (s *GroupService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
