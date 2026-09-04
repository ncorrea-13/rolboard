<div align="center">

# Rolboard

**Personal dashboard for tabletop RPG campaign management**

[![Go](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![SQLite](https://img.shields.io/badge/SQLite-modernc.org%2Fsqlite-003B57?logo=sqlite&logoColor=white)](https://modernc.org/sqlite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

[Español](README.es.md)

</div>

---

View of a tabletop RPG campaign's state. It is built to seat next to an Obsidian Vault, not to replace it. It works more as a Dashboard while the vault works more as the original database for long-form prose and lore. This app indexes the YAML frontmatter as metadata for fast lookup during a live session. 

This is a personal project and tool for the DM/GM. Runs on a homelab to learn Go, infraestructure and ci/cd. It is though to scale to be used as an emulated cloud service.. See [`docs/DECISIONS.md`](docs/DECISIONS.md) for the reasoning behind every scope call.

## Stack

| Layer      | Tech                                             |
| ---------- | ------------------------------------------------ |
| Backend    | Go 1.27, `net/http` stdlib (no router framework) |
| Database   | SQLite (`modernc.org/sqlite`, no cgo)            |
| Migrations | Versioned SQL files, embedded with `go:embed`    |
| Frontend   | React + TypeScript + Vite                        |

Full rationale for each choice: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

SQLite migrations run automatically on startup. Database file lands at `server/data/campaign.db`.

## Configuration

Environment variables (via `.env`):

| Variable | Description                                    |
| -------- |  ---------------------------------------------- |
| `PORT`   |  Host port to expose server (container:8080)    |
| `DB_PATH`|  Database path inside container (read-only) |

## Docker / Podman

Run with **Docker** or **Podman** (no differences in commands):

```bash
# Copy environment template
cp .env.example .env

# Build and run
docker-compose up --build

# Or with Podman
podman-compose up --build
```

The container includes:
- SQLite 
- Automatic schema migrations on startup
- Persistent data volume (`campaign_data`)

Adjust `PORT` in `.env` to expose on a different host port:

## API

Implemented so far:

| Method | Path             | Description    |
| ------ | ---------------- | -------------- |
| `GET`  | `/api/health`    | Health check   |
| `GET`  | `/api/campaigns` | List campaigns |

Full planned surface (Arcs, NPCs, Locations, Groups, Player Characters, Quests, Sessions, vault indexing): [`docs/API.md`](docs/API.md).

## Project Structure

```
rolboard/
├── docs/ 
├── server/
│   ├── cmd/server/main.go 
│   ├── internal/
│   │   ├── handlers/      
│   │   │   ├── campaigns.go
│   │   │   ├── health.go
│   │   │   └── router.go
│   │   ├── service/campaign.go
│   │   ├── repository/    
│   │   │   ├── campaign.go
│   │   │   ├── db.go
│   │   │   └── migrations/0001_initial_schema.sql
│   │   └── models/campaign.go
│   ├── go.mod
│   └── go.sum
├── AGENTS.md              
└── README.md
```

## About

Personal project, built as a deliberate Go-learning exercise no shortcuts, no code-generation of the backend logic. See [`AGENTS.md`](AGENTS.md) for how AI assistance is scoped on this repo.

**Nicolás Correa** — [github.com/ncorrea-13](https://github.com/ncorrea-13)
