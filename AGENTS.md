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
- Deferrals deliberados en el indexer (marcados `ponytail:` en `indexer.go`, revisar antes de dar por completo el reindexado real): `Group` no persiste `alineacion`/`astilla`/`investidura`/`lider` (la tabla `groups` no tiene esas columnas); `session_type` queda fijo en `"session"` (el frontmatter real del vault no distingue `interlude`/`planning` todavía, y las notas de interludio (`Sesión N.1 - Interludio...md`) hoy chocan contra `UNIQUE(campaign_id, session_number, sub_number)` porque no setean `sub_number` — falla real, no bloqueante, pendiente); `quest_npcs`/`session_quests` no se pueblan y **se van a manejar solo por API/form del dashboard, nunca desde el vault** — decisión explícita del usuario: Quests no tiene nota propia en Obsidian (confirmado: no existe carpeta `Quests/` ni ninguna nota `tipo: quest` en el vault real), por eso `quests` tampoco tiene columna `obsidian_path` en el schema.
- Resuelto: `player_character.CharacterName` ya no depende del campo `personaje` (no existe en ninguna nota real de `Jugadores/`, confirmado contra las 5 fichas actuales) — ahora es directamente el nombre del archivo, igual que como se linkea desde la prosa de las sesiones (`[[Yashin]]`). `session_npcs`/`session_pcs` ya se pueblan: NPCs y PJs se mencionan como wikilinks sueltos en el **cuerpo** de la nota de sesión (no en un campo de frontmatter, confirmado contra Ses. 12-14), así que `resolveSessions`/`linkSessionEntities` en `indexer.go` escanean `ExtractWikilinks` sobre el body completo y filtran por `Type` (`npc`/`player_character`) contra el `NameIndex` — cualquier otro wikilink (locations, facciones, arcos, otras sesiones) se ignora a propósito, no se reporta como roto. Cubierto por `TestReindexPopulatesSessionNpcsAndPcs` en `indexer_test.go`.
- Nota real del vault: `Arcos/Arco 1...md` tenía schema YAML viejo (`numero`+`locaciones_principales`) mientras Arco 2/3/4 ya usan el nuevo (`arco`+`titulo`+`escenario`+`mision_principal`) — normalizado a mano durante esta sesión.
- Pendientes: `dashboard`, `notes/render` (goldmark), y los deferrals de arriba.
- Vault de Obsidian ya auditado y normalizado (ver `docs/DECISIONS.md`, sección "Audit y normalización del frontmatter del vault") — 115 archivos con frontmatter YAML consistente, listos para ser leídos por el futuro indexador.
- Frontend (`client/`) — scaffold Vite + React + TS (`pnpm create vite@latest client --template react-ts`), mockeado con datos estáticos (`src/data/mock.ts`), sin consumir la API todavía. Paleta "Obsidiana" y tipografía EB Garamond/Alegreya Sans/IBM Plex Mono en `src/styles/tokens.css` — ver `docs/DECISIONS.md`. Color de tipo de entidad (cristal) se aplica **solo** vía tile teñido + subrayado del nombre (`EntityIdentity`, combinación 4a+4d) o subrayado de título (`.title-underline` en `src/styles/base.css`) — el filete vertical izquierdo (`inset Npx 0 0 color`) quedó descartado en la exploración de turno 4, no reintroducirlo para nada tipo-cristal (sí sigue vivo para acentos no relacionados con tipo: barra "editando" en ámbar, warning de status).
  Pantallas (`src/screens/`): selector de campañas (sin shell), y dentro de `AppShell` (sidebar persistente y colapsable con hamburguesa flotante, `src/components/AppShell.tsx`) — resumen, listado de NPCs (con filtros), ficha de NPC, edición de NPC (misma vista, no modal, inputs reales), timeline de sesiones, arcos, facciones, locaciones (jerárquicas), quests. Navegación real con `useState`/route model en `App.tsx` (sin router todavía) — edición de NPC y alta de sesión (modal `NewSessionForm`) persisten en memoria (`useState`, se pierde al refrescar, sin backend).
  Quests tiene su propio vocabulario de estado (`QuestStatus`: `active`/`completed`/`failed`/`on_hold`, `QuestStatusPill`) — **no** comparte el semáforo de NPC/personaje (`StatusKind`: vivo/muerto/desaparecido/en pausa, `StatusPill`), son entidades distintas con estados distintos aunque visualmente parecidos.
  Cada entidad de lista (Arcos/Facciones/Locaciones/Quests/Jugadores) tiene detalle propio vía un componente genérico (`src/components/EntityDetail.tsx`, wrappers en `src/screens/EntityDetails.tsx`) — mockeado hasta levantar el endpoint real de cada una en `server/`. Facciones resuelve sus miembros filtrando `npcs` por `faction === group.name` (mock del join real vía `npc_groups`, ver `DATA_MODEL.md`). Todas las entidades con `obsidian_path` en el esquema real (npcs, arcs, groups, locations, player_characters) muestran el path + botón "Abrir en Obsidian" (decorativo, sin wiring real todavía); quests **no** tiene esa columna en el esquema, por eso su detalle no la muestra — no agregarla ahí sin actualizar `DATA_MODEL.md` primero.

## Naming del proyecto

- Carpetas: `server/` (backend Go) y `client/` (frontend React/TS) — NO `backend/`/`frontend/`.
- Módulo Go: ajustar el path a la convención real del usuario en Codeberg/GitHub (confirmar, no asumir `github.com/...` por default si el repo real está en Codeberg).

## Tono

Rioplatense, directo, sin relleno. El usuario prefiere que se le explique el razonamiento técnico detrás de una decisión antes de ejecutarla, y que se le pregunte cuando algo es ambiguo en vez de asumir un default por su cuenta.
