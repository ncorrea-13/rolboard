package service

import (
	"context"
	"path/filepath"

	"github.com/ncorrea-13/rolboard/server/internal/imagestore"
	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type LocationService struct {
	repo        *repository.LocationRepository
	uploadsRoot string
}

func NewLocationService(repo *repository.LocationRepository, uploadsRoot string) *LocationService {
	return &LocationService{repo: repo, uploadsRoot: uploadsRoot}
}

func (s *LocationService) SetImage(ctx context.Context, id int64, data []byte) (*models.Location, error) {
	relPath, err := imagestore.Store(s.uploadsRoot, "locations", id, data)
	if err != nil {
		return nil, err
	}
	return s.repo.SetImagePath(ctx, id, &relPath)
}

func (s *LocationService) DeleteImage(ctx context.Context, id int64) (*models.Location, error) {
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

func (s *LocationService) ImageFile(ctx context.Context, id int64) (absPath, contentType string, err error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", "", err
	}
	if current.ImagePath == nil {
		return "", "", repository.ErrNotFound
	}
	return filepath.Join(s.uploadsRoot, *current.ImagePath), imagestore.ContentType(*current.ImagePath), nil
}

func (s *LocationService) List(ctx context.Context, campaignID int64) ([]models.Location, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *LocationService) Create(ctx context.Context, l *models.Location) error {
	return s.repo.Create(ctx, l)
}

func (s *LocationService) GetByID(ctx context.Context, id int64) (*models.Location, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *LocationService) Update(ctx context.Context, id int64, l *models.Location) error {
	return s.repo.Update(ctx, id, l)
}

func (s *LocationService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
