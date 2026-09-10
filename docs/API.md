# API

REST + JSON. Router: `net/http` stdlib (Go 1.22+, `ServeMux` con path params nativos). Sin autenticación — la seguridad es perimetral (acceso solo vía Tailscale).

## Convenciones

- Todos los endpoints bajo `/api`.
- Las entidades hijas de una campaña (`npcs`, `locations`, `quests`, `sessions`, `groups`, `arcs`) se listan/crean anidadas bajo `/api/campaigns/:id/...`, y se leen/editan/borran por su propio ID en la raíz de su recurso (`/api/npcs/:id`).

## Campaigns

```
GET    /api/campaigns
POST   /api/campaigns
GET    /api/campaigns/:id
PUT    /api/campaigns/:id
DELETE /api/campaigns/:id
```

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
```

`GET /api/campaigns/:id/groups` y `GET /api/groups/:id` incluyen `member_count` (calculado desde `npc_groups`, mismo caso que `members`, no es columna).

## Player Characters

```
GET    /api/campaigns/:id/player-characters
POST   /api/campaigns/:id/player-characters
GET    /api/player-characters/:id
PUT    /api/player-characters/:id
DELETE /api/player-characters/:id
```

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
POST /api/admin/reindex
```

Dispara el reindexado completo del vault de Obsidian (síncrono, ver `decisiones.md`). Vacía y repuebla las tablas indexables a partir del contenido actual del vault montado. Devuelve un resumen del resultado (cantidad de entidades procesadas, wikilinks no resueltos, conflictos de nombre duplicado, etc.).

## Health check

```
GET /api/health
```

Ya implementado. Devuelve `{"status":"ok"}`.

## Pendiente de definir

- Endpoint específico para relaciones many-to-many sueltas: resuelto para `session_npcs`/`session_quests` (`GET/POST/DELETE /api/sessions/:id/npcs`, `/quests`, mismo patrón que `npc_relations`). Sigue pendiente para `quest_npcs` y `npc_groups` (agregar/sacar un NPC de una facción o quest sin reemplazar la entidad completa).
- Paginación — no evaluada aún; con el volumen actual del vault (~166 entidades) probablemente no haga falta para el MVP.
