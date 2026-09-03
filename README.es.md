<div align="center">

# Rolboard

**Dashboard personal para gestión de campañas de rol de mesa (TTRPG)**

[![Go](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![SQLite](https://img.shields.io/badge/SQLite-modernc.org%2Fsqlite-003B57?logo=sqlite&logoColor=white)](https://modernc.org/sqlite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#licencia)

[English](README.md)

</div>

---

Vista estructurada y consultable del estado de una campaña de rol de mesa — NPCs, ubicaciones, quests, sesiones — pensada para convivir con un vault de Obsidian, no reemplazarlo. El vault sigue siendo la fuente de verdad para prosa y lore; este dashboard indexa su frontmatter YAML para dar una búsqueda rápida durante una sesión en vivo ("¿qué le prometí a este NPC?", "¿quién está en esta ciudad ahora?", "¿qué quests están activas?").

Herramienta de uso exclusivo para el DM/GM, no algo que ven los jugadores. Corre en un nodo del homelab, accesible solo por Tailscale — sin exposición pública. Ver [`docs/DECISIONS.md`](docs/DECISIONS.md) para el razonamiento detrás de cada decisión de alcance.

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | Go 1.27, `net/http` stdlib (sin router de terceros) |
| Base de datos | SQLite (`modernc.org/sqlite`, sin cgo) |
| Migraciones | Archivos SQL versionados, embebidos con `go:embed` |
| Frontend | React + TypeScript + Vite — todavía no iniciado |

Razonamiento completo de cada elección: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick Start

Por ahora solo existe el backend — sin setup de contenedor todavía.

```bash
git clone git@github.com:ncorrea-13/rolboard.git
cd rolboard/server
go mod download
go run ./cmd/server
# → http://localhost:8080/api/health
```

Las migraciones de SQLite corren automáticamente al arrancar. El archivo de base de datos queda en `server/data/campaign.db` (gitignored).

## Configuración

Todavía no hay variables de entorno — el path de la base (`./data/campaign.db`) y el puerto (`:8080`) están hardcodeados en [`cmd/server/main.go`](server/cmd/server/main.go).

## API

Implementado hasta ahora:

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/campaigns` | Listado de campañas |

Superficie completa planeada (Arcs, NPCs, Locations, Groups, Player Characters, Quests, Sessions, indexado del vault): [`docs/API.md`](docs/API.md).

## Estructura del Proyecto

```
rolboard/
├── docs/                          # arquitectura, modelo de datos, API, decisiones (estilo ADR)
├── server/                        # backend (Go)
│   ├── cmd/server/main.go         # entrypoint
│   ├── internal/
│   │   ├── handlers/              # HTTP handlers + router
│   │   │   ├── campaigns.go
│   │   │   ├── health.go
│   │   │   └── router.go
│   │   ├── service/campaign.go
│   │   ├── repository/            # acceso a SQLite + migraciones
│   │   │   ├── campaign.go
│   │   │   ├── db.go
│   │   │   └── migrations/0001_initial_schema.sql
│   │   └── models/campaign.go
│   ├── go.mod
│   └── go.sum
├── AGENTS.md                      # acuerdo de trabajo para desarrollo asistido por IA
└── README.md
```

## Sobre el proyecto

Proyecto personal, pensado como ejercicio deliberado de aprendizaje de Go — sin atajos, sin generación de código de la lógica del backend. Ver [`AGENTS.md`](AGENTS.md) para el alcance de la asistencia de IA en este repo.

**Nicolás Correa** — [github.com/ncorrea-13](https://github.com/ncorrea-13)
