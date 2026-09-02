# Modelo de Datos

## Alcance del MVP (núcleo)

Entidades confirmadas para la primera versión. Quedan **fuera** del MVP: grafo de relaciones NPC↔NPC (odios, alianzas informales), mapa interactivo, tracker de combate en vivo — todo eso es capa 2/3, ver `DECISIONS.md`.

## Diagrama de entidades

```
campaigns
├── arcs (1:N)
│   └── sessions (1:N, opcional — arc_id nullable)
├── groups (1:N)
├── locations (1:N, jerárquico vía parent_location_id)
├── npcs (1:N)
├── player_characters (1:N)
└── quests (1:N)

-- Relaciones many-to-many
npc_groups        (npc ↔ group, con role_in_group)
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

| Campo       | Tipo           | Notas                              |
| ----------- | -------------- | ----------------------------------- |
| id          | PK             |                                     |
| campaign_id | FK → campaigns | NOT NULL, `ON DELETE RESTRICT`      |
| title       | TEXT           | NOT NULL                           |
| order       | INTEGER        | NOT NULL — para ordenarlos         |
| summary     | TEXT           | NOT NULL DEFAULT ''                |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

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
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

`UNIQUE(campaign_id, session_number, sub_number)`.

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
| obsidian_path | TEXT, nullable | ver sección `obsidian_path`   |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

`UNIQUE(campaign_id, obsidian_path)`.

> Nota de implementación: `miembros_conocidos` (grupo → NPCs) **no se guarda como campo propio** — se calcula con una query sobre `npc_groups`, poblada desde el campo `groups`/`faccion` del **NPC**. Evita duplicar la misma relación en dos lugares (ver `VAULT_INDEXER.md`).

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
| status         | TEXT                      | NOT NULL, `CHECK IN ('vivo','muerto','desaparecido','activo','consolidado')`                |
| location_id    | FK → locations, nullable  | `ON DELETE RESTRICT` — ubicación actual                                                     |
| etnia          | TEXT, nullable            |                                                                                              |
| rol            | TEXT, nullable            |                                                                                              |
| vinculo_con    | FK → npcs, self, nullable | `ON DELETE RESTRICT` — relevante para spren: a qué NPC están vinculados                     |
| tipo_spren     | TEXT, nullable            | solo aplica si `npc_kind = 'spren'`                                                         |
| description    | TEXT                      | NOT NULL DEFAULT ''                                                                          |
| notes          | TEXT                      | NOT NULL DEFAULT ''                                                                          |
| obsidian_path  | TEXT, nullable            | ver sección `obsidian_path`                                                                  |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

`UNIQUE(campaign_id, obsidian_path)`.

### player_characters

Distinto de `npcs` — representa al personaje jugado por una persona real.

| Campo             | Tipo           | Notas                  |
| ------------------ | -------------- | ------------------------ |
| id                 | PK             |                          |
| campaign_id        | FK → campaigns | NOT NULL, `ON DELETE RESTRICT` |
| player_name        | TEXT           | NOT NULL — nombre del jugador IRL |
| character_name     | TEXT           | NOT NULL — nombre del PJ |
| backstory          | TEXT           | NOT NULL DEFAULT ''     |
| progression_notes  | TEXT           | NOT NULL DEFAULT ''     |
| obsidian_path      | TEXT, nullable | ver sección `obsidian_path` |
| created_at, updated_at, deleted_at | — | ver convenciones transversales |

`UNIQUE(campaign_id, obsidian_path)`.

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

Tablas con esta columna: `npcs`, `locations`, `groups`, `sessions` (si aplica), `player_characters`, `arcs` (si aplican notas propias). `campaigns` no lo tiene — es la raíz, no una nota individual del vault.

```
obsidian_path   -- ruta relativa DENTRO del vault, ej. "NPC/Humanos/Adolin.md"
```

- **Alcance de unicidad**: `UNIQUE(campaign_id, obsidian_path)`, no único global — la ruta tiene sentido dentro del scope de su campaña/vault, no entre campañas distintas.
- **Root del vault**: NO se guarda en la base — es config del servidor (env var, ej. `VAULT_PATH`), porque cambia según la máquina (en esta laptop `/home/ncorrea/Documents/Obsidian/Cosmere`, en el ThinkCentre el punto donde Syncthing sincroniza el vault). El código nunca hardcodea esa ruta.

A partir de `obsidian_path`, el backend arma en tiempo de respuesta:

- **Link de apertura en Obsidian**: `obsidian://open?vault=<nombre>&file=<ruta>` (el nombre del vault también es config del servidor).
- **Link de render server-side**: `GET /api/notes/render?path=<ruta>`.

Ver `VAULT_INDEXER.md` y `API.md` para el detalle de cada uno.

## Tablas puente (many-to-many)

A diferencia de las tablas de entidad, **no llevan `deleted_at`**: la relación existe o no existe, borrar una fila acá es un `DELETE` físico normal (quitar a un NPC de un grupo no es una "pérdida de historia" como sí lo sería borrar al NPC). Tampoco llevan `id` propio — la PK es compuesta, estándar para many-to-many puro sin atributos que necesiten ser referenciados desde otro lado.

```sql
npc_groups     (npc_id FK, group_id FK, role_in_group TEXT, PRIMARY KEY (npc_id, group_id))
quest_npcs     (quest_id FK, npc_id FK,                       PRIMARY KEY (quest_id, npc_id))
session_npcs   (session_id FK, npc_id FK,                     PRIMARY KEY (session_id, npc_id))
session_pcs    (session_id FK, pc_id FK,                      PRIMARY KEY (session_id, pc_id))
session_quests (session_id FK, quest_id FK,                   PRIMARY KEY (session_id, quest_id))
```

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
- **`vinculo_con` autoreferencial** en `npcs` — el vínculo relevante (ej. spren↔portador) es siempre con otro NPC modelado, no texto libre.
- **Grupos como entidad completa desde el MVP** (decisión explícita, confirmada por el usuario) — justificada por el volumen real de grupos y menciones cruzadas en el vault (23 grupos, con NPCs de sobra referenciando membresía).
- **PCs en el núcleo del MVP** (decisión explícita, confirmada por el usuario) — los personajes jugadores son protagonistas, no un detalle secundario.
- **Baja lógica + `ON DELETE RESTRICT`** en vez de `CASCADE` — perder datos de campaña por accidente (borrar una location y que se lleve puesto todo lo que la referenciaba) es peor que tener que desvincular a mano.
