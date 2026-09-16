# API

REST + JSON. Router: `net/http` stdlib (Go 1.27+, `ServeMux` con path params nativos). Autenticación por campaña vía código de acceso (ver sección Dashboard/Login más abajo); rutas de gestión de instancia (crear campaña, listar vault dirs) piden `X-Admin-Token` (ver sección Admin).

## Convenciones

- Todos los endpoints bajo `/api`.
- Las entidades hijas de una campaña (`npcs`, `locations`, `quests`, `sessions`, `groups`, `arcs`) se listan/crean anidadas bajo `/api/campaigns/:id/...`, y se leen/editan/borran por su propio ID en la raíz de su recurso (`/api/npcs/:id`).

## Campaigns

```
GET    /api/campaigns
POST   /api/campaigns              -- requiere header X-Admin-Token
GET    /api/campaigns/:id
PUT    /api/campaigns/:id
DELETE /api/campaigns/:id
```

`GET /api/campaigns` es el único endpoint de datos sin auth (la pantalla de selección lo necesita antes de que exista sesión) — por eso devuelve un shape recortado, `{id, name, system, status}`, sin `vault_path` ni `description`. El resto de las rutas de campaña están detrás de sesión/admin y devuelven el registro completo. Razonamiento: `docs/ROADMAP_V0.2.md`, Fase 0.

## Arcs

```
GET    /api/campaigns/:id/arcs
POST   /api/campaigns/:id/arcs
GET    /api/arcs/:id
PUT    /api/arcs/:id
DELETE /api/arcs/:id
```

## NPCs

```
GET    /api/campaigns/:id/npcs
POST   /api/campaigns/:id/npcs
GET    /api/npcs/:id
PUT    /api/npcs/:id
DELETE /api/npcs/:id
GET    /api/npcs/:id/relations                    -- relaciones donde el NPC es from_npc_id o to_npc_id
POST   /api/npcs/:id/relations                     -- body: {"to_npc_id": <id>, "role": "ACREEDOR"}, :id es from_npc_id
DELETE /api/npcs/:id/relations/:toId/:role         -- :id es from_npc_id
```

`role` es texto libre (sin `CHECK` en DB, sin enum en Go) — a diferencia de `status`/`npc_kind`, estos roles nacen de prosa de sesión ("ACREEDOR", "LE DEBE A", "VINCULADO A"), no de un vocabulario cerrado.

`attributes`/`skills` (`{"fuerza": 10, "sigilo": 3}`, JSON libre por sistema) viajan en el `POST`/`PUT` igual que el resto de los campos — se editan desde `NpcEdit`, no desde el tracker de combate.

## Locations

```
GET    /api/campaigns/:id/locations
POST   /api/campaigns/:id/locations
GET    /api/locations/:id
PUT    /api/locations/:id
DELETE /api/locations/:id
```

## Groups

```
GET    /api/campaigns/:id/groups
POST   /api/campaigns/:id/groups
GET    /api/groups/:id
PUT    /api/groups/:id
DELETE /api/groups/:id
GET    /api/groups/:id/members       -- calculado desde npc_groups, no almacenado
POST   /api/groups/:id/members       {"npc_id": N}
DELETE /api/groups/:id/members/:npcId
GET    /api/groups/:id/pc-members    -- calculado desde pc_groups
POST   /api/groups/:id/pc-members    {"pc_id": N}
DELETE /api/groups/:id/pc-members/:pcId
```

`GET /api/campaigns/:id/groups` y `GET /api/groups/:id` incluyen `member_count` (calculado desde `npc_groups`, mismo caso que `members`, no es columna).

Alta/baja de miembro (NPC o PJ) es baja lógica del lado de `npc_groups`/`pc_groups` (columna `source`, no se borra la fila) — el indexer también escribe estas tablas al reindexar, y necesita distinguir lo que puso el vault de lo que agregaste/sacaste a mano para no pisarlo (ver `DECISIONS.md`).

## Player Characters

```
GET    /api/campaigns/:id/player-characters
POST   /api/campaigns/:id/player-characters
GET    /api/player-characters/:id
PUT    /api/player-characters/:id
DELETE /api/player-characters/:id
```

`attributes`/`skills`, mismo trato que en NPCs — se editan desde `PlayerEdit`.

`current_hp`/`max_hp` (nullable) persisten la vida del PJ entre sesiones — se sincronizan automáticamente desde `PUT /api/encounter-participants/:id` cuando el participante está vinculado a este PJ (ver sección Encounters).

## Quests

