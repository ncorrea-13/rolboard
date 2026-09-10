# Modelo de Datos

## Alcance del MVP (núcleo)

Entidades confirmadas para la primera versión.

El tracker de combate (`encounters`/`encounter_participants`) **entró como vista de control personal del DM**, no como feature compartida con jugadores (ver `DECISIONS.md`).

El grafo de relaciones NPC↔NPC (odios, alianzas informales, "ACREEDOR DE", etc.) **sí entró al MVP** (tabla `npc_relations`, ver más abajo) — reemplaza a `vinculo_con` como única relación con rol libre en vez de un campo fijo.

## Diagrama de entidades

```
campaigns
├── arcs (1:N)
│   └── sessions (1:N, opcional — arc_id nullable)
├── groups (1:N)
├── locations (1:N, jerárquico vía parent_location_id)
├── npcs (1:N)
├── player_characters (1:N)
├── quests (1:N)
└── encounters (1:N)
    └── encounter_participants (1:N, referencia opcional a npc o player_character)

-- Relaciones many-to-many
npc_groups        (npc ↔ group, con role_in_group)
npc_relations     (npc ↔ npc, dirigida, con role)
quest_npcs        (quest ↔ npc)
session_npcs      (session ↔ npc)
session_pcs       (session ↔ player_character)
session_quests    (session ↔ quest)
```

## Convenciones transversales

Aplican a **todas** las tablas de entidad (no a las tablas puente, ver más abajo).

- **`id`**: `INTEGER PRIMARY KEY AUTOINCREMENT`.
- **`created_at` / `updated_at`**: `TEXT NOT NULL`, formato ISO 8601 vía `datetime('now')` de SQLite (UTC, `YYYY-MM-DD HH:MM:SS`). Elegido por legibilidad al inspeccionar la DB a mano (`sqlite3 campaign.db`) — con el volumen de este proyecto, la diferencia de performance contra `INTEGER` epoch es irrelevante.
  - **Gotcha a tener presente en el código Go**: el `DEFAULT (datetime('now'))` solo aplica en `INSERT`. En cada `UPDATE` hay que setear `updated_at = datetime('now')` explícito en la query — SQLite no lo actualiza solo, no hay trigger.
- **`deleted_at`**: `TEXT NULL`, default `NULL`. Baja lógica — ninguna entidad se borra físicamente por default. Los queries de lectura normales filtran `WHERE deleted_at IS NULL`. Distinto del campo `status` (que es narrativo: vivo/muerto/activo, etc.) — son conceptos separados aunque a veces coincidan.
- **Foreign keys → `ON DELETE RESTRICT`**: el borrado físico (excepcional, ej. purgar una fila cargada por error) está bloqueado mientras exista otra fila que la referencie, sea la FK nullable o no. Requiere `PRAGMA foreign_keys = ON` en cada conexión SQLite (apagado por default) — se configura en el DSN del driver `modernc.org/sqlite` al abrir la conexión en Go.
- **Campos enum-like reforzados con `CHECK`**: en vez de dejarlos como `TEXT` libre validado solo del lado Go, se refuerzan en la base para no depender de que todo el acceso pase por el código de la app.

## Tablas

### campaigns

| Campo       | Tipo    | Notas                                             |
| ----------- | ------- | -------------------------------------------------- |
| id          | PK      |                                                     |
| name        | TEXT    | NOT NULL                                           |
| system      | TEXT    | NOT NULL — ej. "Cosmere RPG", "D&D 5e"             |
| description | TEXT    | NOT NULL DEFAULT ''                                |
| status      | TEXT    | NOT NULL DEFAULT 'active', `CHECK IN ('active','paused','finished')` |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

### arcs

Agrupa sesiones en tramos narrativos (ej. "Arco 2 - Shadesmar").

| Campo        | Tipo           | Notas                              |
| ------------ | -------------- | ----------------------------------- |
| id           | PK             |                                     |
| campaign_id  | FK → campaigns | NOT NULL, `ON DELETE RESTRICT`      |
| title        | TEXT           | NOT NULL                           |
| order        | INTEGER        | NOT NULL — número de arco (1, 2, 3...) |
| status       | TEXT           | NOT NULL DEFAULT 'planificado', `CHECK IN ('planificado','en_curso','cerrado')` |
| subarc_order | INTEGER        | nullable — `NULL` en el arco principal, 1/2/3... en sus subarcos (comparten el mismo `order` que el arco principal, ver `docs/DECISIONS.md`) |
| summary      | TEXT           | NOT NULL DEFAULT ''                |
| obsidian_path | TEXT, nullable | ver sección `obsidian_path` |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

