# Campaign Dashboard

Dashboard personal para gestión de campañas de rol de mesa (TTRPG) — pensado como reemplazo estructurado de Obsidian para el estado consultable de la campaña (NPCs, ubicaciones, quests, sesiones), manteniendo Obsidian como fuente de verdad para el contenido narrativo largo.

## Por qué existe este proyecto

Nace de dos necesidades combinadas:

1. **Práctica de Go orientada a un caso real** — más allá de ejercicios aislados, un proyecto de punta a punta con backend en Go y modelo de datos propio.
2. **Un dolor real como DM/GM**: durante una sesión, encontrar rápido "¿qué le prometí a este NPC?", "¿quién está en esta ciudad ahora?", "¿qué quests están activas?" — sin tener que bucear entre 750+ notas de Obsidian.

## Alcance

- **Uso personal, single-user** — no está pensado para que lo usen los jugadores, solo el DM/GM.
- **Multi-campaña desde el día uno**.
- **Corre en tailnet** — sin exposición pública.
- **Complementa Obsidian, no lo reemplaza** — el vault sigue siendo la fuente de verdad para prosa/lore; el dashboard indexa metadata estructurada (frontmatter YAML) para dar una vista rápida y consultable.

## Documentos

- [`arquitectura.md`](./arquitectura.md) — stack, despliegue, decisiones de infraestructura
- [`modelo-de-datos.md`](./modelo-de-datos.md) — entidades, relaciones, esquema SQL
- [`api.md`](./api.md) — endpoints REST
- [`vault-indexador.md`](./vault-indexador.md) — cómo se lee e indexa el vault de Obsidian
- [`decisiones.md`](./decisiones.md) — registro de decisiones tomadas y su razonamiento (ADR-style, liviano)

## Estado actual

En desarrollo. Ver `decisiones.md` para el estado de avance real de cada componente.
