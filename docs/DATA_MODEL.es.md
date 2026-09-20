# Modelo de Datos

[English](DATA_MODEL.md)

SQLite. Esquema = migraciones en `server/internal/repository/migrations/`, aplicadas en orden al arrancar y registradas en `schema_migrations`. Nunca se edita una migración ya aplicada: se agrega una nueva.

## Entidades

```
campaigns
├── arcs
│   └── sessions            (arc_id opcional)
├── locations               (jerárquicas: parent_location_id)
├── npcs                    (location_id opcional)
├── player_characters       (spren_npc_id opcional)
├── groups                  (lider_npc_id opcional)
├── quests
├── encounters              (session_id opcional)
│   └── encounter_participants
├── auth_sessions
└── vault_file_state

Tablas puente
npc_groups      npc ↔ group        (role_in_group, source)
pc_groups       pc ↔ group         (role_in_group, source)
npc_relations   npc → npc          (role, dirigida)
session_npcs    session ↔ npc
session_pcs     session ↔ pc
session_quests  session ↔ quest
quest_npcs      quest ↔ npc        (solo esquema, sin endpoints)
```

## Convenciones

- `id INTEGER PRIMARY KEY AUTOINCREMENT`.
- `created_at` / `updated_at`: `TEXT`, `datetime('now')` (UTC). `updated_at` se setea a mano en cada `UPDATE`.
- `deleted_at`: baja lógica. Las lecturas filtran `deleted_at IS NULL`. Es distinto de `status` (narrativo).
- FKs con `ON DELETE RESTRICT` (salvo excepciones marcadas). `foreign_keys` activado en el DSN.
- Enums reforzados con `CHECK` en la base.
- `obsidian_path`: ruta relativa dentro del vault de la campaña. `UNIQUE(campaign_id, obsidian_path)`; permite que el reindex haga upsert.
- `image_path`: ruta relativa dentro de `UPLOADS_ROOT`. Solo se escribe por los endpoints de imagen, nunca por el `PUT` de la entidad ni por el reindex.
- `attributes` / `skills`: JSON libre (`'{}'` por default). Cada sistema de juego define los suyos.
- Tablas puente: PK compuesta, sin `id` ni `deleted_at`.

## Tablas

### campaigns

| Campo            | Notas |
| ---------------- | ----- |
| name, system     | `NOT NULL`. `system` es texto libre ("Cosmere RPG", "D&D 5e") |
| description      | |
| status           | `active` \| `paused` \| `finished` |
| vault_path       | subcarpeta bajo `VAULTS_ROOT`. Única entre campañas activas si no está vacía |
| access_code_hash | bcrypt del código de acceso. Nunca se serializa |
| wardails | markdown libre con los temas sensibles de la campaña. `NOT NULL DEFAULT ''` |

### arcs

| Campo         | Notas |
| ------------- | ----- |
| title         | |
| order         | número de arco |
| subarc_order  | `NULL` en el arco principal; 1, 2… en subarcos (comparten `order`) |
| status        | `planificado` \| `en_curso` \| `cerrado` |
| summary       | |
| obsidian_path | único por campaña cuando no es `NULL` (índice parcial) |

### sessions

| Campo          | Notas |
| -------------- | ----- |
| arc_id         | opcional |
| session_number | admite `0` |
| sub_number     | default `0`; interludios (4.1 → `4`, `1`). `99` marca sesiones archivadas |
| session_type   | `session` \| `interlude` \| `planning` |
| date           | `YYYY-MM-DD` |
| summary        | |
| prep_notes     | solo dashboard |
| obsidian_path  | |

`UNIQUE(campaign_id, session_number, sub_number)`. `sub_number` es `0` y no `NULL` porque SQLite no compara `NULL` en un `UNIQUE`.

### locations

| Campo              | Notas |
| ------------------ | ----- |
| name               | |
| location_type      | `planet` \| `region` \| `city` \| `site` \| `plane` |
| parent_location_id | opcional, self-FK |
| description, notes | |
| obsidian_path      | |
| image_path         | |

