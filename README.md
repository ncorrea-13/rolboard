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

This is a personal project and tool for the DM/GM. Runs on a homelab to learn Go, infrastructure and CI/CD. It is thought to scale to be used as an emulated cloud service. See [`docs/DECISIONS.md`](docs/DECISIONS.md) for the reasoning behind every scope call.

## Stack

| Layer      | Tech                                             |
| ---------- | ------------------------------------------------ |
| Backend    | Go 1.27, `net/http` stdlib (no router framework) |
| Database   | SQLite (`modernc.org/sqlite`, no cgo)            |
| Migrations | Versioned SQL files, embedded with `go:embed`    |
| Frontend   | React + TypeScript + Vite                        |

Full rationale for each choice: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

SQLite migrations run automatically on startup.

One backend instance serves multiple campaigns — each `campaigns` row stores its own `vault_path`, a subfolder under a shared `VAULTS_ROOT` mount. See [`vault-template/`](vault-template/) for a ready-to-copy vault structure the indexer recognizes out of the box.

## Configuration

Environment variables (via `.env`, see `.env.example`):

| Variable            | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `CLIENT_PORT`        | Host port to expose the client on (defaults to `8080`)             |
| `ADMIN_TOKEN`        | Required to create campaigns / list vault dirs (see [`docs/API.md`](docs/API.md)) |
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

Adjust `CLIENT_PORT` in `.env` to expose on a different host port.

## Production deployment

The dev `docker-compose.yml` builds from source and keeps `ADMIN_TOKEN` as a plain env var — fine for local use, not for a token exposed to `docker inspect`/`ps` on a shared or internet-facing host. For production, pull the prebuilt images from GHCR and pass the admin token as a secret instead of an env var.

This deployment currently runs on **Podman**, where a secret can be created and managed outside Swarm (`podman secret create`) and referenced as `external: true`. Docker Compose does **not** support `external: true` secrets without Swarm mode active (`docker swarm init` — `docker secret create` is a Swarm-scoped command) — on plain `docker compose`, use a `file:`-based secret instead (mounts straight from a local file, same result, no daemon-managed store required).

```yaml
# compose.yaml
secrets:
  rolboard_admin_token:
    external: true                     # Podman, no Swarm needed
    # file: ${ADMIN_TOKEN_FILE_HOST}   # Docker without Swarm — use this form instead

services:
  server:
    container_name: rolboard-server
    image: ghcr.io/ncorrea-13/rolboard-server:main
    env_file:
      - .env
    secrets:
      - rolboard_admin_token
    environment:
      DB_PATH: /data/campaign.db
      VAULTS_ROOT: /vaults
      PORT: 8080
      ADMIN_TOKEN_FILE: /run/secrets/rolboard_admin_token
    volumes:
      - ${DATA_PATH}:/data
      - ${VAULTS_ROOT_HOST}:/vaults:ro
    restart: unless-stopped

  client:
    container_name: rolboard-client
    image: ghcr.io/ncorrea-13/rolboard-client:main
    ports:
      - "${CLIENT_PORT:-8080}:80"
    depends_on:
      - server
    restart: unless-stopped
```

```bash
# Podman
podman secret create rolboard_admin_token -
# (paste the token, then Ctrl-D)
podman-compose -f compose.yaml up -d

# Docker, without Swarm — switch the secret to file: first (see commented line above)
mkdir -p secrets && echo -n "your-admin-token" > secrets/admin_token
echo "ADMIN_TOKEN_FILE_HOST=./secrets/admin_token" >> .env
docker compose -f compose.yaml up -d
```

## API

Full CRUD over the core entities, plus dashboard, vault reindex and Markdown note rendering. Full endpoint list: [`docs/API.md`](docs/API.md).

## Project Structure

`server/` (Go backend) and `client/` (React/TS frontend), each with its own `internal`/`src` layout. Full tree and layer breakdown: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## About

Personal project, built as a deliberate Go-learning exercise no shortcuts, no code-generation of the backend logic. See [`AGENTS.md`](AGENTS.md) for how AI assistance is scoped on this repo.

**Nicolás Correa** — [github.com/ncorrea-13](https://github.com/ncorrea-13)
