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

	"github.com/ncorrea-13/rolboard/server/internal/app"
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

	handler, closer, err := app.New(app.Config{
		DBPath:            dbPath,
		VaultsRoot:        vaultsRoot,
		UploadsRoot:       uploadsRoot,
		AdminToken:        adminToken,
		CookieSecure:      cookieSecure,
		TrustProxyHeaders: trustProxyHeaders,
	})
	if err != nil {
		slog.Error("error inicializando la app", "err", err)
		os.Exit(1)
	}
	defer func() {
		if err := closer.Close(); err != nil {
			slog.Error("error cerrando DB", "err", err)
		}
	}()

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: handler,
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