`UNIQUE(campaign_id, obsidian_path) WHERE obsidian_path IS NOT NULL` (índice parcial, no constraint de tabla como en npcs/locations/groups — deja crear arcos manuales desde el dashboard sin `obsidian_path` sin que choquen entre sí).

### sessions

| Campo          | Tipo                    | Notas                                                          |
| -------------- | ----------------------- | ---------------------------------------------------------------- |
| id             | PK                      |                                                                   |
| campaign_id    | FK → campaigns          | NOT NULL, `ON DELETE RESTRICT`                                  |
| arc_id         | FK → arcs, **nullable** | `ON DELETE RESTRICT` — sesiones de planificación sin arco todavía |
| session_number | INTEGER                 | NOT NULL, admite `0` (sesión introductoria)                     |
| sub_number     | INTEGER                 | NOT NULL DEFAULT `0` — interludios (sesión 4 → interludio 4.1). `0` = "no es interludio" (ver nota) |
| session_type   | TEXT                    | NOT NULL, `CHECK IN ('session','interlude','planning')`         |
| date           | TEXT                    | ISO 8601 (`YYYY-MM-DD`), NOT NULL                                |
| summary        | TEXT                    | NOT NULL DEFAULT ''                                              |
| prep_notes     | TEXT                    | NOT NULL DEFAULT '' — notas de preparación, dashboard-only (migración `0008_sessions_prep_notes.sql`) |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

`UNIQUE(campaign_id, session_number, sub_number)`.

`session_npcs`/`session_quests` tienen endpoints de escritura propios (mismo patrón que `npc_relations`): `GET/POST /api/sessions/:id/npcs`, `DELETE /api/sessions/:id/npcs/:npcId`, y análogo para `/quests`. `session_npcs` lo puede escribir tanto el dashboard (preparación, antes de jugar) como el indexer (wikilinks reales del body, que pisan lo anterior en cada reindex — ver `docs/DECISIONS.md`); `session_quests` es 100% dashboard, el indexer nunca lo toca.

> **Nota**: `sub_number` se define `NOT NULL DEFAULT 0` en vez de `NULL` a propósito — SQLite trata cada `NULL` como distinto dentro de un `UNIQUE`, así que dos sesiones normales con `sub_number NULL` no chocarían entre sí y el constraint no protegería nada. Con `0` como valor "no aplica", el `UNIQUE` compuesto funciona de verdad.

### groups

Facciones/organizaciones — entidad completa desde el MVP (no un campo de texto en NPC), porque en el vault real las facciones tienen su propia nota y NPCs de sobra que las referencian.

| Campo       | Tipo           | Notas                           |
| ----------- | -------------- | -------------------------------- |
| id          | PK             |                                  |
| campaign_id | FK → campaigns | NOT NULL, `ON DELETE RESTRICT`  |
| name        | TEXT           | NOT NULL                        |
| description | TEXT           | NOT NULL DEFAULT ''             |
| notes       | TEXT           | NOT NULL DEFAULT ''             |
| alineacion  | TEXT           | NOT NULL DEFAULT '' — texto libre, no enum (el vault real tiene valores como "Neutral — no intervención externa", no calzan en 3-4 categorías fijas) |
| lider_npc_id | FK → npcs, nullable | `ON DELETE SET NULL` — resuelto por el indexer desde el wikilink `lider` del frontmatter |
| obsidian_path | TEXT, nullable | ver sección `obsidian_path`   |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

`UNIQUE(campaign_id, obsidian_path)`.

> Nota de implementación: `miembros_conocidos` (grupo → NPCs) **no se guarda como campo propio** — se calcula con una query sobre `npc_groups`, poblada desde el campo `groups`/`faccion` del **NPC**. Evita duplicar la misma relación en dos lugares (ver `VAULT_INDEXER.md`). Lo mismo aplica a `member_count`: no es columna, es `COUNT(*)` sobre `npc_groups` calculado en el `SELECT` de `List`/`GetByID`, expuesto en el JSON de respuesta pero no persistido.
>
> `astilla`/`investidura` del frontmatter siguen sin columna — decisión explícita, no agregar sin que haga falta de verdad.

### locations

Jerárquica (planeta → región → ciudad → sitio puntual), vía self-join.

