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
| Frontend | React + TypeScript + Vite |

Razonamiento completo de cada elección: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Las migraciones de SQLite corren automáticamente al arrancar.

Un solo backend sirve varias campañas — cada fila de `campaigns` guarda su propio `vault_path`, una subcarpeta dentro de un mount compartido (`VAULTS_ROOT`). Ver [`vault-template/`](vault-template/) para una estructura de vault lista para copiar que el indexador reconoce sin tocar código.

## Configuración

Variables de entorno (vía `.env`, ver `.env.example`):

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto del host donde exponer el server (el container escucha en `:8080`) |
| `DB_PATH` | Path de la base de datos dentro del container |
| `VAULTS_ROOT_HOST` | Carpeta en el host que contiene el vault de cada campaña como subcarpeta |

## Docker / Podman

Corré con **Docker** o **Podman** (sin diferencias en los comandos):

```bash
# Copiar el template de variables de entorno
cp .env.example .env

# Build y run
docker-compose up --build

# O con Podman
podman-compose up --build
```

El container incluye:
- SQLite
- Migraciones de esquema automáticas al arrancar
- Volumen de datos persistente (`campaign_data`)

Ajustá `PORT` en `.env` para exponer en otro puerto del host.

## API

CRUD completo sobre las entidades principales, más dashboard, reindex del vault y render de Markdown. Lista completa de endpoints: [`docs/API.md`](docs/API.md).

## Estructura del Proyecto

`server/` (backend Go) y `client/` (frontend React/TS), cada uno con su propio layout `internal`/`src`. Árbol completo y detalle de capas: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Sobre el proyecto

Proyecto personal, pensado como ejercicio deliberado de aprendizaje de Go — sin atajos, sin generación de código de la lógica del backend. Ver [`AGENTS.md`](AGENTS.md) para el alcance de la asistencia de IA en este repo.

**Nicolás Correa** — [github.com/ncorrea-13](https://github.com/ncorrea-13)
