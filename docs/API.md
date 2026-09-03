# API

REST + JSON. Router: `net/http` stdlib (Go 1.22+, `ServeMux` con path params nativos). Sin autenticación — la seguridad es perimetral (acceso solo vía Tailscale).

## Convenciones

- Todos los endpoints bajo `/api`.
- Las entidades hijas de una campaña (`npcs`, `locations`, `quests`, `sessions`, `groups`, `arcs`) se listan/crean anidadas bajo `/api/campaigns/:id/...`, y se leen/editan/borran por su propio ID en la raíz de su recurso (`/api/npcs/:id`).

## Campaigns

```
GET    /api/campaigns
POST   /api/campaigns
GET    /api/campaigns/:id
PUT    /api/campaigns/:id
DELETE /api/campaigns/:id
```

## Arcs

```
GET    /api/campaigns/:id/arcs
POST   /api/campaigns/:id/arcs
GET    /api/arcs/:id
PUT    /api/arcs/:id
DELETE /api/arcs/:id
```

## NPCs

```
GET    /api/campaigns/:id/npcs
POST   /api/campaigns/:id/npcs
GET    /api/npcs/:id
PUT    /api/npcs/:id
DELETE /api/npcs/:id
```

## Locations

```
GET    /api/campaigns/:id/locations
POST   /api/campaigns/:id/locations
GET    /api/locations/:id
PUT    /api/locations/:id
DELETE /api/locations/:id
```

## Groups

```
GET    /api/campaigns/:id/groups
POST   /api/campaigns/:id/groups
GET    /api/groups/:id
PUT    /api/groups/:id
DELETE /api/groups/:id
GET    /api/groups/:id/members       -- calculado desde npc_groups, no almacenado
```

## Player Characters

```
GET    /api/campaigns/:id/player-characters
POST   /api/campaigns/:id/player-characters
GET    /api/player-characters/:id
PUT    /api/player-characters/:id
DELETE /api/player-characters/:id
```

## Quests

```
GET    /api/campaigns/:id/quests
POST   /api/campaigns/:id/quests
GET    /api/quests/:id
PUT    /api/quests/:id
DELETE /api/quests/:id
```

## Sessions

```
GET    /api/campaigns/:id/sessions
POST   /api/campaigns/:id/sessions
GET    /api/sessions/:id
PUT    /api/sessions/:id
DELETE /api/sessions/:id
```

## Dashboard (agregado)

```
GET /api/campaigns/:id/dashboard
```

Devuelve en una sola respuesta lo necesario para pintar la vista principal sin que el frontend tenga que hacer múltiples requests al cargar: quests activas, NPCs recientes/relevantes, última sesión, pendientes.

## Notas del vault (render)

```
GET /api/notes/render?path=<ruta-relativa-dentro-del-vault>
```

Lee el `.md` correspondiente del volumen montado, separa el frontmatter, convierte el cuerpo a HTML (goldmark) y lo devuelve. Ver `vault-indexador.md` para el manejo de wikilinks/embeds.

## Admin / Reindexado del vault

```
POST /api/admin/reindex
```

Dispara el reindexado completo del vault de Obsidian (síncrono, ver `decisiones.md`). Vacía y repuebla las tablas indexables a partir del contenido actual del vault montado. Devuelve un resumen del resultado (cantidad de entidades procesadas, wikilinks no resueltos, conflictos de nombre duplicado, etc.).

## Health check

```
GET /api/health
```

Ya implementado. Devuelve `{"status":"ok"}`.

## Pendiente de definir

- Endpoint específico para relaciones many-to-many sueltas (ej. agregar un NPC a una quest sin reemplazar toda la quest) — a resolver cuando se implementen los handlers de `quest_npcs`, `session_npcs`, etc.
- Paginación — no evaluada aún; con el volumen actual del vault (~166 entidades) probablemente no haga falta para el MVP.
