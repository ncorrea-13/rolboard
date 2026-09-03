<div align="center">

# Rolboard

**Personal dashboard for tabletop RPG campaign management**

[![Go](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![SQLite](https://img.shields.io/badge/SQLite-modernc.org%2Fsqlite-003B57?logo=sqlite&logoColor=white)](https://modernc.org/sqlite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

[Español](README.es.md)

</div>

---

Structured, queryable view of a tabletop RPG campaign's state — NPCs, locations, quests, sessions — meant to sit next to an Obsidian vault, not replace it. The vault stays the source of truth for long-form prose and lore; this dashboard indexes its YAML frontmatter for fast lookup during a live session ("what did I promise this NPC?", "who's in this city right now?", "which quests are active?").

Single-user tool for the DM/GM, not something players see. Runs on a homelab node, reachable only over Tailscale — no public exposure. See [`docs/DECISIONS.md`](docs/DECISIONS.md) for the reasoning behind every scope call.

## Stack

| Layer | Tech |
| --- | --- |
| Backend | Go 1.27, `net/http` stdlib (no router framework) |
| Database | SQLite (`modernc.org/sqlite`, no cgo) |
| Migrations | Versioned SQL files, embedded with `go:embed` |
| Frontend | React + TypeScript + Vite — not started yet |

Full rationale for each choice: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick Start

Only the backend exists so far — no container setup yet.

```bash
git clone git@github.com:ncorrea-13/rolboard.git
cd rolboard/server
go mod download
go run ./cmd/server
# → http://localhost:8080/api/health
```

SQLite migrations run automatically on startup. Database file lands at `server/data/campaign.db` (gitignored).

## Configuration

No environment variables yet — the database path (`./data/campaign.db`) and port (`:8080`) are hardcoded in [`cmd/server/main.go`](server/cmd/server/main.go).

## API

Implemented so far:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/campaigns` | List campaigns |

Full planned surface (Arcs, NPCs, Locations, Groups, Player Characters, Quests, Sessions, vault indexing): [`docs/API.md`](docs/API.md).

## Project Structure

```
rolboard/
├── docs/                          # architecture, data model, API, decisions (ADR-style)
├── server/                        # backend (Go)
│   ├── cmd/server/main.go         # entrypoint
│   ├── internal/
│   │   ├── handlers/              # HTTP handlers + router
│   │   │   ├── campaigns.go
│   │   │   ├── health.go
│   │   │   └── router.go
│   │   ├── service/campaign.go
│   │   ├── repository/            # SQLite access + migrations
│   │   │   ├── campaign.go
│   │   │   ├── db.go
│   │   │   └── migrations/0001_initial_schema.sql
│   │   └── models/campaign.go
│   ├── go.mod
│   └── go.sum
├── AGENTS.md                      # working agreement for AI-assisted development
└── README.md
```

## About

Personal project, built as a deliberate Go-learning exercise — no shortcuts, no code-generation of the backend logic. See [`AGENTS.md`](AGENTS.md) for how AI assistance is scoped on this repo.

**Nicolás Correa** — [github.com/ncorrea-13](https://github.com/ncorrea-13)
