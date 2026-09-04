package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
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

	repo := repository.NewCampaignRepository(db)
	svc := service.NewCampaignService(repo)
	h := handlers.NewHandlers(svc)
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
