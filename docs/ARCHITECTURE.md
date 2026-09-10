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

- Corre como **contenedor Podman rootless** con **Quadlet (systemd)**, mismo patrón que el resto de los servicios de aplicación del homelab.
- **Nodo: ThinkCentre** — no la Raspberry Pi. La Pi cumple rol de gateway (Pi-hole, Unbound, Caddy, cloudflared) y no debe cargarse con servicios de aplicación; el ThinkCentre es donde viven Vaultwarden, Miniflux, Immich, homelab-status-api, etc.
- **Acceso**: solo por Tailscale (tailnet), sin exposición pública.
- El **build estático del frontend** (`vite build`) se sirve desde el mismo binario Go o desde un contenedor Caddy aparte — a definir en la fase de despliegue, no bloqueante para el desarrollo.

## Vault de Obsidian

Montado read-only dentro del contenedor. Sincronización, backup y detalle de lectura/procesamiento: [`VAULT_INDEXER.md`](./VAULT_INDEXER.md).

## Por qué NO WebSockets (por ahora)

Uso single-user (herramienta del DM, no algo que ven los jugadores en simultáneo) — no hay estado que sincronizar entre clientes. Razonamiento completo: [`DECISIONS.md`](./DECISIONS.md#alcance-para-el-dm-no-para-los-jugadores).
