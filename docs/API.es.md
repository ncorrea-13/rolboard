# API

[English](API.md)

REST + JSON bajo `/api`. Router: `net/http` stdlib (`ServeMux` con métodos y path params). Fuente de verdad: `server/internal/handlers/router.go`.

## Convenciones

- Entidades de una campaña se listan y crean bajo `/api/campaigns/{id}/...`; se leen, editan y borran por su propio ID (`/api/npcs/{id}`).
- `DELETE` de entidades es baja lógica (`deleted_at`). Responde `204`.
- `POST` de creación responde `201` con la entidad; `PUT` responde la entidad actualizada.
- Enums inválidos → `400`. Recurso inexistente → `404`.
- Los errores sobre los que la UI puede actuar traen un cuerpo JSON `{"code": "..."}` que el cliente traduce. Cualquier otro error es texto en inglés para los logs, y la UI muestra un mensaje genérico según su estado.

| Estado | `code`                     | Cuándo                                                                    |
| ------ | -------------------------- | ------------------------------------------------------------------------- |
| `409`  | `session_conflict`         | crear, editar o restaurar una sesión cuyo número ya está ocupado          |
| `409`  | `arc_in_use`               | borrar un arco que todavía tiene sesiones activas                         |
| `409`  | `location_in_use`          | borrar una ubicación que todavía tiene NPCs o sub-ubicaciones activas     |
| `409`  | `restore_parent_deleted`   | restaurar un registro cuyo arco o ubicación sigue borrado                 |
| `400`  | `image_unsupported_format` | subir una imagen que no es PNG ni JPEG                                    |
| `400`  | `image_too_large`          | subir una imagen de más de 5 MiB o un formulario inválido                 |

## Autenticación

