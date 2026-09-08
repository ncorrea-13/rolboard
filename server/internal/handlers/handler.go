package handlers

import "github.com/ncorrea-13/rolboard/server/internal/service"

type Handlers struct {
	campaigns        *service.CampaignService
	arcs             *service.ArcService
	locations        *service.LocationService
	npcs             *service.NPCService
	playerCharacters *service.PlayerCharacterService
	quests           *service.QuestService
	sessions         *service.SessionService
	groups           *service.GroupService
}

func NewHandlers(
	campaigns *service.CampaignService,
	arcs *service.ArcService,
	locations *service.LocationService,
	npcs *service.NPCService,
	playerCharacters *service.PlayerCharacterService,
	quests *service.QuestService,
	sessions *service.SessionService,
	groups *service.GroupService,
) *Handlers {
	return &Handlers{
		campaigns:        campaigns,
		arcs:             arcs,
		locations:        locations,
		npcs:             npcs,
		playerCharacters: playerCharacters,
		quests:           quests,
		sessions:         sessions,
		groups:           groups,
	}
}
