package handlers

import (
	"database/sql"
	"log/slog"
	"net/http"

	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func internalError(w http.ResponseWriter, err error, msg string) {
	slog.Error(msg, "err", err)
	http.Error(w, msg, http.StatusInternalServerError)
}

type Handlers struct {
	db                    *sql.DB
	adminToken            string
	cookieSecure          bool
	trustProxyHeaders     bool
	auth                  *service.AuthService
	campaigns             *service.CampaignService
	arcs                  *service.ArcService
	locations             *service.LocationService
	npcs                  *service.NPCService
	playerCharacters      *service.PlayerCharacterService
	quests                *service.QuestService
	sessions              *service.SessionService
	groups                *service.GroupService
	admin                 *service.AdminService
	dashboard             *service.DashboardService
	notes                 *service.NotesService
	encounters            *service.EncounterService
	encounterParticipants *service.EncounterParticipantService
}

func NewHandlers(
	db *sql.DB,
	adminToken string,
	cookieSecure bool,
	trustProxyHeaders bool,
	auth *service.AuthService,
	campaigns *service.CampaignService,
	arcs *service.ArcService,
	locations *service.LocationService,
	npcs *service.NPCService,
	playerCharacters *service.PlayerCharacterService,
	quests *service.QuestService,
	sessions *service.SessionService,
	groups *service.GroupService,
	admin *service.AdminService,
	dashboard *service.DashboardService,
	notes *service.NotesService,
	encounters *service.EncounterService,
	encounterParticipants *service.EncounterParticipantService,
) *Handlers {
	return &Handlers{
		db:                    db,
		adminToken:            adminToken,
		cookieSecure:          cookieSecure,
		trustProxyHeaders:     trustProxyHeaders,
		auth:                  auth,
		campaigns:             campaigns,
		arcs:                  arcs,
		locations:             locations,
		npcs:                  npcs,
		playerCharacters:      playerCharacters,
		quests:                quests,
		sessions:              sessions,
		groups:                groups,
		admin:                 admin,
		dashboard:             dashboard,
		notes:                 notes,
		encounters:            encounters,
		encounterParticipants: encounterParticipants,
	}
}
