# Arquitectura

## Visión general

```
┌──────────────────────────┐         ┌───────────────────────────┐
│   client/ (SPA)            │  HTTP   │   server/ (Go)              │
│   React + TypeScript + Vite │◄──────►│   net/http (stdlib)         │
└──────────────────────────┘  JSON   └───────────────────────────┘
                                              │            │
                                              ▼            ▼
                                     ┌────────────┐  ┌───────────────┐
                                     │  SQLite      │  │  Vault Obsidian │
                                     │  campaign.db │  │  (montado RO)   │
                                     └────────────┘  └───────────────┘
```

## Monorepo

```
campaign-dashboard/
├── server/          -- backend Go
│   ├── cmd/server/  -- entrypoint (main.go)
│   ├── internal/
│   │   ├── handlers/    -- HTTP handlers (API REST)
│   │   ├── service/     -- lógica de negocio
│   │   ├── repository/  -- acceso a SQLite
│   │   ├── models/      -- structs compartidos
│   │   └── vault/       -- indexador del vault de Obsidian
│   ├── data/         -- archivo SQLite (gitignored)
│   ├── go.mod
│   └── go.sum
├── client/          -- frontend React/TS
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── docs/            -- esta documentación
```

No hay tooling de monorepo (Turborepo/Nx) — el proyecto es lo bastante chico como para no justificarlo. Dos carpetas independientes alcanzan.

## Stack

| Capa             | Elección                               |
| ---------------- | --------------------------------------- |
| Backend          | Go, `net/http` stdlib (sin framework)  |
| Base de datos    | SQLite (`modernc.org/sqlite`, sin cgo) |
| Frontend         | React + TypeScript + Vite              |
| Comunicación     | REST + JSON                            |

Razonamiento de cada elección: [`DECISIONS.md`](./DECISIONS.md).

## Despliegue

- Corre como contenedor (Docker o Podman). Dos compose distintos: `docker-compose.yml` en el repo builda desde código fuente para dev (`ADMIN_TOKEN` como env var plana alcanza); el compose de producción (documentado en [`README.md`](../README.md), no versionado como archivo) usa las imágenes de GHCR y pasa el admin token como secret. En Podman, secret nativo sin Swarm (`podman secret create` + `external: true`); en Docker plano sin Swarm, `external: true` no funciona (es scoped a Swarm) — ahí el secret va como `file:` en su lugar, mismo resultado sin store manejado por el daemon.
- Cada campaña tiene su propio código de acceso; rutas de gestión de instancia (crear campaña, listar vault dirs) se protegen aparte con `X-Admin-Token` (ver [`API.md`](./API.md)).
- El **build estático del frontend** (`vite build`) se sirve desde un contenedor Caddy aparte (`client/Dockerfile` + `client/Caddyfile`), que además hace de reverse proxy de `/api/*` hacia `rolboard-server:8080` — puerto interno fijo, desacoplado del `CLIENT_PORT` que expone el host.

## Vault de Obsidian

Montado read-only dentro del contenedor. Sincronización, backup y detalle de lectura/procesamiento: [`VAULT_INDEXER.md`](./VAULT_INDEXER.md).

## Por qué NO WebSockets (por ahora)

Uso single-user (herramienta del DM, no algo que ven los jugadores en simultáneo) — no hay estado que sincronizar entre clientes. Razonamiento completo: [`DECISIONS.md`](./DECISIONS.md#alcance-para-el-dm-no-para-los-jugadores).
