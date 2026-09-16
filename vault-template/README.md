[Español](README.es.md)

# Vault template

Minimal vault structure the indexer recognizes. Copy these folders as the base for a new campaign and replace the example notes.

Folder names and frontmatter keys are in Spanish on purpose — that's what the code parses.

```
Arcos/        arcs
NPC/          NPCs
Locaciones/   locations
Grupos/       factions
Jugadores/    player characters
Sesiones/     sessions
```

Only the top-level folder matters; subfolders are fine. Any other folder is ignored. The entity name is always the file name.

## Key rules

- `NPC` → `tipo` must be `npc`, `spren`, `entidad-cognitiva` or `referencia`; `faccion` is always a list.
- `Locaciones` → `tipo` must be `planeta`, `región`, `ciudad`, `estructura` or `shadesmar`.
- `Sesiones` → `numero: 4.1` is an interlude after session 4; `status: completada`/`jugada` marks it as played; NPC/PC wikilinks in the body are linked to the session.
- `Jugadores` → character sheet has `tipo: jugador`; the character name is the file name.
- Wikilinks in YAML go quoted: `"[[Name]]"`.

Full key reference: [`docs/VAULT_INDEXER.md`](../docs/VAULT_INDEXER.md).

## Reindexing

`POST /api/campaigns/{id}/reindex` (the "Reindex" button). Created, edited and deleted notes are reflected on each run.
