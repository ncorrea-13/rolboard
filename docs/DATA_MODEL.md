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
├── player_characters
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
npc_player_relations npc ↔ pc     (role, source)
session_npcs    session ↔ npc
session_pcs     session ↔ pc
session_quests  session ↔ quest
quest_npcs      quest ↔ npc        (role)
```

## Conventions

- `id INTEGER PRIMARY KEY AUTOINCREMENT`.
- `created_at` / `updated_at`: `TEXT`, `datetime('now')` (UTC). `updated_at` is set by hand on every `UPDATE`.
- `deleted_at`: soft delete. Reads filter `deleted_at IS NULL`; the trash screen reads the opposite. Distinct from `status` (narrative).
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
| wardails          | free-form markdown with the campaign's sensitive topics. `NOT NULL DEFAULT ''` |

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
| session_type   | `session` \| `interlude` \| `planning` \| `oneshot` |
| title          | oneshots only (UI); `''` otherwise |
| planned        | `0`/`1`, oneshots only: planned vs played. Other types use `session_type = 'planning'` |
| date           | `YYYY-MM-DD` |
| summary        | |
| prep_notes     | dashboard only |
| obsidian_path  | |

Unique partial index `sessions_active_number_uq` on `(campaign_id, session_number, sub_number) WHERE deleted_at IS NULL AND session_type <> 'oneshot'` (migrations 0023 and 0024). Oneshots (`O1`, `O2`...) are numbered on their own through `sessions_active_oneshot_number_uq` on `(campaign_id, session_number)`, so `O1` and `S1` coexist: a deleted session frees its number, and restoring it fails with `409` if the number was taken meanwhile. `sub_number` is `0`, not `NULL`, because SQLite doesn't compare `NULL` in a unique index.

### locations

| Field               | Notes |
| ------------------- | ----- |
| name                | |
| location_type       | `planet` \| `region` \| `city` \| `site` \| `plane` |
| parent_location_id  | optional, self-FK |
| description, notes  | |
| obsidian_path       | |
| image_path          | |

### npc_types

| Field             | Notes |
| ----------------- | ----- |
| campaign_id       | `ON DELETE CASCADE` |
| key               | Derived from the label, immutable. Unique per campaign. Matches the vault's `tipo` |
| label, color      | Display only. `color` is `#rrggbb` |
| position          | Display order |

### npcs

| Field                  | Notes |
| ---------------------- | ----- |
| name                   | |
| npc_kind               | key of one of the campaign's `npc_types`, or the reserved `referencia` (link-target-only notes) |
| detail_level           | `full` \| `minor` |
| status                 | `vivo` \| `muerto` \| `desaparecido` \| `activo` \| `consolidado` \| `paused` |
| location_id            | current location, optional |
| origen, rol, subtipo | optional, free text |
| description, notes     | |
| attributes, skills     | JSON |
| current_hp, max_hp     | optional; persist across encounters |
| obsidian_path          | |
| image_path             | |

### player_characters

| Field              | Notes |
| ------------------ | ----- |
| player_name        | real person |
| character_name     | |
| race, class        | free text; `class` dashboard only |
| status             | `vivo` \| `muerto` \| `desaparecido` \| `activo` (default) |
| description, backstory, progression_notes | dashboard only; the reindex never overwrites them (nor `class`) |
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
| image_path  | written by the image endpoint only (migration 0027) |

No `obsidian_path`: quests live only in the DB.

### lore_categories / lore_entries

Per-campaign lore. Categories follow the `npc_types` pattern (`key` derived from the label, `color`, `position`) and are seeded on campaign creation (migration 0026 seeds existing campaigns).

| Field (`lore_entries`) | Notes |
| ---------------------- | ----- |
| title                  | required |
| body                   | Markdown |
| category_id            | optional; a category referenced by any entry (even a deleted one) can't be deleted |
| arc_id, location_id    | optional, `ON DELETE RESTRICT` |
| obsidian_path          | note in the vault's `Lore/` folder; the reindex sets title, category, arc and location, never `body` |
| image_path             | illustration; written by the image endpoint only (migration 0027) |

