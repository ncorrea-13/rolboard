package app

import (
	"fmt"
	"io"
	"net/http"

	"github.com/ncorrea-13/rolboard/server/internal/handlers"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

type Config struct {
	DBPath            string
	VaultsRoot        string
	UploadsRoot       string
	AdminToken        string
	CookieSecure      bool
	TrustProxyHeaders bool
	LocalMode         bool
}

func New(cfg Config) (http.Handler, io.Closer, error) {
	db, err := repository.Open(cfg.DBPath)
	if err != nil {
		return nil, nil, fmt.Errorf("abriendo la base de datos: %w", err)
	}

	if err := repository.Migrate(db); err != nil {
		_ = db.Close()
		return nil, nil, fmt.Errorf("migrando: %w", err)
	}

	campaignRepo := repository.NewCampaignRepository(db)
	campaignSvc := service.NewCampaignService(campaignRepo)

	arcRepo := repository.NewArcRepository(db)
	arcSvc := service.NewArcService(arcRepo)

	locationRepo := repository.NewLocationRepository(db)
	locationSvc := service.NewLocationService(locationRepo, cfg.UploadsRoot)

	npcRepo := repository.NewNPCRepository(db)
	npcSvc := service.NewNPCService(npcRepo, cfg.UploadsRoot)

	pcRepo := repository.NewPlayerCharacterRepository(db)
	pcSvc := service.NewPlayerCharacterService(pcRepo, cfg.UploadsRoot)

	questRepo := repository.NewQuestRepository(db)
	questSvc := service.NewQuestService(questRepo)

	sessionRepo := repository.NewSessionRepository(db)
	sessionSvc := service.NewSessionService(sessionRepo)

	groupRepo := repository.NewGroupRepository(db)
	groupSvc := service.NewGroupService(groupRepo, cfg.UploadsRoot)

	encounterRepo := repository.NewEncounterRepository(db)
	encounterSvc := service.NewEncounterService(encounterRepo)

	encounterParticipantRepo := repository.NewEncounterParticipantRepository(db)
	encounterParticipantSvc := service.NewEncounterParticipantService(encounterParticipantRepo)

	authSessionRepo := repository.NewAuthSessionRepository(db)
	authSvc := service.NewAuthService(campaignRepo, authSessionRepo)

	npcTypeSvc := service.NewNPCTypeService(repository.NewNPCTypeRepository(db))

	adminSvc := service.NewAdminService(db, campaignRepo, cfg.VaultsRoot)
	dashboardSvc := service.NewDashboardService(questSvc, npcSvc, sessionSvc)
	notesSvc := service.NewNotesService(campaignRepo, locationRepo, npcRepo, groupRepo, sessionRepo, arcRepo, pcRepo, cfg.VaultsRoot)

	h := handlers.NewHandlers(db, cfg.AdminToken, cfg.CookieSecure, cfg.TrustProxyHeaders, cfg.LocalMode, authSvc, campaignSvc, arcSvc, locationSvc, npcSvc, npcTypeSvc, pcSvc, questSvc, sessionSvc, groupSvc, adminSvc, dashboardSvc, notesSvc, encounterSvc, encounterParticipantSvc)

	return handlers.RequestLogger(handlers.NewRouter(h)), db, nil
}