| Campo               | Tipo                            | Notas                                       |
| ------------------- | -------------------------------- | --------------------------------------------- |
| id                  | PK                               |                                               |
| campaign_id         | FK → campaigns                   | NOT NULL, `ON DELETE RESTRICT`               |
| name                | TEXT                              | NOT NULL                                     |
| location_type       | TEXT                              | NOT NULL, `CHECK IN ('planet','region','city','site','plane')` |
| parent_location_id  | FK → locations, self, **nullable** | `ON DELETE RESTRICT`                       |
| description         | TEXT                              | NOT NULL DEFAULT ''                          |
| notes               | TEXT                              | NOT NULL DEFAULT ''                          |
| obsidian_path       | TEXT, nullable                    | ver sección `obsidian_path`                  |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

`UNIQUE(campaign_id, obsidian_path)`.

### npcs

| Campo          | Tipo                      | Notas                                                                                    |
| -------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| id             | PK                        |                                                                                              |
| campaign_id    | FK → campaigns            | NOT NULL, `ON DELETE RESTRICT`                                                              |
| name           | TEXT                      | NOT NULL                                                                                     |
| npc_kind       | TEXT                      | NOT NULL, `CHECK IN ('npc','spren','entidad-cognitiva','referencia')` (valores reales del vault) |
| detail_level   | TEXT                      | NOT NULL, `CHECK IN ('full','minor')` — para NPCs sin ficha completa                        |
| status         | TEXT                      | NOT NULL, `CHECK IN ('vivo','muerto','desaparecido','activo','consolidado','paused')`        |
| location_id    | FK → locations, nullable  | `ON DELETE RESTRICT` — ubicación actual                                                     |
| etnia          | TEXT, nullable            |                                                                                              |
| rol            | TEXT, nullable            |                                                                                              |
| tipo_spren     | TEXT, nullable            | solo aplica si `npc_kind = 'spren'`                                                         |
| description    | TEXT                      | NOT NULL DEFAULT ''                                                                          |
| notes          | TEXT                      | NOT NULL DEFAULT ''                                                                          |
| attributes     | TEXT (JSON)               | NOT NULL DEFAULT `'{}'` — build mecánico opcional; solo se completa en NPCs con `detail_level='full'` ("falsos jugadores"), sin `CHECK` (ver nota multi-sistema abajo) |
| skills         | TEXT (JSON)               | NOT NULL DEFAULT `'{}'` — mismo criterio que `attributes`                                    |
| obsidian_path  | TEXT, nullable            | ver sección `obsidian_path`                                                                  |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

`UNIQUE(campaign_id, obsidian_path)`.

> Nota de implementación: los vínculos con otros NPCs (spren↔portador, deudas, alianzas, lo que antes vivía en `vinculo_con`) **no son un campo propio** — viven en `npc_relations` (ver tablas puente). El vault solo puebla una relación fija por nota (`role = "vinculado_a"`, desde el campo `vinculo_con` del frontmatter); cualquier otra relación con rol libre se crea/edita solo desde el dashboard, nunca desde el vault (mismo patrón que `quest_npcs`/`session_quests`, ver `AGENTS.md`).

### player_characters

Distinto de `npcs` — representa al personaje jugado por una persona real.

| Campo             | Tipo           | Notas                  |
| ------------------ | -------------- | ------------------------ |
| id                 | PK             |                          |
| campaign_id        | FK → campaigns | NOT NULL, `ON DELETE RESTRICT` |
| player_name        | TEXT           | NOT NULL — nombre del jugador IRL |
| character_name     | TEXT           | NOT NULL — nombre del PJ |
| race               | TEXT           | NOT NULL DEFAULT ''     |
| class              | TEXT           | NOT NULL DEFAULT '' — dashboard-only, sin backing en el vault, texto libre sin enum |
| status             | TEXT           | NOT NULL DEFAULT 'activo', `CHECK IN ('vivo','muerto','desaparecido','activo')` |
| spren_npc_id       | FK → npcs, nullable | `ON DELETE RESTRICT` — indexer-only, no viaja por PUT del dashboard |
| backstory          | TEXT           | NOT NULL DEFAULT ''     |
| progression_notes  | TEXT           | NOT NULL DEFAULT ''     |
| attributes         | TEXT (JSON)    | NOT NULL DEFAULT `'{}'` — build mecánico del PJ, mismo shape que `npcs.attributes` (ver nota multi-sistema abajo) |
| skills             | TEXT (JSON)    | NOT NULL DEFAULT `'{}'` — mismo criterio que `attributes`                                     |
| obsidian_path      | TEXT, nullable | ver sección `obsidian_path` |
| historia_path      | TEXT, nullable | ruta a la nota `Historia.md` de la carpeta del jugador — resuelta por el indexer vía el campo `personaje` de esa nota, indexer-only |
| avances_path       | TEXT, nullable | ruta a la nota `Avances.md`, mismo mecanismo que `historia_path` |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

