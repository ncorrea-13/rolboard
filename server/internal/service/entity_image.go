package service

import (
	"context"

	"github.com/ncorrea-13/rolboard/server/internal/imagestore"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

// EntityImageService stores the single image of items, arcs, lore entries and
// quests. The table name doubles as the folder inside the uploads root.
type EntityImageService struct {
	repo        *repository.EntityImageRepository
	uploadsRoot string
}

func NewEntityImageService(repo *repository.EntityImageRepository, uploadsRoot string) *EntityImageService {
	return &EntityImageService{repo: repo, uploadsRoot: uploadsRoot}
}

func (s *EntityImageService) Set(ctx context.Context, table string, id int64, data []byte) error {
	relPath, err := imagestore.Store(s.uploadsRoot, table, id, data)
	if err != nil {
		return err
	}
	return s.repo.SetPath(ctx, table, id, &relPath)
}

func (s *EntityImageService) Delete(ctx context.Context, table string, id int64) error {
	current, err := s.repo.Path(ctx, table, id)
	if err != nil {
		return err
	}
	if current != nil {
		if err := imagestore.Delete(s.uploadsRoot, *current); err != nil {
			return err
		}
	}
	return s.repo.SetPath(ctx, table, id, nil)
}

func (s *EntityImageService) File(ctx context.Context, table string, id int64) (absPath, contentType string, err error) {
	current, err := s.repo.Path(ctx, table, id)
	if err != nil {
		return "", "", err
	}
	if current == nil {
		return "", "", repository.ErrNotFound
	}
	path, err := imagestore.Path(s.uploadsRoot, *current)
	if err != nil {
		return "", "", err
	}
	return path, imagestore.ContentType(*current), nil
}
