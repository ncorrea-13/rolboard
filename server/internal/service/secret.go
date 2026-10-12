package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type SecretService struct {
	repo *repository.SecretRepository
}

func NewSecretService(repo *repository.SecretRepository) *SecretService {
	return &SecretService{repo: repo}
}

func (s *SecretService) List(ctx context.Context, campaignID int64) ([]models.Secret, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *SecretService) Create(ctx context.Context, secret *models.Secret) error {
	return s.repo.Create(ctx, secret)
}

func (s *SecretService) GetByID(ctx context.Context, id int64) (*models.Secret, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *SecretService) Update(ctx context.Context, id int64, secret *models.Secret) error {
	return s.repo.Update(ctx, id, secret)
}

func (s *SecretService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