| Nivel    | Cómo                                   | Cookie                   |
| -------- | -------------------------------------- | ------------------------ |
| Pública  | sin cookie                             | —                        |
| Admin    | `POST /api/admin/login`                | `rolboard_admin_session` |
| Campaña  | `POST /api/campaigns/{id}/login`       | `rolboard_session_<id>`  |

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
PUT    /api/campaigns/{id}/wardails   {"wardails": "..."}   204, máx. 20000 caracteres
DELETE /api/campaigns/{id}     admin
```

Body: `name`, `system`, `description`, `vault_path`, y `status` (`active` | `paused` | `finished`) en `PUT`.

`wardails` es markdown libre con los temas sensibles de la campaña; tiene su propio endpoint para que guardarlo nunca sobrescriba los otros campos. `GET /api/campaigns/{id}` lo devuelve.

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

Body: `arc_id`, `session_number`, `sub_number`, `session_type` (`session` | `interlude` | `planning` | `oneshot`), `title`, `planned` (oneshots), `date`, `summary`, `prep_notes`, `obsidian_path`.

`session_npcs` también lo escribe el reindex (lo reemplaza con los wikilinks del cuerpo de la nota). `session_quests` solo se maneja desde aquí.

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

## Tipos de NPC

Cada campaña define sus propios tipos de NPC (etiqueta, color). Una campaña nueva arranca con tres por defecto (`npc`, `spren`, `entidad-cognitiva`).

```
GET    /api/campaigns/{id}/npc-types
POST   /api/campaigns/{id}/npc-types   {"label": "Monstruo", "color": "#aa3344"}
PUT    /api/npc-types/{id}             {"label": "...", "color": "#rrggbb"}
DELETE /api/npc-types/{id}             409 mientras algún NPC lo use
```

La `key` se deriva de la etiqueta al crear (`Monstruo Élite` → `monstruo-elite`, con `-2`, `-3`… si ya existe) y no cambia nunca: es lo que los NPC guardan en `npc_kind` y lo que el vault escribe en `tipo`. `color` es `#rrggbb`, etiqueta de hasta 40 caracteres.

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
GET    /api/npcs/{id}/players
PUT    /api/npcs/{id}/players/{pcId}           {"role": ""}
DELETE /api/npcs/{id}/players/{pcId}
POST   /api/npcs/{id}/image
DELETE /api/npcs/{id}/image
GET    /api/npcs/{id}/image
```

Body: `name`, `npc_kind` (`npc` | `spren` | `entidad-cognitiva` | `referencia`), `detail_level` (`full` | `minor`), `status` (`vivo` | `muerto` | `desaparecido` | `activo` | `consolidado` | `paused`), `location_id`, `origen`, `rol`, `subtipo`, `description`, `notes`, `attributes`, `skills`, `current_hp`, `max_hp`, `obsidian_path`.

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

Body: `player_name`, `character_name`, `race`, `class`, `status` (`vivo` | `muerto` | `desaparecido` | `activo`), `description`, `backstory`, `progression_notes`, `attributes`, `skills`, `current_hp`, `max_hp`, `obsidian_path`.

`historia_path` y `avances_path` solo los escribe el reindex.

Los vínculos entre un NPC y personajes jugadores (`npc_player_relations`) se listan desde ambos lados: `GET /api/npcs/{id}/players` y `GET /api/player-characters/{id}/npcs`, los dos devuelven `{npc_id, player_character_id, role}`. `PUT` crea el vínculo o actualiza su `role`; `DELETE` lo quita (el próximo reindex no lo trae de vuelta).

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

Lista y detalle incluyen `member_count` (calculado). Quitar un miembro es baja lógica (`source = 'removed'`) para que el reindex no lo vuelva a agregar.

## Quests

```
GET    /api/campaigns/{id}/quests
POST   /api/campaigns/{id}/quests
GET    /api/quests/{id}
PUT    /api/quests/{id}
DELETE /api/quests/{id}
```

Body: `title`, `description`, `status` (`active` | `completed` | `failed` | `on_hold`), `priority`, `notes`.

```
GET    /api/quests/{id}/npcs
PUT    /api/quests/{id}/npcs/{npcId}      {"role": "..."}   vincula o cambia el rol (idempotente)
DELETE /api/quests/{id}/npcs/{npcId}
```

`role` es texto libre (hasta 60 caracteres, puede ir vacío). El NPC debe ser de la misma campaña (`400` si no); los NPCs dados de baja no se listan.

### Notas sueltas

```
GET    /api/campaigns/{id}/loose-notes
POST   /api/campaigns/{id}/loose-notes
GET    /api/loose-notes/{id}
PUT    /api/loose-notes/{id}
DELETE /api/loose-notes/{id}
```

Body: `title` (obligatorio), `body`, `pending`. Viven en la tabla `notes`; la ruta es `loose-notes` para no chocar con `notes/render` (notas del vault). El listado devuelve primero las pendientes y luego por `updated_at` descendente.

### Lore

```
GET    /api/campaigns/{id}/lore-categories
POST   /api/campaigns/{id}/lore-categories      {"label": "...", "color": "#rrggbb"}
PUT    /api/lore-categories/{id}                {"label": "...", "color": "#rrggbb"}
DELETE /api/lore-categories/{id}                409 si alguna entrada la usa

GET    /api/campaigns/{id}/lore
POST   /api/campaigns/{id}/lore
GET    /api/lore/{id}
PUT    /api/lore/{id}
DELETE /api/lore/{id}
```

Body de una entrada: `title` (obligatorio), `body`, `category_id`, `arc_id`, `location_id` (todos opcionales; deben ser de la misma campaña). Una campaña nueva se siembra con categorías base (Historia, Geografía, Religión, Magia, Cultura).

### Apariciones

```
GET /api/npcs/{id}/appearances               {sessions, quests, encounters, secrets}
GET /api/player-characters/{id}/appearances  {sessions, quests, encounters, secrets}
```

Dónde aparece un NPC o un personaje jugador: sesiones (por `session_npcs` / `session_pcs`), quests con el rol del NPC, encuentros y secretos (sobre él o que él conoce). Los registros dados de baja no se listan; `quests` y `secrets` siempre vienen vacíos para un personaje jugador.

### Objetos y economía

```
GET    /api/campaigns/{id}/currencies
POST   /api/campaigns/{id}/currencies      {"name", "symbol", "rate_to_base", "is_base", "location_ids"}
PUT    /api/currencies/{id}
DELETE /api/currencies/{id}                409 currency_in_use si algún objeto o precio de tienda la usa

