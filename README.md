<div align="center">

# Rolboard

**Personal dashboard for tabletop RPG campaign management**

[![Go](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![SQLite](https://img.shields.io/badge/SQLite-modernc.org%2Fsqlite-003B57?logo=sqlite&logoColor=white)](https://modernc.org/sqlite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

[Español](README.es.md)

</div>

---

Structured view of a tabletop RPG campaign — NPCs, locations, factions, player characters, quests, sessions, arcs and a combat tracker. It sits next to an Obsidian vault instead of replacing it: the vault keeps the long-form prose, Rolboard indexes its YAML frontmatter for quick lookup during a live session, and holds dashboard-only data (quests, prep notes, character sheets, images).

Personal tool for the DM/GM, not something players use. Runs on a homelab. Each campaign has its own access code; instance management (creating campaigns, setting access codes) needs the admin token. Reasoning behind scope calls: [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Stack

| Layer      | Tech                                             |
| ---------- | ------------------------------------------------ |
| Backend    | Go 1.27, `net/http` stdlib (no router framework) |
| Database   | SQLite (`modernc.org/sqlite`, no cgo)            |
| Migrations | Versioned SQL files, embedded with `go:embed`    |
| Frontend   | React + TypeScript + Vite, served by Caddy       |

Migrations run automatically on startup. One backend serves many campaigns — each campaign stores its own `vault_path`, a subfolder under `VAULTS_ROOT`. [`vault-template/`](vault-template/) has a vault layout the indexer recognizes out of the box.

More: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick start

Prebuilt images from GHCR. Works with Docker and Podman.

`compose.yaml`:

```yaml
secrets:
  rolboard_admin_token:
    external: true

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
      UPLOADS_ROOT: /data/uploads
      PORT: 8080
      ADMIN_TOKEN_FILE: /run/secrets/rolboard_admin_token
    volumes:
      - ${DATA_PATH}:/data
      - ${VAULTS_ROOT_HOST}:/vaults:ro
    logging:
      driver: journald
      options:
        tag: "rolboard-server"
    restart: unless-stopped

  client:
    container_name: rolboard-client
    image: ghcr.io/ncorrea-13/rolboard-client:main
    environment:
      BACKEND_HOST: rolboard-server
    ports:
      - "${CLIENT_PORT}:80"
    depends_on:
      - server
    logging:
      driver: journald
      options:
        tag: "rolboard-client"
    restart: unless-stopped
```

`.env`:

```bash
CLIENT_PORT=8080
DATA_PATH=./data
VAULTS_ROOT_HOST=/path/to/vaults
```

The server image runs as UID 1000 — `mkdir -p ./data` and `podman unshare chown -R 1000:1000 ./data` (Docker: plain `chown` instead of `podman unshare chown`) before the first start.

Create the admin token secret and start:

```bash
# Podman
printf '%s' 'your-admin-token' | podman secret create rolboard_admin_token -
podman compose up -d

# Docker (external secrets need Swarm mode)
docker swarm init
printf '%s' 'your-admin-token' | docker secret create rolboard_admin_token -
docker compose up -d
```

On Docker without Swarm, replace `external: true` with `file: ./secrets/admin_token` and put the token in that file.

`logging: journald` needs a systemd host; drop those blocks otherwise.

Open `http://localhost:${CLIENT_PORT}`, log in as admin with the token, create a campaign and set its access code.

## Configuration

| Variable           | Where  | Description |
| ------------------ | ------ | ----------- |
| `CLIENT_PORT`      | host   | Host port for the web client |
| `DATA_PATH`        | host   | Host folder for the database and uploaded images |
| `VAULTS_ROOT_HOST` | host   | Host folder holding every campaign's vault as a subfolder (mounted read-only) |
| `DB_PATH`          | server | SQLite file path |
| `VAULTS_ROOT`      | server | Vaults mount path |
| `UPLOADS_ROOT`     | server | Image storage path. No default — set it inside the data volume |
| `PORT`             | server | Listen port (the client proxies to `8080`) |
| `ADMIN_TOKEN_FILE` | server | File with the admin token (secret). Takes precedence over `ADMIN_TOKEN` |
| `ADMIN_TOKEN`      | server | Admin token as plain env var (dev only) |
| `COOKIE_SECURE`    | server | Set `false` only for local HTTP. Default: secure cookies |
| `TRUST_PROXY_HEADERS` | server | Trust `CF-Connecting-IP` for rate limiting. Only if every request passes through Cloudflare — otherwise spoofable. Default: `false` |
| `BACKEND_HOST`     | client | Backend hostname for the `/api` proxy. Default: `localhost` |

## Development

`docker-compose.yml` builds both images from source, runs the client in the server's network namespace and uses `ADMIN_TOKEN` from `.env`:

```bash
cp .env.example .env
docker compose up --build   # or: podman compose up --build
```

## API

REST + JSON under `/api`. Full list: [`docs/API.md`](docs/API.md).

## Project Structure

`server/` (Go) and `client/` (React/TS). Layout: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## About

Personal project, built as a deliberate Go-learning exercise. [`AGENTS.md`](AGENTS.md) describes how AI assistance is scoped on this repo.

**Nicolás Correa** — [github.com/ncorrea-13](https://github.com/ncorrea-13)
