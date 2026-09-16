package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/ncorrea-13/rolboard/server/internal/handlers"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)

	if os.Getenv("LOG_JSON") == "true" {
		slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	}

	dbPath := os.Getenv("DB_PATH")
	port := os.Getenv("PORT")
	vaultsRoot := os.Getenv("VAULTS_ROOT")
	uploadsRoot := os.Getenv("UPLOADS_ROOT")
	adminToken := os.Getenv("ADMIN_TOKEN")
	cookieSecure := os.Getenv("COOKIE_SECURE") != "false"
	trustProxyHeaders := os.Getenv("TRUST_PROXY_HEADERS") == "true"
	if path := os.Getenv("ADMIN_TOKEN_FILE"); path != "" {
		data, err := os.ReadFile(path)
		if err != nil {
			slog.Error("error leyendo ADMIN_TOKEN_FILE", "err", err)
			os.Exit(1)
		}
		adminToken = strings.TrimSpace(string(data))
	}

	defer stop()

	db, err := repository.Open(dbPath)
	if err != nil {
		slog.Error("error abriendo la base de datos", "err", err)
		os.Exit(1)
	}
	defer func() {
		if err := db.Close(); err != nil {
			slog.Error("error cerrando DB", "err", err)
		}
	}()

	if err := repository.Migrate(db); err != nil {
		slog.Error("error al realizar migraciones", "err", err)
		os.Exit(1)
	}

	campaignRepo := repository.NewCampaignRepository(db)
	campaignSvc := service.NewCampaignService(campaignRepo)

	arcRepo := repository.NewArcRepository(db)
	arcSvc := service.NewArcService(arcRepo)

	locationRepo := repository.NewLocationRepository(db)
	locationSvc := service.NewLocationService(locationRepo, uploadsRoot)

	npcRepo := repository.NewNPCRepository(db)
	npcSvc := service.NewNPCService(npcRepo, uploadsRoot)

	pcRepo := repository.NewPlayerCharacterRepository(db)
	pcSvc := service.NewPlayerCharacterService(pcRepo, uploadsRoot)

	questRepo := repository.NewQuestRepository(db)
	questSvc := service.NewQuestService(questRepo)

	sessionRepo := repository.NewSessionRepository(db)
	sessionSvc := service.NewSessionService(sessionRepo)

	groupRepo := repository.NewGroupRepository(db)
	groupSvc := service.NewGroupService(groupRepo, uploadsRoot)

	encounterRepo := repository.NewEncounterRepository(db)
	encounterSvc := service.NewEncounterService(encounterRepo)

	encounterParticipantRepo := repository.NewEncounterParticipantRepository(db)
	encounterParticipantSvc := service.NewEncounterParticipantService(encounterParticipantRepo)

	authSessionRepo := repository.NewAuthSessionRepository(db)
	authSvc := service.NewAuthService(campaignRepo, authSessionRepo)

	adminSvc := service.NewAdminService(db, campaignRepo, vaultsRoot)
	dashboardSvc := service.NewDashboardService(questSvc, npcSvc, sessionSvc)
	notesSvc := service.NewNotesService(campaignRepo, locationRepo, npcRepo, groupRepo, sessionRepo, arcRepo, pcRepo, vaultsRoot)

	h := handlers.NewHandlers(db, adminToken, cookieSecure, trustProxyHeaders, authSvc, campaignSvc, arcSvc, locationSvc, npcSvc, pcSvc, questSvc, sessionSvc, groupSvc, adminSvc, dashboardSvc, notesSvc, encounterSvc, encounterParticipantSvc)

	mux := handlers.NewRouter(h)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: handlers.RequestLogger(mux),
	}
	go func() {
		slog.Info("listening", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()
	<-ctx.Done()

	slog.Info("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("forced shutdown", "err", err)
		os.Exit(1)
	}
}
