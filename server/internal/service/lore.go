package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

var ErrInvalidLoreCategory = errors.New("invalid lore category")

type LoreService struct {
	categories *repository.LoreCategoryRepository
	entries    *repository.LoreEntryRepository
}

func NewLoreService(categories *repository.LoreCategoryRepository, entries *repository.LoreEntryRepository) *LoreService {
	return &LoreService{categories: categories, entries: entries}
}

func (s *LoreService) ListCategories(ctx context.Context, campaignID int64) ([]models.LoreCategory, error) {
	return s.categories.List(ctx, campaignID)
}

func (s *LoreService) GetCategory(ctx context.Context, id int64) (*models.LoreCategory, error) {
	return s.categories.GetByID(ctx, id)
}

func (s *LoreService) CreateCategory(ctx context.Context, campaignID int64, label, color string) (*models.LoreCategory, error) {
	label = strings.TrimSpace(label)
	if err := validNPCTypeFields(label, color); err != nil {
		return nil, fmt.Errorf("%w: %s", ErrInvalidLoreCategory, err)
	}
	base := repository.NPCTypeKey(label)
	if base == "" {
		return nil, fmt.Errorf("%w: label needs letters or digits", ErrInvalidLoreCategory)
	}

	key := base
	for n := 2; ; n++ {
		taken, err := s.categories.Exists(ctx, campaignID, key)
		if err != nil {
			return nil, err
		}
		if !taken {
			break
		}
		key = fmt.Sprintf("%s-%d", base, n)
	}

	c := &models.LoreCategory{CampaignID: campaignID, Key: key, Label: label, Color: color}
	if err := s.categories.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *LoreService) UpdateCategory(ctx context.Context, id int64, label, color string) (*models.LoreCategory, error) {
	label = strings.TrimSpace(label)
	if err := validNPCTypeFields(label, color); err != nil {
		return nil, fmt.Errorf("%w: %s", ErrInvalidLoreCategory, err)
	}
	return s.categories.Update(ctx, id, label, color)
}

func (s *LoreService) DeleteCategory(ctx context.Context, id int64) error {
	return s.categories.Delete(ctx, id)
}

func (s *LoreService) ListEntries(ctx context.Context, campaignID int64) ([]models.LoreEntry, error) {
	return s.entries.List(ctx, campaignID)
}

func (s *LoreService) CreateEntry(ctx context.Context, e *models.LoreEntry) error {
	return s.entries.Create(ctx, e)
}

func (s *LoreService) GetEntry(ctx context.Context, id int64) (*models.LoreEntry, error) {
	return s.entries.GetByID(ctx, id)
}

func (s *LoreService) UpdateEntry(ctx context.Context, id int64, e *models.LoreEntry) error {
	return s.entries.Update(ctx, id, e)
}

func (s *LoreService) DeleteEntry(ctx context.Context, id int64) error {
	return s.entries.Delete(ctx, id)
}
