[Español](README.es.md)

# Vault template

Minimal structure the indexer (`server/internal/vault/`) recognizes without
code changes. Copy these folders as the base for a new campaign and replace
the example content.

Note: folder names and frontmatter keys stay in Spanish below — that's what
the code actually parses (`tipo`, `status`, `faccion`, etc.). This README
only explains the rules in English.

## Folders (exact names, capitalized)

```
Arcos/
NPC/
Locaciones/
Grupos/
Jugadores/
Sesiones/
```

Any other folder (`imágenes/`, `reglas/`, `templates/`, etc.) is ignored —
it just needs to not share a name with the ones above.

## Rules per type

### NPC/*.md

- `tipo:` free text (not validated, e.g. `npc`).
- `status:` one of `vivo`, `muerto`, `desaparecido`, `activo`, `consolidado`
  — no gendered forms (`vivo`, not `viva`).
- `faccion:` **always a list**, even for a single value:
  ```yaml
  faccion:
    - "[[Group Name]]"
  ```
  Empty list (`faccion: []`) or omitted = no faction.

### Locaciones/*.md

- `tipo:` one of `planeta`, `región`, `ciudad`, `estructura`, `shadesmar`
  (note the accent in `región`) — any other value breaks the reindex.
- `parent:` wikilink to another location (optional, hierarchy).

### Grupos/*.md

- No required fields beyond the filename. `tipo`, `alineacion`, `lider`,
  etc. are read but **not persisted** to the DB (deferral documented in
  `AGENTS.md`) — put whatever you want, it won't break anything.

### Jugadores/*.md

- `jugador:` name of the actual player.
- The **character** name comes from the filename, not a frontmatter field.

### Arcos/*.md

- `arco:` number (arc order).
- `titulo:` arc name.
- `status:` free text, not validated.

### Sesiones/*.md

- `numero:` decimal. Integer part = session number, decimal part (rounded
  to 1 digit) = sub-session — so `numero: 4.1` is an interlude after
  session 4, without colliding with it.
- `fecha:` date played (free string, no format validation).
- `status:` if it's `completada` or `jugada` (case-insensitive), the
  session is marked `session` (played). Any other value → `planning`
  (not played yet).
- `tags:` if it includes `campaña/interludio`, the type is forced to
  `interlude` regardless of status — takes priority over the rule above.
- `arco:` wikilink to the arc it belongs to (optional).
- If the **filename** contains `ARCHIVADO`, the session is created and
  immediately soft-deleted — useful for old notes superseded by a newer
  version, without deleting the file from the vault.

## Reindexing

`POST /api/campaigns/{id}/reindex` is a real upsert: creating, editing,
moving or deleting a note in the vault is reflected the next time you call
it. No need to touch the database by hand.
