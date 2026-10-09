# Architecture

[Español](ARCHITECTURE.es.md)

## Overview

```
browser ──HTTP──► client (Caddy :80)
                   ├── /       → static SPA (React + TS + Vite)
                   └── /api/*  → server (Go, :8080)
                                   ├── SQLite      (DB_PATH, read-write)
                                   ├── uploads/    (UPLOADS_ROOT, read-write)
                                   └── vaults/     (VAULTS_ROOT, read-only)
```

SPA and API share an origin (Caddy serves both). Any file the app serves runs with the DM's session — hence the upload rules in `DECISIONS.md`.

## Repository

```
rolboard/
├── server/
│   ├── cmd/server/         Docker entrypoint: env vars, HTTP server, graceful shutdown
│   ├── cmd/desktop/        desktop entrypoint (Wails): webview, desktop endpoints
│   ├── mobile/             Android entrypoint (gomobile): Start, Request, settings, sync
│   └── internal/
│       ├── app/            wiring: DB, migrations, repositories, services, router
│       ├── desktop/        local-mode runtime (desktop and Android): config.json, app lifecycle, sync
│       ├── snapshot/       sync folder: export, import, conflict copy
│       ├── handlers/       HTTP: router, auth middleware, rate limit, payloads
│       ├── service/        business logic, file handling
│       ├── repository/     raw SQL over database/sql + embedded migrations
│       ├── models/         shared structs
│       ├── imagestore/     image validation and storage
│       └── vault/          Obsidian note indexer and renderer
├── client/
│   ├── src/
│   │   ├── screens/        screens
│   │   ├── components/     shared components
│   │   ├── hooks/          useCampaignData (state and API calls)
│   │   ├── lib/            api, mappers, i18n (es/en), images, obsidian://
│   │   ├── data/           domain types
│   │   └── styles/         CSS tokens
│   └── Caddyfile
├── android/                Android project (Gradle, Kotlin MainActivity with a WebView)
├── vault-template/         vault layout the indexer recognizes
└── docs/
```

Backend layers: `handlers → service → repository`. The handler only translates HTTP; the service holds the logic (image validation, reindex); the repository is SQL only.

## Stack

| Layer      | Choice                                     |
| ---------- | ------------------------------------------- |
| Backend    | Go 1.27, `net/http` stdlib                   |
| Database   | SQLite, `modernc.org/sqlite` (no cgo)        |
| Markdown   | `goldmark` + sanitized with `bluemonday`     |
| Frontmatter| `gopkg.in/yaml.v3`                           |
| Auth       | `golang.org/x/crypto/bcrypt` for access codes |
| Frontend   | React 19 + TypeScript + Vite, plain CSS      |
| Web server | Caddy (static files + reverse proxy)         |

## Authentication

- **Admin**: `POST /api/admin/login` with the instance token (`ADMIN_TOKEN_FILE` or `ADMIN_TOKEN`). Issues the `rolboard_admin_session` cookie (24 h, in-memory sessions — lost on restart). Grants access to everything.
- **Campaign**: `POST /api/campaigns/{id}/login` with the access code (bcrypt against `campaigns.access_code_hash`). Issues the `rolboard_session_<id>` cookie (one per campaign, 24 h, token hash in `auth_sessions`). Only grants access to that campaign's resources: each route resolves which campaign the resource belongs to and compares it against the session.
- Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` unless `COOKIE_SECURE=false`. Logins are rate limited.

## Deployment

- CI (`.github/workflows/ci.yml`): build, lint, vet and tests; only on `v*` tags, publishes `rolboard-server` and `rolboard-client` to GHCR as `latest`, the short commit and the version. The client image carries the latest tag it contains (`VITE_APP_VERSION`) for the update notice.
- Production: the compose from the README with GHCR images and the token as a secret.
- Development: `docker-compose.yml` builds from source, runs the client in the server's network namespace (`BACKEND_HOST=localhost`), `campaign_data` volume.
- Caddy's proxy points at `{BACKEND_HOST}:8080`; the backend must listen on `8080`.
- Desktop: `server/cmd/desktop` builds the same router into a Wails app, with no network or Caddy. Details: [`DESKTOP.md`](./DESKTOP.md).
- Android: `server/mobile` is bound with gomobile into an APK whose `WebView` reaches the router in-process. Details: [`ANDROID.md`](./ANDROID.md).
- Release (`.github/workflows/release.yml`): on a `v*` tag, a draft GitHub Release with the `.exe`, the AppImage and the signed APK.

## Obsidian vault

Mounted read-only; the app never writes to it. Synced externally (Syncthing). Indexer details: [`VAULT_INDEXER.md`](./VAULT_INDEXER.md).

## Images

One image per NPC, PC, location and faction. Stored at `UPLOADS_ROOT/<entity>/<id>-portrait.<png|jpg>`; the DB stores the relative path in `image_path`. The client downsizes the image to 1600 px (JPEG) before upload; the server accepts only real PNG/JPEG, max 5 MiB.