`UNIQUE(campaign_id, obsidian_path)`. Tabla `pc_groups` (pc_id, group_id, role_in_group) — facción del personaje, mismo patrón que `npc_groups`.

> **Nota multi-sistema (`attributes`/`skills`)**: `campaign.system` es texto libre ("Cosmere RPG", "D&D 5e", etc.) y cada sistema define sus propios atributos/habilidades (Cosmere: Velocidad, Fuerza, Voluntad...; D&D: Fuerza, Destreza, Constitución...). No hay tabla de catálogo de atributos/habilidades ni `CHECK` — mismo trato que `class` (ver `DECISIONS.md`): JSON libre, validado del lado de la UI si hace falta, no en la base. Se elige JSON en vez de tablas normalizadas porque no hay caso de uso hoy que necesite `JOIN`/filtrar por atributo individual entre personajes; si aparece, se migra a tabla en ese momento.

### encounters

Tracker de combate — vista de control personal del DM, no compartida con jugadores (ver `DECISIONS.md`). Vive fuera del flujo narrativo del vault: no tiene `obsidian_path`, no lo indexa `vault/`.

| Campo       | Tipo           | Notas                                             |
| ----------- | -------------- | -------------------------------------------------- |
| id          | PK             |                                                     |
| campaign_id | FK → campaigns | NOT NULL, `ON DELETE RESTRICT`                     |
| session_id  | FK → sessions, nullable | `ON DELETE RESTRICT` — combate puede armarse sin sesión asociada todavía |
| round       | INTEGER        | NOT NULL DEFAULT 1                                 |
| status      | TEXT           | NOT NULL DEFAULT 'activo', `CHECK IN ('activo','cerrado')` |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

### encounter_participants

Una fila por combatiente en un encuentro. Puede referenciar un PJ, un NPC con ficha, o ser un enemigo genérico sin entidad propia (`display_name` suelto) — evita crear NPCs basura para enemigos de un solo uso.

| Campo             | Tipo                    | Notas                                                                 |
| ------------------ | ----------------------- | ------------------------------------------------------------------------ |
| id                 | PK                      |                                                                            |
| encounter_id       | FK → encounters         | NOT NULL, `ON DELETE RESTRICT`                                            |
| pc_id              | FK → player_characters, nullable | `ON DELETE RESTRICT` — si es PJ                                  |
| npc_id             | FK → npcs, nullable     | `ON DELETE RESTRICT` — si es NPC con ficha propia                        |
| display_name       | TEXT, nullable          | nombre libre para enemigos ad-hoc sin `npc_id`                           |
| current_hp         | INTEGER, nullable       | PJ: se sincroniza contra vida persistente del PJ (ver nota abajo). NPC: efímero, vive solo acá |
| max_hp             | INTEGER, nullable       | valor de referencia, opcional                                            |
| initiative_value   | INTEGER, nullable       | **D&D**: número fijo por combate, se ordena la lista desc               |
| turn_type          | TEXT, nullable          | **Cosmere**: `CHECK IN ('rapido','lento')`, se reedita cada ronda — no hay orden numérico, el front agrupa por fase (PJ rápido → PNJ rápido → PJ lento → PNJ lento) |
| notes              | TEXT                    | NOT NULL DEFAULT ''                                                       |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

> **Nota HP persistente vs efímero**: la vida de un PJ persiste entre sesiones/combates (vive en `player_characters`, no acá — pendiente agregar esa columna cuando se implemente esa parte). La vida de un NPC es efímera por default: se define en el momento del encuentro y se descarta al cerrarlo, salvo NPCs prepped (`detail_level='full'`) que pueden traer un `max_hp` de referencia desde su ficha.

### quests

| Campo       | Tipo              | Notas                                              |
| ----------- | ------------------ | ---------------------------------------------------- |
| id          | PK                 |                                                       |
| campaign_id | FK → campaigns     | NOT NULL, `ON DELETE RESTRICT`                       |
| title       | TEXT               | NOT NULL                                             |
| description | TEXT               | NOT NULL DEFAULT ''                                  |
| status      | TEXT               | NOT NULL, `CHECK IN ('active','completed','failed','on_hold')` |
| priority    | INTEGER, nullable  |                                                       |
| notes       | TEXT               | NOT NULL DEFAULT ''                                  |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

