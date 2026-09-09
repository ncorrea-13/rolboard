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
| Frontend | React + TypeScript + Vite (scaffold armado, todavía con datos mockeados — sin conectar a la API) |

Razonamiento completo de cada elección: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Un solo backend sirve varias campañas — cada fila de `campaigns` guarda su propio `vault_path`, una subcarpeta dentro de un mount compartido (`VAULTS_ROOT`). Ver [`vault-template/`](vault-template/) para una estructura de vault lista para copiar que el indexador reconoce sin tocar código.

## Quick Start

```bash
git clone git@github.com:ncorrea-13/rolboard.git
cd rolboard
cp .env.example .env
# completar VAULTS_ROOT_HOST en .env con la carpeta que contiene tus vaults de Obsidian
docker-compose up --build
# → http://localhost:8080/api/health
```

Las migraciones de SQLite corren automáticamente al arrancar.

## Configuración

Variables de entorno (vía `.env`, ver `.env.example`):

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto del host donde exponer el server (el container escucha en `:8080`) |
| `DB_PATH` | Path de la base de datos dentro del container |
| `VAULTS_ROOT_HOST` | Carpeta en el host que contiene el vault de cada campaña como subcarpeta |

## API

CRUD completo (`GET`/`POST`/`PUT`/`DELETE`) para `campaigns`, `arcs`, `locations`, `npcs`, `player-characters`, `quests`, `sessions` y `groups`, más `GET /api/health` y `POST /api/campaigns/{id}/reindex`. El reindex es un upsert real contra el vault de esa campaña — crear, editar, mover o borrar una nota se refleja solo la próxima vez que lo llamás, sin limpieza manual de la base.

Superficie completa, incluyendo lo que falta (vistas de dashboard, render de markdown): [`docs/API.md`](docs/API.md).

## Estructura del Proyecto

```
rolboard/
├── docs/                          # arquitectura, modelo de datos, API, decisiones (estilo ADR)
├── vault-template/                # estructura de vault lista para copiar en campaña nueva
├── client/                        # frontend React + TS (datos mockeados, sin conectar aún)
├── server/                        # backend (Go)
│   ├── cmd/server/main.go         # entrypoint
│   ├── internal/
│   │   ├── handlers/              # HTTP handlers + router
│   │   ├── service/                # un archivo por entidad
│   │   ├── repository/             # acceso a SQLite + migraciones versionadas
│   │   ├── vault/                  # indexador del vault de Obsidian (walker, mapper, resolver)
│   │   └── models/
│   ├── go.mod
│   └── go.sum
├── AGENTS.md                      # acuerdo de trabajo para desarrollo asistido por IA
└── README.md
```

## Sobre el proyecto

Proyecto personal, pensado como ejercicio deliberado de aprendizaje de Go — sin atajos, sin generación de código de la lógica del backend. Ver [`AGENTS.md`](AGENTS.md) para el alcance de la asistencia de IA en este repo.

**Nicolás Correa** — [github.com/ncorrea-13](https://github.com/ncorrea-13)
