[Español](README.es.md)

# Vault template

A vault that uses everything the indexer reads. Copy these folders as the base for a new campaign and replace the example notes; each note explains the keys it demonstrates.

Folder names and frontmatter keys are in Spanish on purpose — that's what the code parses.

```
Arcos/        arcs and subarcs
NPC/          NPCs (any type, plus reference-only notes)
Locaciones/   locations (planet → region → city → structure, plane)
Grupos/       factions
Jugadores/    player characters, with their history and progression notes
Sesiones/     sessions, interludes, planning, oneshots, archived
Lore/         lore entries
```

Only the top-level folder matters; subfolders are fine. Any other folder is ignored. The entity name is always the file name.

## Key rules

- `NPC` → `tipo` is any NPC type of the campaign; a new one is created on reindex. `referencia` is reserved. `faccion` and `vinculado_a` (links to players) are always lists.
- `Locaciones` → `tipo` must be `planeta`, `región`, `ciudad`, `estructura` or `plano`; `parent` points to another location.
- `Sesiones` → `numero: 4.1` is an interlude after session 4; `status: completada`/`jugada` marks it as played; tag `campaña/oneshot` makes a oneshot; `ARCHIVADO` in the file name archives it; NPC/PC wikilinks in the body are linked to the session.
- `Jugadores` → the sheet has `tipo: jugador`; the character name is the file name. `historia-jugador` and `avances` notes point to it with `personaje`.
- `Lore` → `tipo` is the lore category (created if missing); `arco` and `locacion` are optional.
- Wikilinks in YAML go quoted: `"[[Name]]"`.

Full key reference: [`docs/VAULT_INDEXER.md`](../docs/VAULT_INDEXER.md).

## Reindexing

`POST /api/campaigns/{id}/reindex` (the "Reindex" button). Created, edited and deleted notes are reflected on each run.

## Exporting

*Campaign settings → Export campaign* downloads every entity as Markdown notes in this same structure and their images in `Imagenes/` (plus `Quests/`, `Secretos/`, `Notas/`, `Objetos/`, `Monedas/`, `Linea-de-tiempo/` and `Encuentros/`, which the indexer ignores).
