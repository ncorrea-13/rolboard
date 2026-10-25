// Command mcp serves a Rolboard campaign to MCP clients over stdio.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"

	"github.com/ncorrea-13/rolboard/server/internal/mcpserver"
)

var version = "dev"

func main() {
	// stdout belongs to the MCP protocol: logs go to stderr.
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, nil)))

	campaign, err := strconv.ParseInt(os.Getenv("ROLBOARD_CAMPAIGN"), 10, 64)
	if err != nil {
		fatal("ROLBOARD_CAMPAIGN inválido", err)
	}
	code, err := os.ReadFile(os.Getenv("ROLBOARD_CODE_FILE"))
	if err != nil {
		fatal("leyendo ROLBOARD_CODE_FILE", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	err = mcpserver.Run(ctx, mcpserver.Config{
		BaseURL:    os.Getenv("ROLBOARD_URL"),
		CampaignID: campaign,
		AccessCode: strings.TrimSpace(string(code)),
		Version:    version,
	})
	if err != nil {
		fatal("mcp", err)
	}
}

func fatal(msg string, err error) {
	slog.Error(msg, "err", err)
	os.Exit(1)
}
