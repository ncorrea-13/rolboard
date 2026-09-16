package service

import (
	"context"
	"path/filepath"

	"github.com/ncorrea-13/rolboard/server/internal/imagestore"
	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

type PlayerCharacterService struct {
	repo        *repository.PlayerCharacterRepository
	uploadsRoot string
}

func NewPlayerCharacterService(repo *repository.PlayerCharacterRepository, uploadsRoot string) *PlayerCharacterService {
	return &PlayerCharacterService{repo: repo, uploadsRoot: uploadsRoot}
}

func (s *PlayerCharacterService) SetImage(ctx context.Context, id int64, data []byte) (*models.PlayerCharacter, error) {
	relPath, err := imagestore.Store(s.uploadsRoot, "player_characters", id, data)
	if err != nil {
		return nil, err
	}
	return s.repo.SetImagePath(ctx, id, &relPath)
}

func (s *PlayerCharacterService) DeleteImage(ctx context.Context, id int64) (*models.PlayerCharacter, error) {
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

func (s *PlayerCharacterService) ImageFile(ctx context.Context, id int64) (absPath, contentType string, err error) {
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", "", err
	}
	if current.ImagePath == nil {
		return "", "", repository.ErrNotFound
	}
	return filepath.Join(s.uploadsRoot, *current.ImagePath), imagestore.ContentType(*current.ImagePath), nil
}

func (s *PlayerCharacterService) List(ctx context.Context, campaignID int64) ([]models.PlayerCharacter, error) {
	return s.repo.List(ctx, campaignID)
}

func (s *PlayerCharacterService) Create(ctx context.Context, p *models.PlayerCharacter) error {
	return s.repo.Create(ctx, p)
}

func (s *PlayerCharacterService) GetByID(ctx context.Context, id int64) (*models.PlayerCharacter, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *PlayerCharacterService) Update(ctx context.Context, id int64, p *models.PlayerCharacter) error {
	return s.repo.Update(ctx, id, p)
}

func (s *PlayerCharacterService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
