# Pendientes

Lo que quedó fuera de la ronda de worldbuilding narrativo. Cuando se implemente algo, pasa a `DECISIONS.md` / `DATA_MODEL.md` / `API.md` y se borra de acá. Ninguno necesita esquema nuevo.

## 1. Importador del vault (jugadores)

Traer a la base el contenido de las notas del vault que hoy solo se ven renderizadas, ya que la DB gana.

- Botón "Importar del vault" por campo del jugador: descripción (nota principal), historia (`historia_path`) y progresión (`avances_path`).
- Hace falta un endpoint que devuelva el Markdown crudo de la nota (hoy `notes/render` devuelve HTML sanitizado), sin el frontmatter.
- Es una acción explícita, no automática: si fuera parte del reindex, borrar un texto a propósito lo volvería a rellenar.
- Riesgo sin verificar: el Markdown crudo trae `[[wikilinks]]` y callouts `> [!NOTE]`. El servidor los resuelve en `render.go`; hay que revisar si `MarkdownText` en el cliente los entiende. Si no, se verían literales.
