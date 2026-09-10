package service

import (
	"context"
	"sort"

	"github.com/ncorrea-13/rolboard/server/internal/models"
)

const recentNPCsLimit = 5

type DashboardService struct {
	quests   *QuestService
	npcs     *NPCService
	sessions *SessionService
}

func NewDashboardService(quests *QuestService, npcs *NPCService, sessions *SessionService) *DashboardService {
	return &DashboardService{quests: quests, npcs: npcs, sessions: sessions}
}

func (s *DashboardService) Get(ctx context.Context, campaignID int64) (*models.DashboardSummary, error) {
	quests, err := s.quests.List(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	npcs, err := s.npcs.List(ctx, campaignID)
	if err != nil {
		return nil, err
	}
	sessions, err := s.sessions.List(ctx, campaignID)
	if err != nil {
		return nil, err
	}

	summary := &models.DashboardSummary{}
	for _, q := range quests {
		switch q.Status {
		case "active":
			summary.ActiveQuests = append(summary.ActiveQuests, q)
		case "on_hold":
			summary.OnHoldQuests = append(summary.OnHoldQuests, q)
		}
	}

	sort.Slice(npcs, func(i, j int) bool { return npcs[i].UpdatedAt > npcs[j].UpdatedAt })
	if len(npcs) > recentNPCsLimit {
		npcs = npcs[:recentNPCsLimit]
	}
	summary.RecentNPCs = npcs

	if len(sessions) > 0 {
		sort.Slice(sessions, func(i, j int) bool {
			if sessions[i].SessionNumber != sessions[j].SessionNumber {
				return sessions[i].SessionNumber > sessions[j].SessionNumber
			}
			return sessions[i].SubNumber > sessions[j].SubNumber
		})
		summary.LastSession = &sessions[0]
	}

	return summary, nil
}
