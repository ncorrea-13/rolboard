package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/models"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
)

var ErrInvalidTimeline = errors.New("invalid timeline")

const maxTimelineNameLen = 60

type TimelineService struct {
	timelines *repository.TimelineRepository
	events    *repository.TimelineEventRepository
}

func NewTimelineService(timelines *repository.TimelineRepository, events *repository.TimelineEventRepository) *TimelineService {
	return &TimelineService{timelines: timelines, events: events}
}

func (s *TimelineService) ListTimelines(ctx context.Context, campaignID int64) ([]models.Timeline, error) {
	return s.timelines.List(ctx, campaignID)
}

func (s *TimelineService) GetTimeline(ctx context.Context, id int64) (*models.Timeline, error) {
	return s.timelines.GetByID(ctx, id)
}

func validTimeline(t *models.Timeline) error {
	t.Name = strings.TrimSpace(t.Name)
	if t.Name == "" || len(t.Name) > maxTimelineNameLen {
		return fmt.Errorf("%w: name must be 1-%d characters", ErrInvalidTimeline, maxTimelineNameLen)
	}
	if !hexColorRe.MatchString(t.Color) {
		return fmt.Errorf("%w: color must be #rrggbb", ErrInvalidTimeline)
	}
	t.StartLabel = strings.TrimSpace(t.StartLabel)
	t.EndLabel = strings.TrimSpace(t.EndLabel)
	return nil
}

func (s *TimelineService) CreateTimeline(ctx context.Context, t *models.Timeline) error {
	if err := validTimeline(t); err != nil {
		return err
	}
	return s.timelines.Create(ctx, t)
}

func (s *TimelineService) UpdateTimeline(ctx context.Context, id int64, t *models.Timeline) error {
	if err := validTimeline(t); err != nil {
		return err
	}
	return s.timelines.Update(ctx, id, t)
}

func (s *TimelineService) DeleteTimeline(ctx context.Context, id int64) error {
	return s.timelines.Delete(ctx, id)
}

func (s *TimelineService) ListEvents(ctx context.Context, campaignID int64) ([]models.TimelineEvent, error) {
	return s.events.List(ctx, campaignID)
}

func (s *TimelineService) GetEvent(ctx context.Context, id int64) (*models.TimelineEvent, error) {
	return s.events.GetByID(ctx, id)
}

func (s *TimelineService) CreateEvent(ctx context.Context, e *models.TimelineEvent) error {
	return s.events.Create(ctx, e)
}

func (s *TimelineService) UpdateEvent(ctx context.Context, id int64, e *models.TimelineEvent) error {
	return s.events.Update(ctx, id, e)
}

func (s *TimelineService) DeleteEvent(ctx context.Context, id int64) error {
	return s.events.Delete(ctx, id)
}
