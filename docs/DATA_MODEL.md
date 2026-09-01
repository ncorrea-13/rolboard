# Modelo de Datos

## Alcance del MVP (núcleo)

Entidades confirmadas para la primera versión. Quedan **fuera** del MVP: grafo de relaciones NPC↔NPC (odios, alianzas informales), mapa interactivo, tracker de combate en vivo — todo eso es capa 2/3, ver `decisiones.md`.

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
npc_groups        (npc ↔ group, con rol_en_el_grupo)
quest_npcs        (quest ↔ npc)
session_npcs      (session ↔ npc)
session_pcs       (session ↔ player_character)
session_quests    (session ↔ quest)
```

## Tablas

### campaigns

| Campo                  | Tipo      | Notas                        |
| ---------------------- | --------- | ---------------------------- |
| id                     | PK        |                              |
| name                   | text      |                              |
| system                 | text      | ej. "Cosmere RPG", "D&D 5e"  |
| description            | text      |                              |
| status                 | text      | active \| paused \| finished |
| created_at, updated_at | timestamp |                              |

### arcs

Agrupa sesiones en tramos narrativos (ej. "Arco 2 - Shadesmar").

| Campo                  | Tipo           | Notas           |
| ---------------------- | -------------- | --------------- |
| id                     | PK             |                 |
| campaign_id            | FK → campaigns |                 |
| title                  | text           |                 |
| order                  | integer        | para ordenarlos |
| summary                | text           |                 |
| created_at, updated_at | timestamp      |                 |

### sessions

| Campo                  | Tipo                    | Notas                                                    |
| ---------------------- | ----------------------- | -------------------------------------------------------- |
| id                     | PK                      |                                                          |
| campaign_id            | FK → campaigns          |                                                          |
| arc_id                 | FK → arcs, **nullable** | sesiones de planificación pueden no pertenecer a un arco |
| session_number         | integer                 | admite `0` (sesión introductoria)                        |
| sub_number             | integer, nullable       | para interludios (ej. sesión 4 → interludio 4.1)         |
| session_type           | text                    | session \| interlude \| planning                         |
| date                   | date (ISO 8601)         |                                                          |
| summary                | text                    |                                                          |
| created_at, updated_at | timestamp               |                                                          |

### groups

Facciones/organizaciones — entidad completa desde el MVP (no un campo de texto en NPC), porque en el vault real las facciones tienen su propia nota y NPCs de sobra que las referencian.

| Campo                  | Tipo           | Notas |
| ---------------------- | -------------- | ----- |
| id                     | PK             |       |
| campaign_id            | FK → campaigns |       |
| name                   | text           |       |
| description            | text           |       |
| notes                  | text           |       |
| created_at, updated_at | timestamp      |       |

> Nota de implementación: `miembros_conocidos` (grupo → NPCs) **no se guarda como campo propio** — se calcula con una query sobre `npc_groups`, poblada desde el campo `groups`/`faccion` del **NPC**. Evita duplicar la misma relación en dos lugares (ver `vault-indexador.md`).

### locations

Jerárquica (planeta → región → ciudad → sitio puntual), vía self-join.

| Campo                  | Tipo                           | Notas                                     |
| ---------------------- | ------------------------------ | ----------------------------------------- |
| id                     | PK                             |                                           |
| campaign_id            | FK → campaigns                 |                                           |
| name                   | text                           |                                           |
| location_type          | text                           | planet \| region \| city \| site \| plane |
| parent_location_id     | FK → locations, self, nullable |                                           |
| description            | text                           |                                           |
| notes                  | text                           |                                           |
| created_at, updated_at | timestamp                      |                                           |

### npcs

| Campo                  | Tipo                     | Notas                                                                                    |
| ---------------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| id                     | PK                       |                                                                                          |
| campaign_id            | FK → campaigns           |                                                                                          |
| name                   | text                     |                                                                                          |
| npc_kind               | text                     | npc \| spren \| entidad-cognitiva \| referencia (valores reales del vault, no genéricos) |
| detail_level           | text                     | full \| minor — para NPCs sin ficha completa                                             |
| status                 | text                     | vivo \| muerto \| desaparecido \| activo \| consolidado                                  |
| location_id            | FK → locations, nullable | ubicación actual                                                                         |
| etnia                  | text, nullable           |                                                                                          |
| rol                    | text, nullable           |                                                                                          |
| vinculo_con            | text/FK, nullable        | relevante para spren: quién los vincula                                                  |
| tipo_spren             | text, nullable           | solo aplica si npc_kind = spren                                                          |
| description            | text                     |                                                                                          |
| notes                  | text                     |                                                                                          |
| created_at, updated_at | timestamp                |                                                                                          |

### player_characters

Distinto de `npcs` — representa al personaje jugado por una persona real.

| Campo                  | Tipo           | Notas                  |
| ---------------------- | -------------- | ---------------------- |
| id                     | PK             |                        |
| campaign_id            | FK → campaigns |                        |
| player_name            | text           | nombre del jugador IRL |
| character_name         | text           | nombre del PJ          |
| backstory              | text           |                        |
| progression_notes      | text           |                        |
| created_at, updated_at | timestamp      |                        |

### quests

| Campo                  | Tipo              | Notas                                    |
| ---------------------- | ----------------- | ---------------------------------------- |
| id                     | PK                |                                          |
| campaign_id            | FK → campaigns    |                                          |
| title                  | text              |                                          |
| description            | text              |                                          |
| status                 | text              | active \| completed \| failed \| on_hold |
| priority               | integer, nullable |                                          |
| notes                  | text              |                                          |
| created_at, updated_at | timestamp         |                                          |

## Campo transversal: `obsidian_path`

Todas las entidades indexables desde el vault (npcs, locations, groups, sessions, player_characters, arcs) tienen un campo:

```
obsidian_path   -- ruta relativa dentro del vault, ej. "NPC/Humanos/Adolin.md"
```

A partir de esa única ruta, el backend arma en tiempo de respuesta:

- **Link de apertura en Obsidian**: `obsidian://open?vault=<nombre>&file=<ruta>` (el nombre del vault es config del servidor, no un campo de la base)
- **Link de render server-side**: `GET /api/notes/render?path=<ruta>`

Ver `vault-indexador.md` y `api.md` para el detalle de cada uno.

## Tablas puente (many-to-many)

```sql
npc_groups     (npc_id FK, group_id FK, role_in_group text)
quest_npcs     (quest_id FK, npc_id FK)
session_npcs   (session_id FK, npc_id FK)
session_pcs    (session_id FK, pc_id FK)
session_quests (session_id FK, quest_id FK)
```

## Decisiones de diseño relevantes

- **`location_id` directo en `npcs`** en vez de forzar el grafo completo de relaciones desde el MVP — cubre gran parte del valor de "pantallazo" con poco esfuerzo.
- **`parent_location_id` autoreferencial** en vez de una tabla de jerarquía aparte — alcanza con un self-join para modelar contención geográfica.
- **Grupos como entidad completa desde el MVP** (decisión explícita, confirmada por el usuario) — justificada por el volumen real de grupos y menciones cruzadas en el vault (23 grupos, con NPCs de sobra referenciando membresía).
- **PCs en el núcleo del MVP** (decisión explícita, confirmada por el usuario) — los personajes jugadores son protagonistas, no un detalle secundario.
