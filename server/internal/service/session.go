package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type SessionService struct {
	repo *repository.SessionRepository
}

func NewSessionService(repo *repository.SessionRepository) *SessionService {
	return &SessionService{repo: repo}
}

func (s *SessionService) List(ctx context.Context, campaignID int64) ([]models.Session, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *SessionService) Create(ctx context.Context, sess *models.Session) error {
	return s.repo.Create(ctx, sess)
}

func (s *SessionService) GetByID(ctx context.Context, id int64) (*models.Session, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *SessionService) Update(ctx context.Context, id int64, sess *models.Session) error {
	return s.repo.Update(ctx, id, sess)
}

func (s *SessionService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

func (s *SessionService) ListNpcs(ctx context.Context, sessionID int64) ([]models.SessionNpc, error) {
	return s.repo.ListNpcs(ctx, sessionID)
}

func (s *SessionService) AddNpc(ctx context.Context, sessionID, npcID int64) error {
	return s.repo.AddNpc(ctx, sessionID, npcID)
}

func (s *SessionService) RemoveNpc(ctx context.Context, sessionID, npcID int64) error {
	return s.repo.RemoveNpc(ctx, sessionID, npcID)
}

func (s *SessionService) ListQuests(ctx context.Context, sessionID int64) ([]models.SessionQuest, error) {
	return s.repo.ListQuests(ctx, sessionID)
}

func (s *SessionService) AddQuest(ctx context.Context, sessionID, questID int64) error {
	return s.repo.AddQuest(ctx, sessionID, questID)
}

func (s *SessionService) RemoveQuest(ctx context.Context, sessionID, questID int64) error {
	return s.repo.RemoveQuest(ctx, sessionID, questID)
}
