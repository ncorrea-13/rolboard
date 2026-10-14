[English](README.md)

# Plantilla de vault

Un vault que usa todo lo que lee el indexador. Copia estas carpetas como base de una campaña nueva y reemplaza las notas de ejemplo; cada nota explica las claves que muestra.

Los nombres de carpeta y de clave del frontmatter están en español a propósito — es lo que parsea el código.

```
Arcos/        arcos y subarcos
NPC/          NPCs (de cualquier tipo, y notas solo de referencia)
Locaciones/   locaciones (planeta → región → ciudad → estructura, plano)
Grupos/       facciones
Jugadores/    personajes jugadores, con sus notas de historia y avances
Sesiones/     sesiones, interludios, planificadas, oneshots, archivadas
Lore/         entradas de lore
```

Solo importa la carpeta de primer nivel; las subcarpetas se aceptan. Cualquier otra carpeta se ignora. El nombre de la entidad es siempre el nombre del archivo.

## Reglas clave

- `NPC` → `tipo` es cualquier tipo de NPC de la campaña; uno nuevo se crea al reindexar. `referencia` está reservado. `faccion` y `vinculado_a` (vínculos con jugadores) siempre son listas.
- `Locaciones` → `tipo` tiene que ser `planeta`, `región`, `ciudad`, `estructura` o `plano`; `parent` apunta a otra locación.
- `Sesiones` → `numero: 4.1` es un interludio de la sesión 4; `status: completada`/`jugada` la marca como jugada; el tag `campaña/oneshot` hace un oneshot; `ARCHIVADO` en el nombre del archivo la archiva; los wikilinks a NPCs/PJs del cuerpo se vinculan a la sesión.
- `Jugadores` → la ficha lleva `tipo: jugador`; el nombre del personaje es el nombre del archivo. Las notas `historia-jugador` y `avances` apuntan a él con `personaje`.
- `Lore` → `tipo` es la categoría de lore (se crea si falta); `arco` y `locacion` son opcionales.
- Los wikilinks en YAML van entre comillas: `"[[Nombre]]"`.

Referencia completa de claves: [`docs/VAULT_INDEXER.md`](../docs/VAULT_INDEXER.md).

## Reindexar

`POST /api/campaigns/{id}/reindex` (botón "Reindexar"). Cada corrida refleja notas creadas, editadas y borradas.

## Exportar

*Ajustes de la campaña → Exportar campaña* descarga cada entidad como notas Markdown con esta misma estructura y sus imágenes en `Imagenes/` (más `Quests/`, `Secretos/`, `Notas/`, `Objetos/`, `Monedas/`, `Linea-de-tiempo/` y `Encuentros/`, que el indexador ignora).
