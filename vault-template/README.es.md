[English](README.md)

# Plantilla de vault

Estructura mínima que el indexador (`server/internal/vault/`) reconoce sin
tocar código. Copiá estas carpetas como base de una campaña nueva y reemplazá
el contenido de ejemplo.

## Carpetas (nombres exactos, con mayúscula inicial)

```
Arcos/
NPC/
Locaciones/
Grupos/
Jugadores/
Sesiones/
```

Cualquier otra carpeta (`imágenes/`, `reglas/`, `templates/`, etc.) se ignora
— no hace falta que no exista, solo que no se llame igual a las de arriba.

## Reglas por tipo

### NPC/*.md

- `tipo:` valor libre (no se valida, ej. `npc`).
- `status:` uno de `vivo`, `muerto`, `desaparecido`, `activo`, `consolidado`
  — sin género (`vivo`, no `viva`).
- `faccion:` **siempre lista**, aunque sea una sola:
  ```yaml
  faccion:
    - "[[Nombre del Grupo]]"
  ```
  Lista vacía (`faccion: []`) o ausente = sin facción.

### Locaciones/*.md

- `tipo:` uno de `planeta`, `región`, `ciudad`, `estructura`, `shadesmar`
  (ojo el acento en `región`) — cualquier otro valor rompe el reindex.
- `parent:` wikilink a otra location (opcional, jerarquía).

### Grupos/*.md

- Sin campos obligatorios más allá del nombre del archivo. `tipo`,
  `alineacion`, `lider`, etc. se leen pero **no se persisten** en la DB
  (deferral documentado en `AGENTS.md`) — poné lo que quieras, no rompe nada.

### Jugadores/*.md

- `jugador:` nombre de quién lo juega (persona real).
- El nombre del **personaje** sale del nombre del archivo, no de un campo
  frontmatter.

### Arcos/*.md

- `arco:` número (orden del arco).
- `titulo:` nombre del arco.
- `status:` libre, no se valida.

### Sesiones/*.md

- `numero:` decimal. Parte entera = número de sesión, parte decimal
  (redondeada a 1 dígito) = sub-sesión — así `numero: 4.1` es un interludio
  después de la sesión 4, sin chocar con ella.
- `fecha:` fecha jugada (string libre, no se valida formato).
- `status:` si vale `completada` o `jugada` (sin importar mayúsculas), la
  sesión se marca como `session` (jugada). Cualquier otro valor →
  `planning` (todavía no se jugó).
- `tags:` si incluye `campaña/interludio`, el tipo se fuerza a `interlude`
  sin importar el status — tiene prioridad sobre la regla de arriba.
- `arco:` wikilink al arco al que pertenece (opcional).
- Si el **nombre del archivo** contiene `ARCHIVADO`, la sesión se crea y
  se da de baja automáticamente (soft-delete) — útil para notas viejas
  reemplazadas por una versión nueva, sin borrar el archivo del vault.

## Reindexado

`POST /api/campaigns/{id}/reindex` es **upsert real**: crear, editar,
mover o borrar una nota en el vault se refleja solo al volver a llamarlo.
No hace falta tocar la base de datos a mano.
