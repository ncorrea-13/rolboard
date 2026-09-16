# Indexador del vault de Obsidian

Código: `server/internal/vault/`. Se dispara con `POST /api/campaigns/{id}/reindex` sobre `VAULTS_ROOT/<vault_path>`. El vault se monta read-only; el indexador nunca lo escribe.

## Qué hace

Lee el frontmatter YAML de las notas y crea/actualiza entidades. La prosa queda en Obsidian: el dashboard guarda `obsidian_path` para abrir la nota (`obsidian://`) o renderizarla.

```
walker.go       recorre el vault, solo .md, saltea excluidos
frontmatter.go  separa YAML y cuerpo
mapper.go       carpeta → tipo de entidad; structs de frontmatter
wikilinks.go    extrae [[wikilinks]] (soporta [[Nombre|Alias]])
nameindex.go    nombre de archivo → entidades
resolver.go     resuelve un wikilink a un ID filtrando por tipo
indexer.go      orquesta el reindex
render.go       Markdown → HTML sanitizado
```

## Flujo

1. **Lectura.** Por cada nota: detectar tipo por carpeta, parsear frontmatter, upsert por `(campaign_id, obsidian_path)`, registrar en el índice de nombres y guardar lo que hay que resolver después.
2. **Resolución.** Con todas las notas ya en el índice, resolver wikilinks: padre de locación, ubicación/facciones/vínculo de NPC, spren/facciones de PJ, arco y menciones de sesión, líder de facción, notas de historia/avances.
3. **Limpieza.** Entidades con `obsidian_path` que ya no existe en el vault → baja lógica (y se borra su `vault_file_state`).

Se hace en dos pasadas porque una nota puede referenciar otra que todavía no se leyó.

**Incremental:** para NPCs, locaciones, facciones y PJs se guarda el SHA-256 de la nota en `vault_file_state`. Si no cambió, se saltea (solo se agrega al índice). Así una edición hecha en el dashboard no se pisa mientras la nota no cambie. Sesiones y arcos se procesan siempre.

**Resultado:** `{Processed, UnresolvedWikilinks, Conflicts, Errors}`. Un error en una nota no corta el reindex.

## Carpetas

Solo cuenta la carpeta de primer nivel; las subcarpetas se aceptan.

| Carpeta      | Entidad |
| ------------ | ------- |
| `NPC/`        | npcs |
| `Locaciones/` | locations |
| `Grupos/`     | groups |
| `Sesiones/`   | sessions |
| `Jugadores/`  | player_characters |
| `Arcos/`      | arcs |

Cualquier otra carpeta se ignora. Archivos excluidos: `CLAUDE.md`, `FORMAT.md`, `Primer Ideal.md`, `Método para crear NPCs.md`.

El **nombre** de la entidad es siempre el nombre del archivo sin `.md`, que es también como Obsidian resuelve los wikilinks.

## Frontmatter por carpeta

Los wikilinks van entre comillas en YAML: `"[[Nombre]]"`.

### NPC

| Clave              | Uso |
| ------------------ | --- |
| `tipo`             | `npc_kind`: `npc` \| `spren` \| `entidad-cognitiva` \| `referencia`. Otro valor → error en esa nota |
| `status`           | `vivo` \| `muerto` \| `desaparecido` \| `activo` \| `consolidado` |
| `etnia`, `rol`, `tipo_spren` | texto |
| `current_location` | wikilink a locación → `location_id` |
| `faccion`          | **lista** de wikilinks a grupos → `npc_groups` |
| `vinculo_con`      | wikilink a NPC → `npc_relations` con rol `vinculado_a` |

Los NPCs del vault se crean con `detail_level = full`.

### Locaciones

| Clave    | Uso |
| -------- | --- |
| `tipo`   | `planeta` → planet, `región` → region, `ciudad` → city, `estructura` → site, `shadesmar` → plane. Otro valor → error |
| `parent` | wikilink a locación → `parent_location_id` |

### Grupos

| Clave        | Uso |
| ------------ | --- |
| `alineacion` | texto |
| `lider`      | wikilink a NPC → `lider_npc_id` |

`tipo`, `alcance`, `astilla`, `investidura` se leen pero no se guardan.

### Sesiones

| Clave              | Uso |
| ------------------ | --- |
| `numero`           | decimal. Parte entera → `session_number`, primer decimal → `sub_number` (`4.1` = interludio de la 4) |
| `fecha`            | → `date` |
| `status` / `estado`| si es `completada` o `jugada` → `session`; si no → `planning` |
| `tags`             | si incluye `campaña/interludio` → `interlude` (tiene prioridad) |
| `titulo`           | → `summary` |
| `arco`             | wikilink a arco → `arc_id` |

Además, cada wikilink del **cuerpo** que apunte a un NPC o PJ se agrega a `session_npcs` / `session_pcs` (se reemplazan en cada reindex). Otros wikilinks del cuerpo se ignoran.

Si el nombre del archivo contiene `ARCHIVADO`, la sesión se crea con `sub_number = 99` y queda dada de baja.

### Jugadores

Según `tipo`:

- `jugador` (sin `personaje`): ficha del PJ.
  | Clave       | Uso |
  | ----------- | --- |
  | `jugador`   | → `player_name` |
  | `raza`      | → `race` |
  | `status`    | `vivo` \| `muerto` \| `desaparecido` \| `activo`; otro → `activo` |
  | `spren`     | wikilink a NPC → `spren_npc_id` |
  | `facciones` | lista de wikilinks a grupos → `pc_groups` |
- `historia-jugador` / `avances` con `personaje: "[[PJ]]"`: se guarda su ruta en `historia_path` / `avances_path` del PJ.
- Cualquier otra nota (incluida `tipo: jugador` con `personaje`) se ignora.

### Arcos

| Clave              | Uso |
| ------------------ | --- |
| `arco`             | → `order` |
| `subarco`          | → `subarc_order` |
| `titulo`           | → `title` |
| `status`           | `planificado` \| `en curso` \| `cerrado`; otro → `planificado` |
| `mision_principal` | → `summary` |

### Quests

No existen en el vault. Viven solo en la DB.

## Resolución de wikilinks

Un wikilink se busca por nombre y se filtra por el tipo esperado según el campo (`current_location` → locación, `lider` → NPC, etc.). Así dos archivos con el mismo nombre en carpetas distintas no chocan.

- 0 coincidencias, o más de 1 del mismo tipo (ambiguo) → no se resuelve y va a `UnresolvedWikilinks`. Nunca se adivina.

`Conflicts` existe en el resultado pero hoy no se llena.

## Membresías y ediciones manuales

`npc_groups` / `pc_groups` distinguen origen (`source`): el reindex solo reescribe lo que vino del vault y respeta lo agregado o sacado desde el dashboard. Ver `DATA_MODEL.md`.

## Render de notas

`GET /api/campaigns/{id}/notes/render?path=...`:

- quita el frontmatter;
- wikilinks con una única coincidencia → `<a data-entity-type data-entity-id>`; el resto → texto;
- Markdown con `goldmark` (tablas GFM), callouts `[!NOTE]` etc. → `blockquote` con clase;
- HTML sanitizado con `bluemonday` antes de devolverlo.

## Abrir en Obsidian

El cliente arma `obsidian://open?vault=<vault_path>&file=<obsidian_path sin .md>` (`client/src/lib/obsidian.ts`). Funciona porque Obsidian nombra el vault igual que su carpeta.

## Sincronización

El vault se sincroniza al servidor por fuera (Syncthing). Si además es un repo git, excluir `.git/` de la sincronización.
