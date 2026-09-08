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