```
GET    /api/campaigns/:id/quests
POST   /api/campaigns/:id/quests
GET    /api/quests/:id
PUT    /api/quests/:id
DELETE /api/quests/:id
```

## Sessions

```
GET    /api/campaigns/:id/sessions
POST   /api/campaigns/:id/sessions
GET    /api/sessions/:id
PUT    /api/sessions/:id
DELETE /api/sessions/:id
GET    /api/sessions/:id/npcs
POST   /api/sessions/:id/npcs      {"npc_id": N}
DELETE /api/sessions/:id/npcs/:npcId
GET    /api/sessions/:id/quests
POST   /api/sessions/:id/quests    {"quest_id": N}
DELETE /api/sessions/:id/quests/:questId
```

## Encounters

Tracker de combate — vista de control personal del DM, no compartida con jugadores (ver `DECISIONS.md`).

```
GET    /api/campaigns/:id/encounters
POST   /api/campaigns/:id/encounters   {"session_id": N|null, "round": N, "status": "planificado"|"activo"|"cerrado"}
GET    /api/encounters/:id
PUT    /api/encounters/:id
DELETE /api/encounters/:id
GET    /api/encounters/:id/participants
POST   /api/encounters/:id/participants
    {"pc_id": N|null, "npc_id": N|null, "display_name": string|null,
     "current_hp": N|null, "max_hp": N|null, "initiative_value": N|null,
     "turn_type": "rapido"|"lento"|null, "notes": string,
     "attributes": {...}, "skills": {...}}
PUT    /api/encounter-participants/:id
DELETE /api/encounter-participants/:id
```

`pc_id`/`npc_id`/`display_name` son mutuamente excluyentes: a lo sumo uno con valor por participante (PJ, NPC con ficha, o enemigo ad-hoc sin entidad propia) — validado en el handler y en un `CHECK` de la tabla.

`attributes`/`skills` del participante solo tienen sentido para enemigos ad-hoc (sin `pc_id`/`npc_id`) — un PJ/NPC vinculado ya trae su ficha propia desde `player-characters`/`npcs`, el front la muestra de solo lectura en el tracker (botón "Ver ficha") y la edita en `NpcEdit`/`PlayerEdit`, no acá.

## Dashboard (agregado)

```
GET /api/campaigns/:id/dashboard
```

Devuelve en una sola respuesta lo necesario para pintar la vista principal sin que el frontend tenga que hacer múltiples requests al cargar: `active_quests`, `on_hold_quests`, `recent_npcs` (5 más recientes por `updated_at`), `last_session` (mayor `session_number`/`sub_number`).

## Notas del vault (render)

```
GET /api/campaigns/:id/notes/render?path=<ruta-relativa-dentro-del-vault-de-esa-campaña>
```

Lee el `.md` correspondiente del vault de esa campaña (resuelto contra su `vault_path`), separa el frontmatter, resuelve `[[wikilinks]]` del cuerpo contra las entidades ya indexadas (match único → `<a data-entity-type="..." data-entity-id="...">`, ambiguo o sin match → texto plano) y convierte el resultado a HTML (`goldmark`). Devuelve `{"html": "..."}`.

## Admin / Reindexado del vault

```
POST /api/campaigns/:id/reindex   -- requiere sesión de esa campaña (cookie), no X-Admin-Token
GET  /api/admin/vault-dirs        -- requiere header X-Admin-Token
```

`reindex` dispara el reindexado del vault de esa campaña (incremental por `content_hash`, no vacía tablas — ver `vault/indexer.go`). Devuelve un resumen del resultado (cantidad de entidades procesadas, wikilinks no resueltos, conflictos de nombre duplicado, errores por archivo).

`vault-dirs` lista los directorios sin campaña asignada bajo el root del vault montado, para el selector de `NewCampaignForm`. Gateado con `X-Admin-Token` porque expone estructura del filesystem — mismo token que `POST /api/campaigns`.

## Health check

```
GET /api/health
```

Ya implementado. Devuelve `{"status":"ok"}`.

## Pendiente de definir

- Endpoint específico para relaciones many-to-many sueltas: resuelto para `session_npcs`/`session_quests` (`GET/POST/DELETE /api/sessions/:id/npcs`, `/quests`, mismo patrón que `npc_relations`) y para `npc_groups` (`GET/POST/DELETE /api/groups/:id/members`). Sigue pendiente para `quest_npcs` (ver `docs/DECISIONS.md` para el porqué).
- Paginación — no evaluada aún; con el volumen actual del vault (~166 entidades) probablemente no haga falta para el MVP.
