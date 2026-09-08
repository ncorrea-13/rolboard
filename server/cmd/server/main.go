package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"strconv"

	"github.com/ncorrea-13/rolboard/server/internal/handlers"
	"github.com/ncorrea-13/rolboard/server/internal/repository"
	"github.com/ncorrea-13/rolboard/server/internal/service"
	"github.com/ncorrea-13/rolboard/server/internal/vault"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)

	dbPath := os.Getenv("DB_PATH")
	port := os.Getenv("PORT")
	vaultPath := os.Getenv("VAULT_PATH")
	campaignID, err := strconv.ParseInt(os.Getenv("CAMPAIGN_ID"), 10, 64)
	if err != nil {
		log.Fatalf("CAMPAIGN_ID inválido o faltante: %v", err)
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
	locationSvc := service.NewLocationService(locationRepo)

	npcRepo := repository.NewNPCRepository(db)
	npcSvc := service.NewNPCService(npcRepo)

	pcRepo := repository.NewPlayerCharacterRepository(db)
	pcSvc := service.NewPlayerCharacterService(pcRepo)

	questRepo := repository.NewQuestRepository(db)
	questSvc := service.NewQuestService(questRepo)

	sessionRepo := repository.NewSessionRepository(db)
	sessionSvc := service.NewSessionService(sessionRepo)

	groupRepo := repository.NewGroupRepository(db)
	groupSvc := service.NewGroupService(groupRepo)

	indexer := vault.NewIndexer(vaultPath, campaignID, db)
	adminSvc := service.NewAdminService(indexer)

	h := handlers.NewHandlers(campaignSvc, arcSvc, locationSvc, npcSvc, pcSvc, questSvc, sessionSvc, groupSvc, adminSvc)

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
