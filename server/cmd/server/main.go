package main

import (
	"log"
	"net/http"

	"github.com/ncorrea/campaign-dashboard/server/internal/repository"
)

func main() {
	db, err := repository.Open("./data/campaign.db")
	if err != nil {
		log.Fatalf("error abriendo la base de datos: %v", err)
	}
	defer db.Close()

	if err := repository.Migrate(db); err != nil {
		log.Fatalf("error al realizar migraciones: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	log.Println("servidor escuchando en :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatalf("error del servidor: %v", err)
	}
}
