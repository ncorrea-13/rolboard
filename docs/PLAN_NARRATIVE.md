# Pendientes

Lo que quedó fuera de la ronda de worldbuilding narrativo. Cuando se implemente algo, pasa a `DECISIONS.md` / `DATA_MODEL.md` / `API.md` y se borra de acá. Ninguno de los tres necesita esquema nuevo.

## 1. Exportar la campaña a Markdown

La salida de emergencia de una herramienta que pretende reemplazar un Notion: poder llevarse todo.

- Un `.zip` (o carpeta) por campaña con una carpeta por tipo: `NPC/`, `Jugadores/`, `Locaciones/`, `Facciones/`, `Arcos/`, `Sesiones/`, `Oneshots/`, `Quests/`, `Lore/`, `Secretos/`, `Notas/`, `Objetos/`, `Linea-de-tiempo/`.
- Una nota por entidad, con frontmatter YAML mínimo (`tipo`, `status`, vínculos como `[[wikilinks]]`) y el cuerpo en Markdown.
- Mismo formato que el indexer lee del vault, para que lo exportado se pueda volver a importar.
- Decisión abierta: ¿incluye las imágenes de `uploads/`, o solo los textos?

## 2. Importador del vault (jugadores)

Traer a la base el contenido de las notas del vault que hoy solo se ven renderizadas, ya que la DB gana.

- Botón "Importar del vault" por campo del jugador: descripción (nota principal), historia (`historia_path`) y progresión (`avances_path`).
- Hace falta un endpoint que devuelva el Markdown crudo de la nota (hoy `notes/render` devuelve HTML sanitizado), sin el frontmatter.
- Es una acción explícita, no automática: si fuera parte del reindex, borrar un texto a propósito lo volvería a rellenar.
- Riesgo sin verificar: el Markdown crudo trae `[[wikilinks]]` y callouts `> [!NOTE]`. El servidor los resuelve en `render.go`; hay que revisar si `MarkdownText` en el cliente los entiende. Si no, se verían literales.
