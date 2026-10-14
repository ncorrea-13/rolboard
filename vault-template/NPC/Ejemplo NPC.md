---
tipo: npc
status: vivo
origen: Humano
rol: Comerciante
subtipo: Mercader viajero
faccion:
  - "[[Grupo de Ejemplo]]"
current_location: "[[Ciudad de Ejemplo]]"
vinculado_a:
  - "[[Personaje de Ejemplo]]"
tags:
  - campaña/npc
---

# Ejemplo NPC

## Descripción general

`tipo` es el tipo de NPC de la campaña. Si el tipo no existe todavía se crea
solo al reindexar (ver `Aliado Ejemplo`). `origen`, `rol` y `subtipo` son texto
libre; `status` acepta `vivo`, `muerto`, `desaparecido`, `activo` o
`consolidado`.

- `faccion` es una **lista** de grupos.
- `current_location` apunta a una locación.
- `vinculado_a` es una **lista** de jugadores a los que este NPC está
  vinculado. El rol del vínculo se edita en la app.
