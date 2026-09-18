# Obsidian Vault Indexer

[Español](VAULT_INDEXER.es.md)

Code: `server/internal/vault/`. Triggered by `POST /api/campaigns/{id}/reindex` over `VAULTS_ROOT/<vault_path>`. The vault is mounted read-only; the indexer never writes to it.

## What it does

Reads notes' YAML frontmatter and creates/updates entities. The prose stays in Obsidian: the dashboard stores `obsidian_path` to open the note (`obsidian://`) or render it.

```
walker.go       walks the vault, .md only, skips excluded files
frontmatter.go  splits YAML from body
mapper.go       folder → entity type; frontmatter structs
wikilinks.go    extracts [[wikilinks]] (supports [[Name|Alias]])
nameindex.go    file name → entities
resolver.go     resolves a wikilink to an ID, filtered by type
indexer.go      orchestrates the reindex
render.go       Markdown → sanitized HTML
```

## Flow

1. **Read.** For each note: detect type by folder, parse frontmatter, upsert by `(campaign_id, obsidian_path)`, register in the name index and store what needs resolving later.
2. **Resolve.** With every note already in the index, resolve wikilinks: location parent, NPC location/factions/relation, PC spren/factions, arc and session mentions, faction leader, backstory/progression notes.
3. **Cleanup.** Entities whose `obsidian_path` no longer exists in the vault → soft delete (and their `vault_file_state` is removed).

Done in two passes because a note can reference another that hasn't been read yet.

**Incremental:** for NPCs, locations, factions and PCs, the note's SHA-256 is stored in `vault_file_state`. If unchanged, it's skipped (only added to the index). This way an edit made on the dashboard isn't overwritten while the note stays the same. Sessions and arcs are always processed.

**Result:** `{Processed, UnresolvedWikilinks, Conflicts, Errors}`. An error on one note doesn't stop the reindex.

## Folders

Only the top-level folder counts; subfolders are accepted.

| Folder        | Entity |
| ------------- | ------- |
| `NPC/`        | npcs |
| `Locaciones/` | locations |
| `Grupos/`     | groups |
| `Sesiones/`   | sessions |
| `Jugadores/`  | player_characters |
| `Arcos/`      | arcs |

Any other folder is ignored. Excluded files: `CLAUDE.md`, `FORMAT.md`, `Primer Ideal.md`, `Método para crear NPCs.md`.

The entity's **name** is always the file name without `.md`, which is also how Obsidian resolves wikilinks.

## Frontmatter by folder

Wikilinks go in quotes in YAML: `"[[Name]]"`.

### NPC

| Key                 | Use |
| ------------------- | --- |
| `tipo`              | `npc_kind`: `npc` \| `spren` \| `entidad-cognitiva` \| `referencia`. Any other value → error on that note |
| `status`            | `vivo` \| `muerto` \| `desaparecido` \| `activo` \| `consolidado` |
| `etnia`, `rol`, `tipo_spren` | text |
| `current_location`  | wikilink to a location → `location_id` |
| `faccion`           | **list** of wikilinks to groups → `npc_groups` |
| `vinculo_con`       | wikilink to an NPC → `npc_relations` with role `vinculado_a` |

NPCs from the vault are created with `detail_level = full`.

### Locations

| Key      | Use |
| -------- | --- |
| `tipo`   | `planeta` → planet, `región` → region, `ciudad` → city, `estructura` → site, `shadesmar` → plane. Any other value → error |
| `parent` | wikilink to a location → `parent_location_id` |

### Groups

| Key          | Use |
| ------------ | --- |
| `alineacion` | text |
| `lider`      | wikilink to an NPC → `lider_npc_id` |

`tipo`, `alcance`, `astilla`, `investidura` are read but not stored.

### Sessions

| Key                 | Use |
| ------------------- | --- |
| `numero`            | decimal. Integer part → `session_number`, first decimal → `sub_number` (`4.1` = interlude of session 4) |
| `fecha`             | → `date` |
| `status` / `estado` | `completada` or `jugada` → `session`; otherwise → `planning` |
| `tags`              | if it includes `campaña/interludio` → `interlude` (takes priority) |
| `titulo`            | → `summary` |
| `arco`              | wikilink to an arc → `arc_id` |

Also, every wikilink in the note's **body** that points to an NPC or PC is added to `session_npcs` / `session_pcs` (replaced on every reindex). Other body wikilinks are ignored.

If the file name contains `ARCHIVADO`, the session is created with `sub_number = 99` and soft-deleted.

### Players

Depending on `tipo`:

- `jugador` (no `personaje`): the PC's sheet.
  | Key         | Use |
  | ----------- | --- |
  | `jugador`   | → `player_name` |
  | `raza`      | → `race` |
  | `status`    | `vivo` \| `muerto` \| `desaparecido` \| `activo`; other → `activo` |
  | `spren`     | wikilink to an NPC → `spren_npc_id` |
  | `facciones` | list of wikilinks to groups → `pc_groups` |
- `historia-jugador` / `avances` with `personaje: "[[PC]]"`: its path is stored in the PC's `historia_path` / `avances_path`.
- Any other note (including `tipo: jugador` with `personaje`) is ignored.

### Arcs

| Key                | Use |
| ------------------ | --- |
| `arco`             | → `order` |
| `subarco`          | → `subarc_order` |
| `titulo`           | → `title` |
| `status`           | `planificado` \| `en curso` \| `cerrado`; other → `planificado` |
| `mision_principal` | → `summary` |

### Quests

Don't exist in the vault. Live only in the DB.

## Wikilink resolution

A wikilink is looked up by name and filtered by the type expected for that field (`current_location` → location, `lider` → NPC, etc.). This way two files sharing a name in different folders don't collide.

- 0 matches, or more than 1 of the same type (ambiguous) → unresolved, goes into `UnresolvedWikilinks`. Never guessed.

`Conflicts` exists in the result but isn't populated today.

## Memberships and manual edits

`npc_groups` / `pc_groups` track origin (`source`): the reindex only rewrites what came from the vault and respects what was added or removed from the dashboard. See `DATA_MODEL.md`.

## Note rendering

`GET /api/campaigns/{id}/notes/render?path=...`:

- strips the frontmatter;
- wikilinks with a single match → `<a data-entity-type data-entity-id>`; the rest → plain text;
- Markdown via `goldmark` (GFM tables), `[!NOTE]`-style callouts → `blockquote` with a class;
- HTML sanitized with `bluemonday` before returning it.

## Open in Obsidian

The client builds `obsidian://open?vault=<vault_path>&file=<obsidian_path without .md>` (`client/src/lib/obsidian.ts`). Works because Obsidian names the vault the same as its folder.

## Sync

The vault is synced to the server externally (Syncthing). If it's also a git repo, exclude `.git/` from the sync.
