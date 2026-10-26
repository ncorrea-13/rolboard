// Command mcp serves a Rolboard campaign to MCP clients over stdio.
//
// "rolboard-mcp login" asks for the campaign's access code once and saves it;
// without arguments it serves MCP.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"os/signal"
	"strconv"

	"golang.org/x/term"

	"github.com/ncorrea-13/rolboard/server/internal/mcpserver"
)

var version = "dev"

func main() {
	// stdout belongs to the MCP protocol: logs go to stderr.
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, nil)))

	if len(os.Args) > 1 && os.Args[1] == "login" {
		login(os.Args[2:])
		return
	}

	campaign := envCampaign()
	path := os.Getenv("ROLBOARD_CODE_FILE")
	if path == "" {
		var err error
		if path, err = mcpserver.CodePath(campaign); err != nil {
			fatal("buscando el código de acceso", err)
		}
	}
	code, err := mcpserver.ReadCode(path)
	if errors.Is(err, fs.ErrNotExist) {
		fatal(fmt.Sprintf("no hay código de acceso guardado: corré rolboard-mcp login --url %s --campaign %d", os.Getenv("ROLBOARD_URL"), campaign), err)
	}
	if err != nil {
		fatal("leyendo el código de acceso", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	err = mcpserver.Run(ctx, mcpserver.Config{
		BaseURL:    os.Getenv("ROLBOARD_URL"),
		CampaignID: campaign,
		AccessCode: code,
		Version:    version,
	})
	if err != nil {
		fatal("mcp", err)
	}
}

func login(args []string) {
	flags := flag.NewFlagSet("login", flag.ExitOnError)
	url := flags.String("url", os.Getenv("ROLBOARD_URL"), "dirección del servidor")
	campaignFlag := flags.Int64("campaign", envCampaignOr0(), "número de la campaña")
	_ = flags.Parse(args)
	if *url == "" || *campaignFlag == 0 {
		fatal("faltan --url y --campaign", errors.New("uso: rolboard-mcp login --url https://servidor --campaign 3"))
	}

	fd := int(os.Stdin.Fd())
	if !term.IsTerminal(fd) {
		fatal("login necesita una terminal", errors.New("stdin no es una terminal"))
	}
	fmt.Fprint(os.Stderr, "Código de acceso: ")
	raw, err := term.ReadPassword(fd)
	fmt.Fprintln(os.Stderr)
	if err != nil {
		fatal("leyendo el código", err)
	}

	path, err := mcpserver.CodePath(*campaignFlag)
	if err != nil {
		fatal("buscando dónde guardar", err)
	}
	if err := mcpserver.Login(context.Background(), *url, *campaignFlag, string(raw), path); err != nil {
		fatal("el servidor no aceptó el código", err)
	}
	fmt.Fprintln(os.Stderr, "Listo, guardado en", path)
}

func envCampaign() int64 {
	n, err := strconv.ParseInt(os.Getenv("ROLBOARD_CAMPAIGN"), 10, 64)
	if err != nil {
		fatal("ROLBOARD_CAMPAIGN inválido", err)
	}
	return n
}

func envCampaignOr0() int64 {
	n, _ := strconv.ParseInt(os.Getenv("ROLBOARD_CAMPAIGN"), 10, 64)
	return n
}

func fatal(msg string, err error) {
	slog.Error(msg, "err", err)
	os.Exit(1)
}