### currencies / items and their bridges

| Table | Notes |
| ----- | ----- |
| `currencies` | `name`, `symbol`, optional `rate_to_base` (> 0), `is_base`. At most one active base per campaign (partial unique index) |
| `currency_locations` | where a currency circulates |
| `items` | `name`, `description`, `effect` (free text), `category`, `rarity` (free text), optional `weight`, `image_path` (image endpoint only) |
| `item_prices` | `(item_id, currency_id, amount)`: an item can be priced in several currencies |
| `pc_items`, `npc_items` | inventory: `quantity` (> 0) and `notes` |
| `location_items` | what a location sells, with `notes` |
| `location_item_prices` | own price per currency; composite FK to `location_items`. Without rows, the catalog price applies |

### secrets / secret_npcs

DM-only narrative secrets.

| Field (`secrets`) | Notes |
| ----------------- | ----- |
| title, body       | title required; body is Markdown |
| status            | `hidden` \| `revealed`, default `hidden` |
| revealed_session_id | optional; only kept while `revealed` |
| npc_id, location_id, lore_entry_id | optional: what the secret is about |

`secret_npcs (secret_id, npc_id)` lists who knows it. A deleted NPC stops showing as knowing the secret (reads filter deleted rows).

### timelines / timeline_events

World chronologies. A timeline is a colored lane; events belong to exactly one of them.

| Field (`timeline_events`) | Notes |
| ------------------------- | ----- |
| timeline_id               | required, `ON DELETE RESTRICT` |
| title, description        | title required; description is Markdown |
| date_label, end_date_label | free text for display (each setting has its own calendar) |
| sort_key                  | `REAL`, typed by hand; the only ordering criterion |
| arc_id, session_id, location_id, group_id, lore_entry_id | optional, same campaign |

`timelines` carry `name`, `description`, `color`, optional `start_label` / `end_label` and `position`. A timeline with active events can't be deleted (`409 timeline_in_use`).

### notes

Loose notes (`LooseNote` in the code, to avoid clashing with vault notes). Dashboard only.

| Field       | Notes |
| ----------- | ----- |
| title       | required |
| body        | Markdown |
| pending     | `0`/`1`, "to be filed"; default `1` |

### encounters

| Field      | Notes |
| ---------- | ----- |
| name       | optional; the list shows `Encounter #id` when empty |
| session_id | optional |
| round      | default `1` |
| status     | `planificado` (default) \| `activo` \| `cerrado` |

### encounter_participants

| Field                          | Notes |
| ------------------------------ | ----- |
| encounter_id                   | |
| pc_id / npc_id / display_name  | at most one (`CHECK`). `display_name` = enemy with no entity |
| current_hp, max_hp             | for PCs and NPCs, the client syncs with `player_characters` / `npcs` |
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
npc_player_relations (npc_id, player_character_id, role, source) PK (npc_id, player_character_id)
session_npcs   (session_id, npc_id)                         PK (session_id, npc_id)
session_pcs    (session_id, pc_id)                           PK (session_id, pc_id)
session_quests (session_id, quest_id)                        PK (session_id, quest_id)
quest_npcs     (quest_id, npc_id, role)                      PK (quest_id, npc_id)
```

`source` (`npc_groups`, `pc_groups`, `npc_player_relations`): `vault` | `dashboard` (default) | `removed`.

- The reindex only deletes and rewrites `vault` rows.
- If the vault confirms a `dashboard` row, it becomes `vault`; a `removed` row stays `removed`.
- Removing a member from the dashboard sets `removed` (doesn't delete), so the reindex doesn't revive it.
- Reads filter `source != 'removed'`.

`npc_relations` is directed: A → B with role "ACREEDOR" doesn't imply B → A.
