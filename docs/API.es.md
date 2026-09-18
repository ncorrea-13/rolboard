# API

[English](API.md)

REST + JSON bajo `/api`. Router: `net/http` stdlib (`ServeMux` con métodos y path params). Fuente de verdad: `server/internal/handlers/router.go`.

## Convenciones

- Entidades de una campaña se listan y crean bajo `/api/campaigns/{id}/...`; se leen, editan y borran por su propio ID (`/api/npcs/{id}`).
- `DELETE` de entidades es baja lógica (`deleted_at`). Responde `204`.
- `POST` de creación responde `201` con la entidad; `PUT` responde la entidad actualizada.
- Enums inválidos → `400`. Recurso inexistente → `404`.

## Autenticación

| Nivel    | Cómo                                   | Cookie                   |
| -------- | -------------------------------------- | ------------------------ |
| Pública  | sin cookie                             | —                        |
| Admin    | `POST /api/admin/login`                | `rolboard_admin_session` |
| Campaña  | `POST /api/campaigns/{id}/login`       | `rolboard_session`       |

La sesión de admin pasa cualquier chequeo de campaña. La de campaña solo accede a recursos de esa campaña (el middleware resuelve la campaña del recurso y compara; si no coincide → `401`).

```
POST /api/admin/login              {"token": "..."}      rate limit 5 / 15 min
POST /api/admin/logout
GET  /api/admin/session            admin — 204 si la sesión es válida
POST /api/campaigns/{id}/login     {"code": "..."}       rate limit 5 / min
POST /api/campaigns/{id}/logout
POST /api/campaigns/{id}/access-code   admin — {"code": "..."}, mínimo 8 caracteres
```

Todas las rutas de abajo requieren sesión de campaña (o admin), salvo las marcadas.

## Health

```
GET /api/health          pública — {"status":"ok"}
```

## Campaigns

```
GET    /api/campaigns          pública — [{id, name, system, status}]
POST   /api/campaigns          admin
GET    /api/campaigns/{id}
PUT    /api/campaigns/{id}
DELETE /api/campaigns/{id}
```

Body: `name`, `system`, `description`, `vault_path`, y `status` (`active` | `paused` | `finished`) en `PUT`.

La lista pública va recortada a propósito: la pantalla de selección la necesita antes de haber sesión, y no debe exponer `vault_path`. El detalle devuelve el registro completo.

## Dashboard

```
GET /api/campaigns/{id}/dashboard
```

`{active_quests, on_hold_quests, recent_npcs, last_session}` — `recent_npcs` son los 5 con `updated_at` más reciente.

## Arcs

```
GET    /api/campaigns/{id}/arcs
POST   /api/campaigns/{id}/arcs
GET    /api/arcs/{id}
PUT    /api/arcs/{id}
DELETE /api/arcs/{id}
```

Body: `name` (se guarda como `title`), `order`, `status` (`planificado` | `en_curso` | `cerrado`), `subarc_order`, `summary`, `obsidian_path`.

## Sessions

```
GET    /api/campaigns/{id}/sessions
POST   /api/campaigns/{id}/sessions
GET    /api/sessions/{id}
PUT    /api/sessions/{id}
DELETE /api/sessions/{id}
GET    /api/sessions/{id}/npcs
POST   /api/sessions/{id}/npcs              {"npc_id": N}
DELETE /api/sessions/{id}/npcs/{npcId}
GET    /api/sessions/{id}/quests
POST   /api/sessions/{id}/quests            {"quest_id": N}
DELETE /api/sessions/{id}/quests/{questId}
```

Body: `arc_id`, `session_number`, `sub_number`, `session_type` (`session` | `interlude` | `planning`), `date`, `summary`, `prep_notes`, `obsidian_path`.

`session_npcs` también lo escribe el reindex (lo reemplaza con los wikilinks del cuerpo de la nota). `session_quests` solo se maneja desde acá.

## Locations

```
GET    /api/campaigns/{id}/locations
POST   /api/campaigns/{id}/locations
GET    /api/locations/{id}
PUT    /api/locations/{id}
DELETE /api/locations/{id}
POST   /api/locations/{id}/image
DELETE /api/locations/{id}/image
GET    /api/locations/{id}/image
```

Body: `name`, `location_type` (`planet` | `region` | `city` | `site` | `plane`), `parent_location_id`, `description`, `notes`, `obsidian_path`.

## NPCs

```
GET    /api/campaigns/{id}/npcs
POST   /api/campaigns/{id}/npcs
GET    /api/npcs/{id}
PUT    /api/npcs/{id}
DELETE /api/npcs/{id}
GET    /api/npcs/{id}/relations
POST   /api/npcs/{id}/relations                {"to_npc_id": N, "role": "ACREEDOR"}
DELETE /api/npcs/{id}/relations/{toId}/{role}
POST   /api/npcs/{id}/image
DELETE /api/npcs/{id}/image
GET    /api/npcs/{id}/image
```