GET    /api/campaigns/{id}/items
POST   /api/campaigns/{id}/items           {"name", "description", "effect", "category", "rarity", "weight", "prices": [{"currency_id", "amount"}]}
GET    /api/items/{id}
PUT    /api/items/{id}
DELETE /api/items/{id}

GET    /api/player-characters/{id}/items   inventario de un PJ
PUT    /api/player-characters/{id}/items/{itemId}   {"quantity", "notes"}   idempotente
DELETE /api/player-characters/{id}/items/{itemId}
GET    /api/npcs/{id}/items                inventario de un NPC (mismos PUT / DELETE)

GET    /api/locations/{id}/items           qué vende una locación
PUT    /api/locations/{id}/items/{itemId}  {"notes", "prices": [{"currency_id", "amount"}]}
DELETE /api/locations/{id}/items/{itemId}
```

El nombre de monedas y objetos es obligatorio; los precios no pueden ser negativos; cada moneda, objeto, locación y dueño debe ser de la misma campaña (`400` si no). Marcar una moneda como base desmarca la anterior. Una tienda sin precios propios muestra el precio de catálogo del objeto.

### Secretos

```
GET    /api/campaigns/{id}/secrets
POST   /api/campaigns/{id}/secrets
GET    /api/secrets/{id}
PUT    /api/secrets/{id}
DELETE /api/secrets/{id}
```

Body: `title` y `status` (`hidden` | `revealed`) son obligatorios; `body` (Markdown), `revealed_session_id` (solo se conserva si está `revealed`), `npc_id`, `location_id`, `lore_entry_id` y `known_by_npc_ids` son opcionales. Todo debe ser de la misma campaña (`400` si no). El listado devuelve primero los ocultos.

### Línea de tiempo

```
GET    /api/campaigns/{id}/timelines
POST   /api/campaigns/{id}/timelines            {"name", "description", "color": "#rrggbb", "start_label", "end_label"}
PUT    /api/timelines/{id}
DELETE /api/timelines/{id}                      409 timeline_in_use si tiene eventos

GET    /api/campaigns/{id}/timeline-events
POST   /api/campaigns/{id}/timeline-events
GET    /api/timeline-events/{id}
PUT    /api/timeline-events/{id}
DELETE /api/timeline-events/{id}
```

Body de un evento: `timeline_id` y `title` (obligatorios), `description`, `date_label` y `end_date_label` (texto libre, solo para mostrar), `sort_key` (número, lo único que ordena) y, opcionales, `arc_id`, `session_id`, `location_id`, `group_id`, `lore_entry_id`, todos de la misma campaña. El listado viene ordenado por `sort_key`.

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

Encounter: `name`, `session_id`, `round` (default 1), `status` (`planificado` | `activo` | `cerrado`, default `planificado`).

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
- `GET`: sirve el archivo con `X-Content-Type-Options: nosniff` y `Cache-Control: no-cache` (el navegador revalida, así que una imagen reemplazada se ve). `404` si no hay imagen.

`image_path` no se acepta en `POST`/`PUT` de la entidad, pero toda respuesta de `PUT` lo incluye.

## Papelera

```
GET  /api/campaigns/{id}/trash
POST /api/campaigns/{id}/trash/{kind}/{itemId}/restore
```

- `kind`: `session`, `arc`, `npc`, `player_character`, `location`, `group`, `quest`, `encounter`.
- `GET` devuelve `[{kind, id, label, deleted_at}]`, lo borrado más recientemente primero. Las sesiones archivadas por el vault (`sub_number = 99`) no aparecen.
- `POST` limpia `deleted_at` y responde `204`. `404` si el registro no está en la papelera de esa campaña. `409` con `session_conflict` o `restore_parent_deleted` (ver Convenciones).
- No hay endpoint para borrar definitivamente.

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
