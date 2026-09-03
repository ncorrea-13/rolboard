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

| Capa             | Elección                               | Por qué                                                                                                                                                                                                            |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend          | Go, `net/http` stdlib (sin framework)  | Consistente con la migración del homelab-status-api; ejercicio de aprendizaje de Go "sin atajos"; Go 1.22+ ya soporta path params nativos en `ServeMux`, que era el argumento fuerte a favor de routers como `chi` |
| Base de datos    | SQLite (`modernc.org/sqlite`, sin cgo) | Single-user, dataset chico, sin necesidad de servidor de base de datos separado; mismo driver que el status-api                                                                                                    |
| Frontend         | React + TypeScript + Vite              | Interactividad rica (mapa, grafo) que templates server-rendered no cubren bien; SPA separada del backend; el usuario ya está habituado a React                                                                     |
| Frontend bundler | Vite (no Next.js)                      | La app es una SPA privada sin necesidad de SSR/SEO — Next añadiría complejidad sin beneficio para este caso                                                                                                        |
| Comunicación     | REST + JSON                            | Simple, no hay necesidad de tiempo real (single-user, sin necesidad de sync entre clientes)                                                                                                                        |

## Despliegue

- Corre como **contenedor Podman rootless** con **Quadlet (systemd)**, mismo patrón que el resto de los servicios de aplicación del homelab.
- **Nodo: ThinkCentre** — no la Raspberry Pi. La Pi cumple rol de gateway (Pi-hole, Unbound, Caddy, cloudflared) y no debe cargarse con servicios de aplicación; el ThinkCentre es donde viven Vaultwarden, Miniflux, Immich, homelab-status-api, etc.
- **Acceso**: solo por Tailscale (tailnet), sin exposición pública.
- El **build estático del frontend** (`vite build`) se sirve desde el mismo binario Go o desde un contenedor Caddy aparte — a definir en la fase de despliegue, no bloqueante para el desarrollo.

## Vault de Obsidian

- Vive en una carpeta sincronizada por **Syncthing** entre varios dispositivos, incluido (o incluible) el ThinkCentre.
- El backend **monta esa carpeta como volumen read-only** dentro del contenedor — nunca escribe sobre el vault.
- **Codeberg** (repo privado) es el backup/versionado del vault, gestionado de forma independiente — el dashboard no depende de Codeberg para funcionar, solo lee del filesystem local sincronizado.
- Ver [`VAULT_INDEXER.md`](./VAULT_INDEXER.md) para el detalle de cómo se lee y procesa el contenido.

## Por qué NO WebSockets (por ahora)

Se evaluó como parte del diseño inicial (para un eventual tracker de combate en vivo), pero al confirmarse que el uso es **single-user** —el dashboard es una herramienta del DM/GM, no algo que ven los jugadores en simultáneo— no hay necesidad de sincronizar estado entre múltiples clientes conectados. REST simple alcanza. Si en el futuro se suma un caso de uso multi-cliente en tiempo real, se reevalúa.
