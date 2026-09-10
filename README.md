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
| Frontend   | React + TypeScript + Vite (scaffolded, still on mock data — not wired to the API yet) |

Full rationale for each choice: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

SQLite migrations run automatically on startup.

One backend instance serves multiple campaigns — each `campaigns` row stores its own `vault_path`, a subfolder under a shared `VAULTS_ROOT` mount. See [`vault-template/`](vault-template/) for a ready-to-copy vault structure the indexer recognizes out of the box.

## Configuration

Environment variables (via `.env`, see `.env.example`):

| Variable            | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `PORT`              | Host port to expose the server on (container listens on `:8080`)   |
| `DB_PATH`           | Database path inside the container                                 |
| `VAULTS_ROOT_HOST`  | Host folder holding every campaign's Obsidian vault as a subfolder |

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

Full CRUD (`GET`/`POST`/`PUT`/`DELETE`) for `campaigns`, `arcs`, `locations`, `npcs`, `player-characters`, `quests`, `sessions` and `groups`, plus `GET /api/health` and `POST /api/campaigns/{id}/reindex`. The reindex endpoint is a real upsert against the campaign's vault — creating, editing, moving or deleting a note is reflected the next time you call it, no manual DB cleanup needed.

Full surface, including still-pending pieces (dashboard views, markdown rendering): [`docs/API.md`](docs/API.md).

## Project Structure

```
rolboard/
├── docs/
├── vault-template/                # ready-to-copy vault structure for a new campaign
├── client/                        # React + TS frontend (mock data, not wired yet)
├── server/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── handlers/               # HTTP handlers + router
│   │   ├── service/                 # one file per entity
│   │   ├── repository/              # SQLite access + versioned migrations
│   │   ├── vault/                   # Obsidian vault indexer (walker, mapper, resolver)
│   │   └── models/
│   ├── go.mod
│   └── go.sum
├── AGENTS.md
└── README.md
```

## About

Personal project, built as a deliberate Go-learning exercise no shortcuts, no code-generation of the backend logic. See [`AGENTS.md`](AGENTS.md) for how AI assistance is scoped on this repo.

**Nicolás Correa** — [github.com/ncorrea-13](https://github.com/ncorrea-13)
