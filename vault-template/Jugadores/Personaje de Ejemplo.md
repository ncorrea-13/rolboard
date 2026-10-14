---
tipo: jugador
jugador: Nombre del jugador real
raza: Humano
status: activo
facciones:
  - "[[Grupo de Ejemplo]]"
tags:
  - campaña/jugador
---

# Personaje de Ejemplo

## Descripción general

El nombre del personaje sale del nombre de este archivo, no de un campo
frontmatter — renombra el archivo, no agregues `personaje:`.

`status` acepta `vivo`, `muerto`, `desaparecido` o `activo`. `facciones` es una
**lista** de grupos. Los NPCs se vinculan a un jugador desde la nota del NPC
con `vinculado_a`.