Body: `name`, `npc_kind` (`npc` | `spren` | `entidad-cognitiva` | `referencia`), `detail_level` (`full` | `minor`), `status` (`vivo` | `muerto` | `desaparecido` | `activo` | `consolidado` | `paused`), `location_id`, `etnia`, `rol`, `tipo_spren`, `description`, `notes`, `attributes`, `skills`, `obsidian_path`.

Relaciones: dirigidas (`{id}` es el origen), `role` es texto libre. `GET` devuelve las relaciones donde el NPC es origen o destino.

## Player Characters

```
GET    /api/campaigns/{id}/player-characters
POST   /api/campaigns/{id}/player-characters
GET    /api/player-characters/{id}
PUT    /api/player-characters/{id}
DELETE /api/player-characters/{id}
POST   /api/player-characters/{id}/image
DELETE /api/player-characters/{id}/image
GET    /api/player-characters/{id}/image
```

Body: `player_name`, `character_name`, `race`, `class`, `status` (`vivo` | `muerto` | `desaparecido` | `activo`), `backstory`, `progression_notes`, `attributes`, `skills`, `current_hp`, `max_hp`, `obsidian_path`.

`spren_npc_id`, `historia_path` y `avances_path` solo los escribe el reindex.

## Groups (facciones)

```
GET    /api/campaigns/{id}/groups
POST   /api/campaigns/{id}/groups
GET    /api/groups/{id}
PUT    /api/groups/{id}
DELETE /api/groups/{id}
GET    /api/groups/{id}/members
POST   /api/groups/{id}/members              {"npc_id": N}
DELETE /api/groups/{id}/members/{npcId}
GET    /api/groups/{id}/pc-members
POST   /api/groups/{id}/pc-members           {"pc_id": N}
DELETE /api/groups/{id}/pc-members/{pcId}
POST   /api/groups/{id}/image
DELETE /api/groups/{id}/image
GET    /api/groups/{id}/image
```

Body: `name`, `description`, `notes`, `alineacion`, `lider_npc_id`, `obsidian_path`.

Lista y detalle incluyen `member_count` (calculado). Sacar un miembro es baja lógica (`source = 'removed'`) para que el reindex no lo vuelva a agregar.

## Quests

```
GET    /api/campaigns/{id}/quests
POST   /api/campaigns/{id}/quests
GET    /api/quests/{id}
PUT    /api/quests/{id}
DELETE /api/quests/{id}
```

Body: `title`, `description`, `status` (`active` | `completed` | `failed` | `on_hold`), `priority`, `notes`.

## Encounters (tracker de combate)

```
GET    /api/campaigns/{id}/encounters
POST   /api/campaigns/{id}/encounters
GET    /api/encounters/{id}
PUT    /api/encounters/{id}
DELETE /api/encounters/{id}
GET    /api/encounters/{id}/participants
POST   /api/encounters/{id}/participants
PUT    /api/encounter-participants/{id}
DELETE /api/encounter-participants/{id}
```

Encounter: `session_id`, `round` (default 1), `status` (`planificado` | `activo` | `cerrado`, default `planificado`).

Participante: `pc_id`, `npc_id`, `display_name`, `current_hp`, `max_hp`, `initiative_value`, `turn_type` (`rapido` | `lento`), `notes`, `attributes`, `skills`. A lo sumo uno de `pc_id` / `npc_id` / `display_name` (`400` si no).

## Imágenes

```
POST   /api/{entidad}/{id}/image    multipart/form-data, campo "file"
DELETE /api/{entidad}/{id}/image
GET    /api/{entidad}/{id}/image
```

Entidades: `npcs`, `player-characters`, `locations`, `groups`.

- `POST`: solo PNG/JPEG (detectado por contenido), máx. 5 MiB. Reemplaza la anterior. Devuelve la entidad.
- `DELETE`: borra archivo y limpia `image_path`. Devuelve la entidad.
- `GET`: sirve el archivo con `X-Content-Type-Options: nosniff`. `404` si no hay imagen.

`image_path` no viaja en `POST`/`PUT` de la entidad.

## Vault

```
POST /api/campaigns/{id}/reindex
GET  /api/campaigns/{id}/notes/render?path=<ruta relativa>
GET  /api/admin/vault-dirs[?campaignId=N]
```

- `reindex`: reindexa el vault de la campaña de forma síncrona. Devuelve `{Processed, UnresolvedWikilinks, Conflicts, Errors}`.
- `notes/render`: `{"html": "..."}` con la nota renderizada y sanitizada; wikilinks resueltos a links de entidad.
- `vault-dirs`: carpetas bajo `VAULTS_ROOT` sin campaña asignada (la carpeta de `campaignId` se incluye, para poder reasignarla). Admin sin parámetro, o sesión de la campaña `campaignId`.

Detalle: [`VAULT_INDEXER.md`](./VAULT_INDEXER.md).
