# API

[Español](API.es.md)

REST + JSON under `/api`. Router: `net/http` stdlib (`ServeMux` with methods and path params). Source of truth: `server/internal/handlers/router.go`.

## Conventions

- A campaign's entities are listed and created under `/api/campaigns/{id}/...`; read, updated and deleted by their own ID (`/api/npcs/{id}`).
- `DELETE` on entities is a soft delete (`deleted_at`). Responds `204`.
- `POST` create responds `201` with the entity; `PUT` responds with the updated entity.
- Invalid enums → `400`. Nonexistent resource → `404`.

## Authentication

| Level    | How                                   | Cookie                   |
| -------- | -------------------------------------- | ------------------------ |
| Public   | no cookie                              | —                        |
| Admin    | `POST /api/admin/login`                | `rolboard_admin_session` |
| Campaign | `POST /api/campaigns/{id}/login`       | `rolboard_session`       |

An admin session passes any campaign check. A campaign session only accesses resources from that campaign (middleware resolves the resource's campaign and compares; mismatch → `401`).

```
POST /api/admin/login              {"token": "..."}      rate limit 5 / 15 min
POST /api/admin/logout
GET  /api/admin/session            admin — 204 if the session is valid
POST /api/campaigns/{id}/login     {"code": "..."}       rate limit 5 / min
POST /api/campaigns/{id}/logout
POST /api/campaigns/{id}/access-code   admin — {"code": "..."}, minimum 8 characters
```

All routes below require a campaign session (or admin), except those marked.

## Health

```
GET /api/health          public — {"status":"ok"}
```

## Campaigns

```
GET    /api/campaigns          public — [{id, name, system, status}]
POST   /api/campaigns          admin
GET    /api/campaigns/{id}
PUT    /api/campaigns/{id}
PUT    /api/campaigns/{id}/wardails   {"wardails": "..."}   204, max 20000 characters
DELETE /api/campaigns/{id}
```

Body: `name`, `system`, `description`, `vault_path`, and `status` (`active` | `paused` | `finished`) on `PUT`.

`wardails` is free-form markdown with the campaign's sensitive topics; it has its own endpoint so saving it never overwrites the other fields. `GET /api/campaigns/{id}` returns it.

The public list is deliberately trimmed: the selection screen needs it before there's a session, and it must not expose `vault_path`. The detail endpoint returns the full record.

## Dashboard

```
GET /api/campaigns/{id}/dashboard
```

`{active_quests, on_hold_quests, recent_npcs, last_session}` — `recent_npcs` are the 5 with the most recent `updated_at`.

## Arcs

```
GET    /api/campaigns/{id}/arcs
POST   /api/campaigns/{id}/arcs
GET    /api/arcs/{id}
PUT    /api/arcs/{id}
DELETE /api/arcs/{id}
```

Body: `name` (stored as `title`), `order`, `status` (`planificado` | `en_curso` | `cerrado`), `subarc_order`, `summary`, `obsidian_path`.

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

`session_npcs` is also written by the reindex (it replaces them with the wikilinks from the note's body). `session_quests` is only managed from here.

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

Relations: directed (`{id}` is the origin), `role` is free text. `GET` returns relations where the NPC is either origin or destination.

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

`spren_npc_id`, `historia_path` and `avances_path` are only written by the reindex.

## Groups (factions)

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

List and detail include `member_count` (computed). Removing a member is a soft delete (`source = 'removed'`) so the reindex doesn't add it back.

## Quests

```
GET    /api/campaigns/{id}/quests
POST   /api/campaigns/{id}/quests
GET    /api/quests/{id}
PUT    /api/quests/{id}
DELETE /api/quests/{id}
```

Body: `title`, `description`, `status` (`active` | `completed` | `failed` | `on_hold`), `priority`, `notes`.

## Encounters (combat tracker)

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

Participant: `pc_id`, `npc_id`, `display_name`, `current_hp`, `max_hp`, `initiative_value`, `turn_type` (`rapido` | `lento`), `notes`, `attributes`, `skills`. At most one of `pc_id` / `npc_id` / `display_name` (`400` otherwise).

## Images

```
POST   /api/{entity}/{id}/image    multipart/form-data, field "file"
DELETE /api/{entity}/{id}/image
GET    /api/{entity}/{id}/image
```

Entities: `npcs`, `player-characters`, `locations`, `groups`.

- `POST`: PNG/JPEG only (detected by content), max 5 MiB. Replaces the previous image. Returns the entity.
- `DELETE`: deletes the file and clears `image_path`. Returns the entity.
- `GET`: serves the file with `X-Content-Type-Options: nosniff`. `404` if there's no image.

`image_path` is never accepted in an entity's `POST`/`PUT`.

## Vault

```
POST /api/campaigns/{id}/reindex
GET  /api/campaigns/{id}/notes/render?path=<relative path>
GET  /api/admin/vault-dirs[?campaignId=N]
```

- `reindex`: reindexes the campaign's vault synchronously. Returns `{Processed, UnresolvedWikilinks, Conflicts, Errors}`.
- `notes/render`: `{"html": "..."}` with the rendered, sanitized note; wikilinks resolved to entity links.
- `vault-dirs`: folders under `VAULTS_ROOT` with no campaign assigned (the `campaignId` folder is included, so it can be reassigned). Admin with no parameter, or a session from the `campaignId` campaign.

Details: [`VAULT_INDEXER.md`](./VAULT_INDEXER.md).
