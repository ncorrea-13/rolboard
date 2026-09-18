# Arquitectura

[English](ARCHITECTURE.md)

## Visión general

```
navegador ──HTTP──► client (Caddy :80)
                     ├── /       → SPA estática (React + TS + Vite)
                     └── /api/*  → server (Go, :8080)
                                     ├── SQLite      (DB_PATH, read-write)
                                     ├── uploads/    (UPLOADS_ROOT, read-write)
                                     └── vaults/     (VAULTS_ROOT, read-only)
```

SPA y API comparten origen (Caddy sirve ambas). Cualquier archivo que sirva la app corre con la sesión del DM — de ahí las reglas de upload en `DECISIONS.md`.

## Repositorio

```
rolboard/
├── server/
│   ├── cmd/server/         entrypoint: env vars, wiring, graceful shutdown
│   └── internal/
│       ├── handlers/       HTTP: router, auth middleware, rate limit, payloads
│       ├── service/        lógica de negocio, manejo de archivos
│       ├── repository/     SQL crudo sobre database/sql + migraciones embebidas
│       ├── models/         structs compartidos
│       ├── imagestore/     validación y guardado de imágenes
│       └── vault/          indexador y render de notas de Obsidian
├── client/
│   ├── src/
│   │   ├── screens/        pantallas
│   │   ├── components/     componentes compartidos
│   │   ├── hooks/          useCampaignData (estado y llamadas a la API)
│   │   ├── lib/            api, mappers, i18n (es/en), imágenes, obsidian://
│   │   ├── data/           tipos de dominio
│   │   └── styles/         tokens CSS
│   └── Caddyfile
├── vault-template/         estructura de vault que reconoce el indexador
└── docs/
```

Capas del backend: `handlers → service → repository`. El handler solo traduce HTTP; el service tiene la lógica (validación de imágenes, reindex); el repository solo SQL.

## Stack

| Capa          | Elección                                       |
| ------------- | ---------------------------------------------- |
| Backend       | Go 1.27, `net/http` stdlib                     |
| Base de datos | SQLite, `modernc.org/sqlite` (sin cgo)         |
| Markdown      | `goldmark` + sanitizado con `bluemonday`       |
| Frontmatter   | `gopkg.in/yaml.v3`                             |
| Auth          | `golang.org/x/crypto/bcrypt` para códigos      |
| Frontend      | React 19 + TypeScript + Vite, CSS plano        |
| Servidor web  | Caddy (estáticos + reverse proxy)              |

## Autenticación

- **Admin**: `POST /api/admin/login` con el token de instancia (`ADMIN_TOKEN_FILE` o `ADMIN_TOKEN`). Emite cookie `rolboard_admin_session` (24 h, sesiones en memoria — se pierden al reiniciar). Da acceso a todo.
- **Campaña**: `POST /api/campaigns/{id}/login` con el código de acceso (bcrypt en `campaigns.access_code_hash`). Emite cookie `rolboard_session` (24 h, hash del token en `auth_sessions`). Solo da acceso a recursos de esa campaña: cada ruta resuelve a qué campaña pertenece el recurso y lo compara con la sesión.
- Cookies `HttpOnly`, `SameSite=Lax`, `Secure` salvo `COOKIE_SECURE=false`. Logins con rate limit.

## Despliegue

- CI (`.github/workflows/ci.yml`): build, lint, vet y tests; en push publica `rolboard-server` y `rolboard-client` en GHCR con tag de rama y de commit.
- Producción: compose del README con imágenes de GHCR y el token como secret.
- Desarrollo: `docker-compose.yml` buildea desde código, cliente en el namespace de red del servidor (`BACKEND_HOST=localhost`), volumen `campaign_data`.
- El proxy de Caddy apunta a `{BACKEND_HOST}:8080`; el backend tiene que escuchar en `8080`.

## Vault de Obsidian

Montado read-only; la app nunca lo escribe. Se sincroniza por fuera (Syncthing). Detalle del indexador: [`VAULT_INDEXER.md`](./VAULT_INDEXER.md).

## Imágenes

Una imagen por NPC, PJ, locación y facción. Se guardan en `UPLOADS_ROOT/<entidad>/<id>-portrait.<png|jpg>`; la DB guarda la ruta relativa en `image_path`. El cliente reduce la imagen a 1600 px (JPEG) antes de subirla; el servidor acepta solo PNG/JPEG reales, máx. 5 MiB.