### npcs

| Campo              | Notas |
| ------------------ | ----- |
| name               | |
| npc_kind           | `npc` \| `spren` \| `entidad-cognitiva` \| `referencia` |
| detail_level       | `full` \| `minor` |
| status             | `vivo` \| `muerto` \| `desaparecido` \| `activo` \| `consolidado` \| `paused` |
| location_id        | ubicación actual, opcional |
| etnia, rol, tipo_spren | opcionales |
| description, notes | |
| attributes, skills | JSON |
| obsidian_path      | |
| image_path         | |

### player_characters

| Campo              | Notas |
| ------------------ | ----- |
| player_name        | persona real |
| character_name     | |
| race, class        | texto libre; `class` solo dashboard |
| status             | `vivo` \| `muerto` \| `desaparecido` \| `activo` (default) |
| spren_npc_id       | opcional, solo reindex |
| backstory, progression_notes | solo dashboard |
| attributes, skills | JSON |
| current_hp, max_hp | opcionales; persisten entre combates |
| obsidian_path      | |
| historia_path, avances_path | rutas a `Historia.md` / `Avances.md`, solo reindex |
| image_path         | |

### groups

| Campo              | Notas |
| ------------------ | ----- |
| name               | |
| description, notes | |
| alineacion         | texto libre |
| lider_npc_id       | opcional, `ON DELETE SET NULL` |
| obsidian_path      | |
| image_path         | |

`member_count` no es columna: se calcula sobre `npc_groups`.

### quests

| Campo       | Notas |
| ----------- | ----- |
| title       | |
| description, notes | |
| status      | `active` \| `completed` \| `failed` \| `on_hold` |
| priority    | opcional |

Sin `obsidian_path`: las quests viven solo en la DB.

### encounters

| Campo      | Notas |
| ---------- | ----- |
| session_id | opcional |
| round      | default `1` |
| status     | `planificado` (default) \| `activo` \| `cerrado` |

### encounter_participants

| Campo              | Notas |
| ------------------ | ----- |
| encounter_id       | |
| pc_id / npc_id / display_name | a lo sumo uno (`CHECK`). `display_name` = enemigo sin entidad |
| current_hp, max_hp | para PJs, el cliente sincroniza con `player_characters` |
| initiative_value   | D&D: orden numérico |
| turn_type          | Cosmere: `rapido` \| `lento` |
| notes              | |
| attributes, skills | JSON; solo para enemigos sin entidad |

### auth_sessions

| Campo       | Notas |
| ----------- | ----- |
| campaign_id | `ON DELETE CASCADE` |
| token_hash  | SHA-256 del token de la cookie, único |
| expires_at  | 24 h |

### vault_file_state

PK `(campaign_id, path)`. Guarda `content_hash` (SHA-256), `entity_type`, `entity_id` e `indexed_at` de cada nota indexada. El reindex saltea notas cuyo hash no cambió.

## Tablas puente

```sql
npc_groups     (npc_id, group_id, role_in_group, source)   PK (npc_id, group_id)
pc_groups      (pc_id, group_id, role_in_group, source)    PK (pc_id, group_id)
npc_relations  (from_npc_id, to_npc_id, role)              PK (from_npc_id, to_npc_id, role)
session_npcs   (session_id, npc_id)                        PK (session_id, npc_id)
session_pcs    (session_id, pc_id)                         PK (session_id, pc_id)
session_quests (session_id, quest_id)                      PK (session_id, quest_id)
quest_npcs     (quest_id, npc_id)                          PK (quest_id, npc_id)
```

`source` (`npc_groups`, `pc_groups`): `vault` | `dashboard` (default) | `removed`.

- El reindex solo borra y reescribe filas `vault`.
- Si el vault confirma una fila `dashboard`, pasa a `vault`; una `removed` sigue `removed`.
- Sacar un miembro desde el dashboard pone `removed` (no borra), así el reindex no lo revive.
- Las lecturas filtran `source != 'removed'`.

`npc_relations` es dirigida: A → B con rol "ACREEDOR" no implica B → A.
