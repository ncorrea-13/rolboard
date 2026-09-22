<div align="center">

# Rolboard

**Personal dashboard for tabletop RPG campaign management**

[![CI](https://github.com/ncorrea-13/rolboard/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ncorrea-13/rolboard/actions/workflows/ci.yml)
[![Go](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Caddy](https://img.shields.io/badge/Caddy-2-1F88C0?logo=caddy&logoColor=white)](https://caddyserver.com)
[![SQLite](https://img.shields.io/badge/SQLite-modernc.org%2Fsqlite-003B57?logo=sqlite&logoColor=white)](https://modernc.org/sqlite)
[![Docker](https://img.shields.io/badge/Docker-GHCR-2496ED?logo=docker&logoColor=white)](https://github.com/ncorrea-13?tab=packages&repo_name=rolboard)
[![Dependabot](https://img.shields.io/badge/Dependabot-enabled-025E8C?logo=dependabot&logoColor=white)](.github/dependabot.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

[Español](README.es.md)

</div>

---

Web app for managing tabletop RPG campaigns. Covers sessions, players, NPCs, arcs, locations, groups, quests and a combat tracker built for Cosmere RPG and D&D 5e. Stays system-agnostic, no single ruleset baked in.

Started as a move away from Obsidian, for faster management, while still including a frontmatter indexer to pull that data in and coexist with the vault. Keeps the vault structure and lets you navigate back to it. Each campaign stores its own `vault_path`, a subfolder under `VAULTS_ROOT`. [`vault-template/`](vault-template/) has a vault layout the indexer recognizes out of the box.

## Stack

| Layer    | Tech                                       |
| -------- | ------------------------------------------ |
| Server   | Go 1.27, `net/http` stdlib                 |
| Database | SQLite (`modernc.org/sqlite`)              |
| Client   | React + TypeScript + Vite, served by Caddy |

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
    image: ghcr.io/ncorrea-13/rolboard-server:latest
    user: "${ROLBOARD_USER:-1000:1000}"
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
    image: ghcr.io/ncorrea-13/rolboard-client:latest
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
# ROLBOARD_USER=0   # rootless Podman only, see "Vault permissions"
```

The server image runs as UID 1000 — `mkdir -p ./data` and `podman unshare chown -R 1000:1000 ./data` (Docker: plain `chown` instead of `podman unshare chown`) before the first start.

### Vault permissions

The server must be able to read the vault, or rendering notes and reindexing fail with `permission denied`.

- **Docker (rootful):** the container's UID 1000 is the host's UID 1000, so the vault must be readable by that user.
- **Rootless Podman:** container UID 1000 maps to a sub-UID of your user, not to you, so a `770` vault is unreadable. Set `ROLBOARD_USER=0` in `.env`: root inside a rootless container is your own unprivileged user, not host root, and the vault is mounted read-only.

Don't set `ROLBOARD_USER=0` on rootful Docker: there it is real root.

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

| Variable              | Where  | Description                                                                                                                         |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `CLIENT_PORT`         | host   | Host port for the web client                                                                                                        |
| `DATA_PATH`           | host   | Host folder for the database and uploaded images                                                                                    |
| `VAULTS_ROOT_HOST`    | host   | Host folder holding every campaign's vault as a subfolder (mounted read-only)                                                       |
| `ROLBOARD_USER`       | host   | Container user (`uid:gid`). Default `1000:1000`. Rootless Podman: `0` (see [Vault permissions](#vault-permissions))                 |
| `DB_PATH`             | server | SQLite file path                                                                                                                    |
| `VAULTS_ROOT`         | server | Vaults mount path                                                                                                                   |
| `UPLOADS_ROOT`        | server | Image storage path. No default — set it inside the data volume                                                                      |
| `PORT`                | server | Listen port (the client proxies to `8080`)                                                                                          |
| `ADMIN_TOKEN_FILE`    | server | File with the admin token (secret). Takes precedence over `ADMIN_TOKEN`                                                             |
| `ADMIN_TOKEN`         | server | Admin token as plain env var (dev only)                                                                                             |
| `COOKIE_SECURE`       | server | Set `false` only for local HTTP. Default: secure cookies                                                                            |
| `LOG_JSON`            | server | Structured JSON logs (`log/slog`). Default: human-readable text                                                                     |
| `TRUST_PROXY_HEADERS` | server | Trust `CF-Connecting-IP` for rate limiting. Only if every request passes through Cloudflare — otherwise spoofable. Default: `false` |
| `BACKEND_HOST`        | client | Backend hostname for the `/api` proxy. Default: `localhost`                                                                         |

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
Reasoning behind each scope call: [`docs/DECISIONS.md`](docs/DECISIONS.md).

## About

Personal project, built as a deliberate Go-learning exercise. [`AGENTS.md`](AGENTS.md) describes how AI assistance is scoped on this repo.

## License

MIT - see [LICENSE](LICENSE) for details.

**Nicolás Correa** — [github.com/ncorrea-13](https://github.com/ncorrea-13)
