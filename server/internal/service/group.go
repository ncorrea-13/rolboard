package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type GroupService struct {
	repo *repository.GroupRepository
}

func NewGroupService(repo *repository.GroupRepository) *GroupService {
	return &GroupService{repo: repo}
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
