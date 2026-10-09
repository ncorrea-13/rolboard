package handlers

import (
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func apiError(w http.ResponseWriter, status int, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"code": code})
}

func internalError(w http.ResponseWriter, err error, msg string) {
	slog.Error(msg, "err", err)
	http.Error(w, msg, http.StatusInternalServerError)
}

type Handlers struct {
	db                    *sql.DB
	adminToken            string
	cookieSecure          bool
	trustProxyHeaders     bool
	localMode             bool
	auth                  *service.AuthService
	campaigns             *service.CampaignService
	arcs                  *service.ArcService
	locations             *service.LocationService
	npcs                  *service.NPCService
	npcTypes              *service.NPCTypeService
	playerCharacters      *service.PlayerCharacterService
	quests                *service.QuestService
	sessions              *service.SessionService
	groups                *service.GroupService
	admin                 *service.AdminService
	dashboard             *service.DashboardService
	notes                 *service.NotesService
	encounters            *service.EncounterService
	encounterParticipants *service.EncounterParticipantService
	trash                 *service.TrashService
}

func NewHandlers(
	db *sql.DB,
	adminToken string,
	cookieSecure bool,
	trustProxyHeaders bool,
	localMode bool,
	auth *service.AuthService,
	campaigns *service.CampaignService,
	arcs *service.ArcService,
	locations *service.LocationService,
	npcs *service.NPCService,
	npcTypes *service.NPCTypeService,
	playerCharacters *service.PlayerCharacterService,
	quests *service.QuestService,
	sessions *service.SessionService,
	groups *service.GroupService,
	admin *service.AdminService,
	dashboard *service.DashboardService,
	notes *service.NotesService,
	encounters *service.EncounterService,
	encounterParticipants *service.EncounterParticipantService,
	trash *service.TrashService,
) *Handlers {
	return &Handlers{
		db:                    db,
		adminToken:            adminToken,
		cookieSecure:          cookieSecure,
		trustProxyHeaders:     trustProxyHeaders,
		localMode:             localMode,
		auth:                  auth,
		campaigns:             campaigns,
		arcs:                  arcs,
		locations:             locations,
		npcs:                  npcs,
		npcTypes:              npcTypes,
		playerCharacters:      playerCharacters,
		quests:                quests,
		sessions:              sessions,
		groups:                groups,
		admin:                 admin,
		dashboard:             dashboard,
		notes:                 notes,
		encounters:            encounters,
		encounterParticipants: encounterParticipants,
		trash:                 trash,
	}
}
