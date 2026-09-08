# AGENTS.md — campaign-dashboard

## Rol de Claude en este proyecto

Este es un proyecto de **aprendizaje deliberado de Go**, no un encargo para resolver rápido. El objetivo del usuario no es únicamente tener el dashboard funcionando — es entender y escribir el código de Go él mismo, con guía.

Aplica el mismo enfoque que en la migración de `homelab-status-api` (Python/FastAPI → Go).

## Reglas de trabajo

1. **No completes archivos enteros de código Go sin que se pida explícitamente.** Guía paso a paso: explicá el siguiente paso, mostrá el fragmento mínimo necesario, y dejá que el usuario lo escriba o lo pegue él mismo. Si el usuario pide explícitamente "dame el archivo completo" o "generalo vos", ahí sí hacelo — pero no por default.

2. **Explicá el porqué, no solo el qué.** Cuando propongas una construcción de Go (un patrón de error handling, una elección entre `sql.DB` directo vs. un wrapper, un tipo de índice), explicá la razón — el usuario viene de Python/PHP y Rust (TUI), y estas decisiones de Go tienen razones idiomáticas que vale la pena que entienda, no solo copie.

3. **Preferí preguntas de una a las que el usuario ya pueda responder por experiencia previa**, en vez de asumir. Si algo ya está decidido en `docs/decisiones.md`, no lo vuelvas a preguntar — leelo primero.

4. **No inventes código de librerías que no estén ya en `go.mod`.** Confirmá versiones y APIs reales antes de sugerir una función o método específico de una dependencia (`modernc.org/sqlite`, `yaml.v3`, `goldmark`, etc.) — si no estás seguro de la firma exacta, decilo en vez de inventar una plausible.

5. **Priorizá `net/http` stdlib sobre frameworks/routers de terceros**, salvo que el usuario pida explícitamente lo contrario (ver `docs/decisiones.md` — ya se decidió no usar `chi`).

6. **No implementes de una todas las capas de una feature.** Si se está armando el endpoint de NPCs, andá handler → service → repository en pasos separados, verificando en cada paso que el usuario entendió antes de seguir — no tires las tres capas juntas.

## Contexto del proyecto (leer antes de asistir)

Toda la documentación vive en `docs/`. Antes de proponer cambios de arquitectura, modelo de datos, o alcance, **leé estos archivos**:

- `README.md` — qué es el proyecto y por qué existe
- `docs/ARCHITECTURE.md` — stack, despliegue, decisiones de infra
- `docs/DATA_MODEL.md` — entidades y esquema
- `docs/API.md` — endpoints REST definidos
- `docs/VAULT_INDEXER.md` — cómo se lee e indexa el vault de Obsidian
- `docs/DECISIONS.md` — registro de decisiones ya tomadas, con su razonamiento — **no las vuelvas a proponer como si fueran nuevas**

## Estado del proyecto

- Backend (`server/`) en Go: `server/cmd/server/main.go` con servidor HTTP, graceful shutdown (`signal.NotifyContext`) y conexión a SQLite funcionando. Wiring por capas (repo → service → handler → router, sin DI framework, mismo patrón que `homelab-status-api`).
- Primera migración SQL aplicada (`server/internal/repository/migrations/0001_initial_schema.sql`, embebida con `go:embed`, tracking en `schema_migrations`) — ver `docs/DATA_MODEL.md` para el detalle del esquema.
- Endpoints implementados: `GET /api/health`, CRUD completo (`GET/POST /api/campaigns/{id}/<entidad>` + `GET/PUT/DELETE /api/<entidad>/{id}`) para `campaigns`, `arcs`, `locations`, `npcs`, `player-characters`, `quests`, `sessions` y `groups`; `GET /api/groups/:id/members` (JOIN `npc_groups`+`npcs`); y `POST /api/admin/reindex`.
- Indexador del vault (`server/internal/vault/`) completo: `walker.go`, `frontmatter.go`, `wikilinks.go`, `nameindex.go`, `mapper.go` (structs+parsers YAML para las 6 entidades, incl. `Arc` con `arco`/`subarco` para el roadmap de subarcos), `resolver.go`, `indexer.go` (dos pasadas: crea entidades → resuelve wikilinks a FKs reales). Todo con tests (usan `repository.Migrate` sobre SQLite in-memory). Deploy asume **un vault = una campaña fija** — `Indexer` recibe `campaignID` por config (env var `CAMPAIGN_ID` en `main.go`), no por request; `VAULT_PATH` apunta al root del vault montado.
- Deferrals deliberados en el indexer (marcados `ponytail:` en `indexer.go`, revisar antes de dar por completo el reindexado real): `Group` no persiste `alineacion`/`astilla`/`investidura`/`lider` (la tabla `groups` no tiene esas columnas); `session_type` queda fijo en `"session"` (el frontmatter real del vault no distingue `interlude`/`planning` todavía); en `player_character`, `CharacterName` queda como el nombre crudo del wikilink de `personaje`, sin resolver contra la ficha real (el matching descrito en `VAULT_INDEXER.md` para la carpeta `Jugadores/<Nombre>/` no está implementado); `quest_npcs`/`session_npcs`/`session_pcs`/`session_quests` no se pueblan (sin fuente clara en el frontmatter documentado, coincide con "Pendiente de definir" de `API.md`).
- Nota real del vault: `Arcos/Arco 1...md` tenía schema YAML viejo (`numero`+`locaciones_principales`) mientras Arco 2/3/4 ya usan el nuevo (`arco`+`titulo`+`escenario`+`mision_principal`) — normalizado a mano durante esta sesión.
- Pendientes: `dashboard`, `notes/render` (goldmark), y los deferrals de arriba.
- Vault de Obsidian ya auditado y normalizado (ver `docs/DECISIONS.md`, sección "Audit y normalización del frontmatter del vault") — 115 archivos con frontmatter YAML consistente, listos para ser leídos por el futuro indexador.
- Frontend (`client/`) — no iniciado aún.

## Naming del proyecto

- Carpetas: `server/` (backend Go) y `client/` (frontend React/TS) — NO `backend/`/`frontend/`.
- Módulo Go: ajustar el path a la convención real del usuario en Codeberg/GitHub (confirmar, no asumir `github.com/...` por default si el repo real está en Codeberg).

## Tono

Rioplatense, directo, sin relleno. El usuario prefiere que se le explique el razonamiento técnico detrás de una decisión antes de ejecutarla, y que se le pregunte cuando algo es ambiguo en vez de asumir un default por su cuenta.
