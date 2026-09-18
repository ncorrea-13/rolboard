<div align="center">

# Rolboard

**Dashboard personal para gestión de campañas de rol de mesa (TTRPG)**

[![Go](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![SQLite](https://img.shields.io/badge/SQLite-modernc.org%2Fsqlite-003B57?logo=sqlite&logoColor=white)](https://modernc.org/sqlite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#licencia)

[English](README.md)

</div>

---

App web para la gestión y manejo de campañas de rol de mesa. Incluye el manejo de sesiones, jugadores, NPCs, arcos, locaciones, grupos, quests y un tracker de combate pensado para Cosmere RPG y DND 5e. Se mantiene agnóstico sin definir un solo sistema.

Este proyecto surgió como un traspaso de utilizar Obsidian pero para una gestión más rápida con lo que incluye un indexador del frontmatter para poder traer esta información y poder convivir con la vault. Mantiene la estructura del vault y permite la navegación para allá. Cada campaña guarda su `vault_path`, una subcarpeta dentro de `VAULTS_ROOT`. [`vault-template/`](vault-template/) tiene una estructura de vault que el indexador reconoce sin tocar código.

## Stack

| Capa          | Tecnología                                   |
| ------------- | -------------------------------------------- |
| Servidor      | Go 1.27, `net/http` stdlib ()                |
| Base de datos | SQLite (`modernc.org/sqlite`)                |
| Cliente       | React + TypeScript + Vite, servido por Caddy |

Más: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Inicio rápido

Imágenes ya armadas en GHCR. Funciona con Docker y Podman.

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
VAULTS_ROOT_HOST=/ruta/a/los/vaults
```

La imagen del server corre como UID 1000 — `mkdir -p ./data` y `podman unshare chown -R 1000:1000 ./data` (Docker: `chown` común en vez de `podman unshare chown`) antes del primer arranque.

Crear el secret del token de admin y levantar:

```bash
# Podman
printf '%s' 'tu-admin-token' | podman secret create rolboard_admin_token -
podman compose up -d

# Docker (los secrets externos requieren modo Swarm)
docker swarm init
printf '%s' 'tu-admin-token' | docker secret create rolboard_admin_token -
docker compose up -d
```

En Docker sin Swarm, reemplazá `external: true` por `file: ./secrets/admin_token` y poné el token en ese archivo.

`logging: journald` requiere un host con systemd; si no, sacá esos bloques.

Abrí `http://localhost:${CLIENT_PORT}`, entrá como admin con el token, creá una campaña y asignale su código de acceso.

## Configuración

| Variable              | Dónde    | Descripción                                                                                                                             |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `CLIENT_PORT`         | host     | Puerto del host para el cliente web                                                                                                     |
| `DATA_PATH`           | host     | Carpeta del host para la base y las imágenes subidas                                                                                    |
| `VAULTS_ROOT_HOST`    | host     | Carpeta del host con el vault de cada campaña como subcarpeta (montada read-only)                                                       |
| `DB_PATH`             | servidor | Ruta del archivo SQLite                                                                                                                 |
| `VAULTS_ROOT`         | servidor | Ruta del mount de vaults                                                                                                                |
| `UPLOADS_ROOT`        | servidor | Ruta de imágenes. Sin default — ponela dentro del volumen de datos                                                                      |
| `PORT`                | servidor | Puerto de escucha (el cliente proxea a `8080`)                                                                                          |
| `ADMIN_TOKEN_FILE`    | servidor | Archivo con el token de admin (secret). Tiene prioridad sobre `ADMIN_TOKEN`                                                             |
| `ADMIN_TOKEN`         | servidor | Token de admin como env var plana (solo dev)                                                                                            |
| `COOKIE_SECURE`       | servidor | `false` solo para HTTP local. Default: cookies seguras                                                                                  |
| `LOG_JSON`            | servidor | Logs estructurados JSON (`log/slog`). Default: texto legible                                                                            |
| `TRUST_PROXY_HEADERS` | servidor | Confía en `CF-Connecting-IP` para el rate limit. Solo si todo el tráfico pasa por Cloudflare — si no, es falsificable. Default: `false` |
| `BACKEND_HOST`        | cliente  | Host del backend para el proxy de `/api`. Default: `localhost`                                                                          |

## Desarrollo

`docker-compose.yml` buildea ambas imágenes desde el código, corre el cliente en el namespace de red del servidor y usa `ADMIN_TOKEN` del `.env`:

```bash
cp .env.example .env
docker compose up --build   # o: podman compose up --build
```

## API

REST + JSON bajo `/api`. Lista completa: [`docs/API.md`](docs/API.md).

## Estructura del Proyecto

`server/` (Go) y `client/` (React/TS). Layout: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Razonamiento detrás de cada decisión de alcance: [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Sobre el proyecto

Proyecto personal, pensado como ejercicio deliberado de aprendizaje de Go. [`AGENTS.md`](AGENTS.md) describe el alcance de la asistencia de IA en este repo.

## Licencia

MIT - [LICENSE](LICENSE) para más información.

**Nicolás Correa** — [github.com/ncorrea-13](https://github.com/ncorrea-13)
