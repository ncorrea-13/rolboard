# Data Model

[Español](DATA_MODEL.es.md)

SQLite. Schema = migrations in `server/internal/repository/migrations/`, applied in order at startup and tracked in `schema_migrations`. An applied migration is never edited: a new one is added instead.

## Entities

```
campaigns
├── arcs
│   └── sessions            (arc_id optional)
├── locations               (hierarchical: parent_location_id)
├── npcs                    (location_id optional)
├── player_characters       (spren_npc_id optional)
├── groups                  (lider_npc_id optional)
├── quests
├── encounters              (session_id optional)
│   └── encounter_participants
├── auth_sessions
└── vault_file_state

Bridge tables
npc_groups      npc ↔ group        (role_in_group, source)
pc_groups       pc ↔ group         (role_in_group, source)
npc_relations   npc → npc          (role, directed)
session_npcs    session ↔ npc
session_pcs     session ↔ pc
session_quests  session ↔ quest
quest_npcs      quest ↔ npc        (schema only, no endpoints)
```

## Conventions

- `id INTEGER PRIMARY KEY AUTOINCREMENT`.
- `created_at` / `updated_at`: `TEXT`, `datetime('now')` (UTC). `updated_at` is set by hand on every `UPDATE`.
- `deleted_at`: soft delete. Reads filter `deleted_at IS NULL`. Distinct from `status` (narrative).
- FKs with `ON DELETE RESTRICT` (except marked exceptions). `foreign_keys` enabled in the DSN.
- Enums enforced with `CHECK` at the DB level.
- `obsidian_path`: relative path inside the campaign's vault. `UNIQUE(campaign_id, obsidian_path)`; lets the reindex do an upsert.
- `image_path`: relative path inside `UPLOADS_ROOT`. Only written by the image endpoints, never by the entity's `PUT` or the reindex.
- `attributes` / `skills`: free-form JSON (`'{}'` by default). Each game system defines its own.
- Bridge tables: composite PK, no `id` or `deleted_at`.

## Tables

### campaigns

| Field             | Notes |
| ----------------- | ----- |
| name, system      | `NOT NULL`. `system` is free text ("Cosmere RPG", "D&D 5e") |
| description       | |
| status            | `active` \| `paused` \| `finished` |
| vault_path        | subfolder under `VAULTS_ROOT`. Unique among active campaigns when not empty |
| access_code_hash  | bcrypt of the access code. Never serialized |

### arcs

| Field         | Notes |
| ------------- | ----- |
| title         | |
| order         | arc number |
| subarc_order  | `NULL` on the main arc; 1, 2… on subarcs (share `order`) |
| status        | `planificado` \| `en_curso` \| `cerrado` |
| summary       | |
| obsidian_path | unique per campaign when not `NULL` (partial index) |

### sessions

| Field          | Notes |
| -------------- | ----- |
| arc_id         | optional |
| session_number | allows `0` |
| sub_number     | default `0`; interludes (4.1 → `4`, `1`). `99` marks archived sessions |
| session_type   | `session` \| `interlude` \| `planning` |
| date           | `YYYY-MM-DD` |
| summary        | |
| prep_notes     | dashboard only |
| obsidian_path  | |

`UNIQUE(campaign_id, session_number, sub_number)`. `sub_number` is `0`, not `NULL`, because SQLite doesn't compare `NULL` in a `UNIQUE`.

### locations

| Field               | Notes |
| ------------------- | ----- |
| name                | |
| location_type       | `planet` \| `region` \| `city` \| `site` \| `plane` |
| parent_location_id  | optional, self-FK |
| description, notes  | |
| obsidian_path       | |
| image_path          | |

### npcs

| Field                  | Notes |
| ---------------------- | ----- |
| name                   | |
| npc_kind               | `npc` \| `spren` \| `entidad-cognitiva` \| `referencia` |
| detail_level           | `full` \| `minor` |
| status                 | `vivo` \| `muerto` \| `desaparecido` \| `activo` \| `consolidado` \| `paused` |
| location_id            | current location, optional |
| etnia, rol, tipo_spren | optional |
| description, notes     | |
| attributes, skills     | JSON |
| obsidian_path          | |
| image_path             | |

### player_characters

| Field              | Notes |
| ------------------ | ----- |
| player_name        | real person |
| character_name     | |
| race, class        | free text; `class` dashboard only |
| status             | `vivo` \| `muerto` \| `desaparecido` \| `activo` (default) |
| spren_npc_id       | optional, reindex only |
| backstory, progression_notes | dashboard only |
| attributes, skills | JSON |
| current_hp, max_hp | optional; persist across encounters |
| obsidian_path      | |
| historia_path, avances_path | paths to `Historia.md` / `Avances.md`, reindex only |
| image_path         | |

### groups

| Field              | Notes |
| ------------------ | ----- |
| name               | |
| description, notes | |
| alineacion         | free text |
| lider_npc_id       | optional, `ON DELETE SET NULL` |
| obsidian_path      | |
| image_path         | |

`member_count` isn't a column: it's computed from `npc_groups`.

### quests

| Field       | Notes |
| ----------- | ----- |
| title       | |
| description, notes | |
| status      | `active` \| `completed` \| `failed` \| `on_hold` |
| priority    | optional |

No `obsidian_path`: quests live only in the DB.

### encounters

| Field      | Notes |
| ---------- | ----- |
| session_id | optional |
| round      | default `1` |
| status     | `planificado` (default) \| `activo` \| `cerrado` |

### encounter_participants

| Field                          | Notes |
| ------------------------------ | ----- |
| encounter_id                   | |
| pc_id / npc_id / display_name  | at most one (`CHECK`). `display_name` = enemy with no entity |
| current_hp, max_hp             | for PCs, the client syncs with `player_characters` |
| initiative_value               | D&D: numeric turn order |
| turn_type                      | Cosmere: `rapido` \| `lento` |
| notes                          | |
| attributes, skills             | JSON; only for enemies with no entity |

### auth_sessions

| Field       | Notes |
| ----------- | ----- |
| campaign_id | `ON DELETE CASCADE` |
| token_hash  | SHA-256 of the cookie token, unique |
| expires_at  | 24 h |

### vault_file_state

PK `(campaign_id, path)`. Stores `content_hash` (SHA-256), `entity_type`, `entity_id` and `indexed_at` for each indexed note. Reindex skips notes whose hash hasn't changed.

## Bridge tables

```sql
npc_groups     (npc_id, group_id, role_in_group, source)   PK (npc_id, group_id)
pc_groups      (pc_id, group_id, role_in_group, source)    PK (pc_id, group_id)
npc_relations  (from_npc_id, to_npc_id, role)               PK (from_npc_id, to_npc_id, role)
session_npcs   (session_id, npc_id)                         PK (session_id, npc_id)
session_pcs    (session_id, pc_id)                           PK (session_id, pc_id)
session_quests (session_id, quest_id)                        PK (session_id, quest_id)
quest_npcs     (quest_id, npc_id)                            PK (quest_id, npc_id)
```

`source` (`npc_groups`, `pc_groups`): `vault` | `dashboard` (default) | `removed`.

- The reindex only deletes and rewrites `vault` rows.
- If the vault confirms a `dashboard` row, it becomes `vault`; a `removed` row stays `removed`.
- Removing a member from the dashboard sets `removed` (doesn't delete), so the reindex doesn't revive it.
- Reads filter `source != 'removed'`.

`npc_relations` is directed: A → B with role "ACREEDOR" doesn't imply B → A.