## Campo transversal: `obsidian_path`

Tablas con esta columna: `npcs`, `locations`, `groups`, `sessions`, `player_characters`, `arcs`. `campaigns` no lo tiene — es la raíz, no una nota individual del vault. `quests` tampoco — no tiene nota propia en Obsidian (ver `DECISIONS.md`).

```
obsidian_path   -- ruta relativa DENTRO del vault, ej. "NPC/Humanos/Adolin.md"
```

`UNIQUE(campaign_id, obsidian_path)` — no único global, la ruta tiene sentido dentro del scope de su campaña/vault. Root del vault y armado de links: ver `VAULT_INDEXER.md`.

## Tablas puente (many-to-many)

A diferencia de las tablas de entidad, **no llevan `deleted_at`**: la relación existe o no existe, borrar una fila acá es un `DELETE` físico normal (quitar a un NPC de un grupo no es una "pérdida de historia" como sí lo sería borrar al NPC). Tampoco llevan `id` propio — la PK es compuesta, estándar para many-to-many puro sin atributos que necesiten ser referenciados desde otro lado.

```sql
npc_groups     (npc_id FK, group_id FK, role_in_group TEXT,          PRIMARY KEY (npc_id, group_id))
npc_relations  (from_npc_id FK, to_npc_id FK, role TEXT NOT NULL,    PRIMARY KEY (from_npc_id, to_npc_id, role))
quest_npcs     (quest_id FK, npc_id FK,                              PRIMARY KEY (quest_id, npc_id))
session_npcs   (session_id FK, npc_id FK,                            PRIMARY KEY (session_id, npc_id))
session_pcs    (session_id FK, pc_id FK,                             PRIMARY KEY (session_id, pc_id))
session_quests (session_id FK, quest_id FK,                          PRIMARY KEY (session_id, quest_id))
```

`npc_relations` es **dirigida**, no simétrica: `role` describe la relación desde `from_npc_id` hacia `to_npc_id` (ej. "ACREEDOR" de A hacia B no implica una fila inversa "LE DEBE A" de B hacia A — si esa relación también es real narrativamente, es una segunda fila explícita). `PRIMARY KEY` incluye `role` porque un mismo par de NPCs puede tener más de un tipo de vínculo a la vez.

Todas las FKs de las tablas puente: `ON DELETE RESTRICT`.

## Índices (fase posterior, no bloqueante para el MVP)

SQLite indexa automático la PK y cualquier `UNIQUE` — pero NO las foreign keys comunes (ej. `npcs.campaign_id`). Con el volumen actual (~166 entidades) un table scan es instantáneo, así que esto no es prioridad para las primeras migraciones. Cuando el vault crezca, agregar:

```sql
CREATE INDEX idx_<tabla>_campaign_id ON <tabla>(campaign_id);
-- + una por cada FK que no sea parte de un UNIQUE ya existente
```

## Decisiones de diseño relevantes

- **`location_id` directo en `npcs`** en vez de forzar el grafo completo de relaciones desde el MVP — cubre gran parte del valor de "pantallazo" con poco esfuerzo.
- **`parent_location_id` autoreferencial** en vez de una tabla de jerarquía aparte — alcanza con un self-join para modelar contención geográfica.
- **`npc_relations` como tabla puente dirigida con rol libre** — reemplaza al `vinculo_con` autoreferencial original en `npcs` (una sola relación fija) para cubrir el grafo completo de vínculos NPC↔NPC (spren↔portador, deudas, alianzas, odios) sin forzarlos a texto libre suelto en `notes`.
- **Grupos como entidad completa desde el MVP** (decisión explícita, confirmada por el usuario) — justificada por el volumen real de grupos y menciones cruzadas en el vault (23 grupos, con NPCs de sobra referenciando membresía).
- **PCs en el núcleo del MVP** (decisión explícita, confirmada por el usuario) — los personajes jugadores son protagonistas, no un detalle secundario.
- **Baja lógica + `ON DELETE RESTRICT`** en vez de `CASCADE` — perder datos de campaña por accidente (borrar una location y que se lleve puesto todo lo que la referenciaba) es peor que tener que desvincular a mano.
