[English](README.md)

# Plantilla de vault

Estructura mínima que reconoce el indexador. Copiá estas carpetas como base de una campaña nueva y reemplazá las notas de ejemplo.

```
Arcos/        arcos
NPC/          NPCs
Locaciones/   locaciones
Grupos/       facciones
Jugadores/    personajes jugadores
Sesiones/     sesiones
```

Solo importa la carpeta de primer nivel; las subcarpetas se aceptan. Cualquier otra carpeta se ignora. El nombre de la entidad es siempre el nombre del archivo.

## Reglas clave

- `NPC` → `tipo` tiene que ser `npc`, `spren`, `entidad-cognitiva` o `referencia`; `faccion` siempre es lista.
- `Locaciones` → `tipo` tiene que ser `planeta`, `región`, `ciudad`, `estructura` o `shadesmar`.
- `Sesiones` → `numero: 4.1` es un interludio de la sesión 4; `status: completada`/`jugada` la marca como jugada; los wikilinks a NPCs/PJs del cuerpo se vinculan a la sesión.
- `Jugadores` → la ficha lleva `tipo: jugador`; el nombre del personaje es el nombre del archivo.
- Los wikilinks en YAML van entre comillas: `"[[Nombre]]"`.

Referencia completa de claves: [`docs/VAULT_INDEXER.md`](../docs/VAULT_INDEXER.md).

## Reindexar

`POST /api/campaigns/{id}/reindex` (botón "Reindexar"). Cada corrida refleja notas creadas, editadas y borradas.
