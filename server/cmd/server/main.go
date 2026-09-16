package main

import (
	"context"
	"log"
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

	dbPath := os.Getenv("DB_PATH")
	port := os.Getenv("PORT")
	vaultsRoot := os.Getenv("VAULTS_ROOT")
	uploadsRoot := os.Getenv("UPLOADS_ROOT")
	adminToken := os.Getenv("ADMIN_TOKEN")
	cookieSecure := os.Getenv("COOKIE_SECURE") != "false"
	if path := os.Getenv("ADMIN_TOKEN_FILE"); path != "" {
		data, err := os.ReadFile(path)
		if err != nil {
			log.Fatalf("error leyendo ADMIN_TOKEN_FILE: %v", err)
		}
		adminToken = strings.TrimSpace(string(data))
	}

	defer stop()

	db, err := repository.Open(dbPath)
	if err != nil {
		log.Fatalf("error abriendo la base de datos: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("error cerrando DB: %v", err)
		}
	}()

	if err := repository.Migrate(db); err != nil {
		log.Fatalf("error al realizar migraciones: %v", err)
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

	h := handlers.NewHandlers(db, adminToken, cookieSecure, authSvc, campaignSvc, arcSvc, locationSvc, npcSvc, pcSvc, questSvc, sessionSvc, groupSvc, adminSvc, dashboardSvc, notesSvc, encounterSvc, encounterParticipantSvc)

	mux := handlers.NewRouter(h)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}
	go func() {
		log.Println("Listening on :" + port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	<-ctx.Done()

	log.Println("shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}
}
