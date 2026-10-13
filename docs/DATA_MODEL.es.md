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
quest_npcs      quest ↔ npc        (rol)
```

## Convenciones

- `id INTEGER PRIMARY KEY AUTOINCREMENT`.
- `created_at` / `updated_at`: `TEXT`, `datetime('now')` (UTC). `updated_at` se setea a mano en cada `UPDATE`.
- `deleted_at`: baja lógica. Las lecturas filtran `deleted_at IS NULL`; la pantalla de papelera lee lo contrario. Es distinto de `status` (narrativo).
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
| session_type   | `session` \| `interlude` \| `planning` \| `oneshot` |
| title          | solo oneshots (UI); `''` en el resto |
| planned        | `0`/`1`, solo oneshots: planificado vs jugado. Los demás tipos usan `session_type = 'planning'` |
| date           | `YYYY-MM-DD` |
| summary        | |
| prep_notes     | solo dashboard |
| obsidian_path  | |

Índice único parcial `sessions_active_number_uq` sobre `(campaign_id, session_number, sub_number) WHERE deleted_at IS NULL` (migración 0023): una sesión borrada libera su número, y restaurarla falla con `409` si el número se ocupó mientras tanto. `sub_number` es `0` y no `NULL` porque SQLite no compara `NULL` en un índice único.

### locations

| Campo              | Notas |
| ------------------ | ----- |
| name               | |
| location_type      | `planet` \| `region` \| `city` \| `site` \| `plane` |
| parent_location_id | opcional, self-FK |
| description, notes | |
| obsidian_path      | |
| image_path         | |

### npc_types

| Campo             | Notas |
| ----------------- | ----- |
| campaign_id       | `ON DELETE CASCADE` |
| key               | Derivada de la etiqueta, inmutable. Única por campaña. Coincide con el `tipo` del vault |
| label, color      | Solo visual. `color` es `#rrggbb` |
| position          | Orden de visualización |

### npcs

| Campo              | Notas |
| ------------------ | ----- |
| name               | |
| npc_kind           | key de uno de los `npc_types` de la campaña, o `referencia` (reservado: notas que solo sirven de destino de enlaces) |
| detail_level       | `full` \| `minor` |
| status             | `vivo` \| `muerto` \| `desaparecido` \| `activo` \| `consolidado` \| `paused` |
| location_id        | ubicación actual, opcional |
| origen, rol, subtipo | opcionales, texto libre |
| description, notes | |
| attributes, skills | JSON |
| current_hp, max_hp | opcionales; persisten entre combates |
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
| description, backstory, progression_notes | solo dashboard; el reindex nunca los pisa (ni `class`) |
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

### lore_categories / lore_entries

Lore por campaña. Las categorías siguen el patrón de `npc_types` (`key` derivada del label, `color`, `position`) y se siembran al crear la campaña (la migración 0026 siembra las existentes).

| Campo (`lore_entries`) | Notas |
| ---------------------- | ----- |
| title                  | obligatorio |
| body                   | Markdown |
| category_id            | opcional; una categoría referenciada por alguna entrada (aun borrada) no se puede borrar |
| arc_id, location_id    | opcionales, `ON DELETE RESTRICT` |
| obsidian_path          | reservado para una carpeta `Lore/` del vault a futuro |

### currencies / items y sus bridges

| Tabla | Notas |
| ----- | ----- |
| `currencies` | `name`, `symbol`, `rate_to_base` opcional (> 0), `is_base`. Como máximo una base activa por campaña (índice único parcial) |
| `currency_locations` | dónde circula una moneda |
| `items` | `name`, `description`, `effect` (texto libre), `category`, `rarity` (texto libre), `weight` opcional |
| `item_prices` | `(item_id, currency_id, amount)`: un objeto puede tener precio en varias monedas |
| `pc_items`, `npc_items` | inventario: `quantity` (> 0) y `notes` |
| `location_items` | qué vende una locación, con `notes` |
| `location_item_prices` | precio propio por moneda; FK compuesta a `location_items`. Sin filas rige el precio de catálogo |

### secrets / secret_npcs

Secretos narrativos solo para el DM.

| Campo (`secrets`) | Notas |
| ----------------- | ----- |
| title, body       | title obligatorio; body es Markdown |
| status            | `hidden` \| `revealed`, por defecto `hidden` |
| revealed_session_id | opcional; solo se conserva mientras está `revealed` |
| npc_id, location_id, lore_entry_id | opcionales: de qué trata el secreto |

`secret_npcs (secret_id, npc_id)` lista quién lo conoce. Un NPC dado de baja deja de figurar como que lo conoce (las lecturas filtran las filas borradas).

### timelines / timeline_events

Cronologías del mundo. Una cronología es un carril con color; cada evento pertenece a una sola.

| Campo (`timeline_events`) | Notas |
| ------------------------- | ----- |
| timeline_id               | obligatorio, `ON DELETE RESTRICT` |
| title, description        | title obligatorio; description es Markdown |
| date_label, end_date_label | texto libre para mostrar (cada setting tiene su calendario) |
| sort_key                  | `REAL`, escrito a mano; único criterio de orden |
| arc_id, session_id, location_id, group_id, lore_entry_id | opcionales, de la misma campaña |

`timelines` lleva `name`, `description`, `color`, `start_label` / `end_label` opcionales y `position`. Una cronología con eventos activos no se puede borrar (`409 timeline_in_use`).

### notes

Notas sueltas (`LooseNote` en el código, para no chocar con las notas del vault). Solo dashboard.

| Campo       | Notas |
| ----------- | ----- |
| title       | obligatorio |
| body        | Markdown |
| pending     | `0`/`1`, "pendiente de ubicar"; default `1` |

### encounters

| Campo      | Notas |
| ---------- | ----- |
| name       | opcional; si está vacío la lista muestra `Encuentro #id` |
| session_id | opcional |
| round      | default `1` |
| status     | `planificado` (default) \| `activo` \| `cerrado` |

### encounter_participants

| Campo              | Notas |
| ------------------ | ----- |
| encounter_id       | |
| pc_id / npc_id / display_name | a lo sumo uno (`CHECK`). `display_name` = enemigo sin entidad |
| current_hp, max_hp | para PJs y NPCs, el cliente sincroniza con `player_characters` / `npcs` |
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

PK `(campaign_id, path)`. Guarda `content_hash` (SHA-256), `entity_type`, `entity_id` e `indexed_at` de cada nota indexada. El reindex omite notas cuyo hash no cambió.

## Tablas puente

```sql
npc_groups     (npc_id, group_id, role_in_group, source)   PK (npc_id, group_id)
pc_groups      (pc_id, group_id, role_in_group, source)    PK (pc_id, group_id)
npc_relations  (from_npc_id, to_npc_id, role)              PK (from_npc_id, to_npc_id, role)
session_npcs   (session_id, npc_id)                        PK (session_id, npc_id)
session_pcs    (session_id, pc_id)                         PK (session_id, pc_id)
session_quests (session_id, quest_id)                      PK (session_id, quest_id)
quest_npcs     (quest_id, npc_id, role)                    PK (quest_id, npc_id)
```

`source` (`npc_groups`, `pc_groups`): `vault` | `dashboard` (default) | `removed`.

- El reindex solo borra y reescribe filas `vault`.
- Si el vault confirma una fila `dashboard`, pasa a `vault`; una `removed` sigue `removed`.
- Quitar un miembro desde el dashboard pone `removed` (no borra), así el reindex no lo revive.
- Las lecturas filtran `source != 'removed'`.

`npc_relations` es dirigida: A → B con rol "ACREEDOR" no implica B → A.
