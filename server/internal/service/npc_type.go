package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

var ErrInvalidNPCType = errors.New("invalid npc type")

const maxNPCTypeLabelLen = 40

var hexColorRe = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

var accentReplacer = strings.NewReplacer("á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n")

type NPCTypeService struct {
	repo *repository.NPCTypeRepository
}

func NewNPCTypeService(repo *repository.NPCTypeRepository) *NPCTypeService {
	return &NPCTypeService{repo: repo}
}

// slugify turns a label into a vault-friendly key: "Ent. Cognitiva" -> "ent-cognitiva".
func slugify(label string) string {
	s := accentReplacer.Replace(strings.ToLower(strings.TrimSpace(label)))
	var b strings.Builder
	dash := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			dash = false
		} else if !dash && b.Len() > 0 {
			b.WriteByte('-')
			dash = true
		}
	}
	return strings.Trim(b.String(), "-")
}

func validNPCTypeFields(label, color string) error {
	if label == "" || len(label) > maxNPCTypeLabelLen {
		return fmt.Errorf("%w: label must be 1-%d characters", ErrInvalidNPCType, maxNPCTypeLabelLen)
	}
	if !hexColorRe.MatchString(color) {
		return fmt.Errorf("%w: color must be #rrggbb", ErrInvalidNPCType)
	}
	return nil
}

func (s *NPCTypeService) List(ctx context.Context, campaignID int64) ([]models.NPCType, error) {
	return s.repo.List(ctx, campaignID)
}

// IsValidKind reports whether an NPC of the campaign may use kind: a defined type or the reserved reference kind.
func (s *NPCTypeService) IsValidKind(ctx context.Context, campaignID int64, kind string) (bool, error) {
	if kind == repository.ReferenceNPCKind {
		return true, nil
	}
	return s.repo.Exists(ctx, campaignID, kind)
}

// Create derives the key from the label and appends -2, -3... when it is already taken.
func (s *NPCTypeService) Create(ctx context.Context, campaignID int64, label, color string) (*models.NPCType, error) {
	label = strings.TrimSpace(label)
	if err := validNPCTypeFields(label, color); err != nil {
		return nil, err
	}
	base := slugify(label)
	if base == "" || base == repository.ReferenceNPCKind {
		return nil, fmt.Errorf("%w: label needs letters or digits", ErrInvalidNPCType)
	}

	key := base
	for n := 2; ; n++ {
		taken, err := s.repo.Exists(ctx, campaignID, key)
		if err != nil {
			return nil, err
		}
		if !taken {
			break
		}
		key = fmt.Sprintf("%s-%d", base, n)
	}

	t := &models.NPCType{CampaignID: campaignID, Key: key, Label: label, Color: color}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *NPCTypeService) Update(ctx context.Context, id int64, label, color string) (*models.NPCType, error) {
	label = strings.TrimSpace(label)
	if err := validNPCTypeFields(label, color); err != nil {
		return nil, err
	}
	return s.repo.Update(ctx, id, label, color)
}

func (s *NPCTypeService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
