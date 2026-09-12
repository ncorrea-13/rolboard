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

- Corre como contenedor (Docker o Podman, ver [`README.md`](../README.md)), sin exposición pública — acceso restringido a red privada (justifica la ausencia de autenticación, ver [`API.md`](./API.md)).
- El **build estático del frontend** (`vite build`) se sirve desde un contenedor Caddy aparte (`client/Dockerfile` + `client/Caddyfile`), que además hace de reverse proxy de `/api/*` hacia `rolboard-server:8080` (ver `docker-compose.yml`).

## Vault de Obsidian

Montado read-only dentro del contenedor. Sincronización, backup y detalle de lectura/procesamiento: [`VAULT_INDEXER.md`](./VAULT_INDEXER.md).

## Por qué NO WebSockets (por ahora)

Uso single-user (herramienta del DM, no algo que ven los jugadores en simultáneo) — no hay estado que sincronizar entre clientes. Razonamiento completo: [`DECISIONS.md`](./DECISIONS.md#alcance-para-el-dm-no-para-los-jugadores).
