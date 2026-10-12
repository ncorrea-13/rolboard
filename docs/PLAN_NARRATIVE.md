# Plan: gestión narrativa de la campaña

Documento de trabajo. Recoge lo conversado para ampliar rolboard hacia "reemplazar Docs/Notion" en lo narrativo, sin meterse en lo jugable. Nada de esto está implementado salvo lo marcado como hecho. Cuando algo se implemente, pasa a `DECISIONS.md` / `DATA_MODEL.md` y se borra de acá.

## Estado

| Ítem | Estado |
| ---- | ------ |
| `MarkdownField`: popup a pantalla completa para todos los textareas Markdown | Hecho, sin commitear |
| Migración única `0024_narrative_worldbuilding.sql` | **Escrita y validada** (suite verde); sin commitear, falta el código de cada capa |
| `players.description` (backend + cliente), pestañas del detalle, warnings de jugador y NPC | Hecho, sin commitear. Falta: importar del vault |
| Oneshots: pestaña en Sesiones, planificación como sesión, título propio (`0025`), tag del vault | Hecho, sin commitear |
| Notas sueltas (sección, CRUD, papelera) | Hecho, sin commitear |
| Lore (categorías + entradas, sección "Mundo", `0026`) | Hecho, sin commitear |
| Línea de tiempo (cronologías + eventos, pestaña en "Mundo") | Hecho, sin commitear |
| Secretos (sección propia, quién lo conoce, revelar) | Hecho, sin commitear |
| `quest_npcs` con rol (endpoints y bloque en la quest) | Hecho, sin commitear |
| Objetos y economía (monedas, objetos, inventario de PJ y NPC, tiendas por locación) | Hecho, sin commitear |
| Resto | Pendiente de la migración |

## Principios

- **Una sola migración** para todo el lote. Mientras no esté aplicada fuera de la DB de desarrollo, se puede editar el archivo; si cambia el diseño, se resetea la DB de dev en vez de crear otra. Una vez aplicada en un entorno real, no se toca (regla 7 de `AGENTS.md`).
- **Todo por campaña** (`campaign_id`). No hay concepto de "mundo" compartido: rompería el aislamiento actual (auth, `vault_path`, middleware, reindex, papelera). Si algún día hace falta, se agrega como capa nueva encima de `campaign_id`, no como reemplazo.
- **Cada tabla nueva con su pantalla desde el primer día.** El antecedente es `quest_npcs`: existe en el esquema sin endpoints y quedó muerta.
- **Narrativo, no jugable.** Sin mapas interactivos, tablas aleatorias, generadores ni vistas para jugadores (contradice "herramienta de DM").
- Convenciones de siempre: `ON DELETE RESTRICT`, soft delete (`deleted_at`), `CHECK` en enums, timestamps ISO 8601 en `TEXT`, PK compuesta en bridges.

## 1. Jugadores

### Qué hay hoy

`player_characters` tiene `backstory` y `progression_notes` (Markdown, solo dashboard), más `race` y `class` como texto corto. **No hay descripción general.** NPC, locación y facción sí tienen `description`.

### Decisiones

- **La DB gana.** Lo que se edita en la web no se pisa desde el vault. Los campos `backstory`, `progression_notes` y `description` son solo del dashboard; el reindex no los toca.
- **Nueva columna `description`** (`TEXT NOT NULL DEFAULT ''`, Markdown): campo general (aspecto, personalidad, resumen). Equivale a la "ficha" de la nota principal de Obsidian. Reemplaza a la idea inicial de `sheet_notes`: no hacen falta dos.
- **Importar del vault: acción explícita**, no automática en el reindex. Si fuera automática, borrar un texto a propósito lo volvería a rellenar. Hace falta un endpoint que devuelva el Markdown crudo de la nota (hoy `notes/render` devuelve HTML sanitizado).
- Tras importar, se ocultan los botones "ver nota completa / progresión" de `PlayerDetail`.

### Riesgo sin verificar

El Markdown crudo del vault trae `[[wikilinks]]` y callouts `> [!NOTE]`. El servidor los resuelve en `render.go`, pero no se verificó si `MarkdownText` en el cliente los entiende. Si no, los wikilinks se verían literales. Revisarlo antes de importar.

### Pantalla de visualización: pestañas

La edición no preocupa; la visualización se va a cargar. Propuesta:

- **Header fijo** (retrato, nombre, estado, HP, acciones), como hoy.
- **Pestañas:**
  1. **Resumen:** descripción + datos clave (especie, clase, facciones, spren).
  2. **Historia**
  3. **Progresión**
  4. **Ficha:** atributos y habilidades (hoy es un popup "ver ficha").
  5. **Inventario:** cuando exista.
- La pestaña activa se recuerda en `localStorage` (conveniencia por viewer).
- Las pestañas vacías se ocultan o muestran "sin contenido" con atajo al editor.
- No hacen falta `<details>` ni más popups: el botón de expandir de `MarkdownField` ya cubre la edición.

### Warnings de `PlayerEdit`: refactor

Problemas actuales (`PlayerEdit.tsx`, columna derecha):

- Se dispara **siempre al crear**, porque `race` arranca vacío.
- Está lejos del campo que lo causa.
- Reusa `npcEdit.warningBody` ("el campo queda marcado como incompleto en la ficha"), que no tiene sentido para "marcado como muerto".
- "Muerto" no es una advertencia: es un estado elegido, y el `select` ya muestra su color.

Propuesta:

- Especie vacía: hint pequeño bajo el input, solo si el usuario ya tocó el campo o el PJ ya existe.
- Quitar el aviso de "muerto".
- Textos propios de jugadores, sin tomar prestado el de NPC.
- `NpcEdit` tiene el mismo problema con `missingOrigin`; arreglarlo igual.
- Sin verificar: si la ficha realmente marca algo como "incompleto" cuando falta la especie. Si no lo hace, el aviso miente.

## 2. Sesiones: oneshots

- **`session_type` gana el valor `oneshot`.** No es una tabla aparte: duplicaría `session_npcs`, `session_pcs`, `session_quests`, encuentros, papelera y reindex.
- **Siempre con `campaign_id`**, pensados como complemento de una campaña. `arc_id` ya es opcional para colgarlos de un arco. Para un oneshot con PJs ajenos, el atajo sin esquema es una campaña aparte ("Oneshots").
- **Numeración propia:** el índice único `sessions_active_number_uq` `(campaign_id, session_number, sub_number)` pasa a incluir `session_type`, para que **O1** y **S1** convivan. `sub_number` siempre `0` en oneshots.
- **UI:** pestaña "Oneshots" en el timeline, etiqueta `O1`, `O2`, ...
- **Costo y riesgo:** SQLite no altera `CHECK`, así que hay que **reconstruir la tabla `sessions`** (crear, copiar, dropear, renombrar) con FKs `RESTRICT` apuntando desde otras tablas. Es lo más delicado del lote. Mirar cómo se resolvió al agregar `planning` y copiar ese modelo. No verificado.
- El reindex del vault necesita una convención para marcar oneshots (por ejemplo `tags: campaña/oneshot`, análogo a `campaña/interludio`). Por definir.

## 3. Lore

- **`lore_categories`**: por campaña, mismo patrón que `npc_types` (`key` derivada del label e inmutable, `label`, `color`, `position`).
- **`lore_entries`**: `campaign_id`, `title`, `category_id`, `body` (Markdown), `arc_id?`, `location_id?`, timestamps, `deleted_at`.
- Único por campaña, no compartido.
- Opcional: carpeta `Lore/` en el indexer. Por definir.

## 4. Objetos y economía

- **`currencies`**: `campaign_id`, `name`, `symbol`, `rate_to_base` (opcional, para convertir), `is_base`.
- **`currency_locations`** `(currency_id, location_id)`: dónde circula cada moneda. La herencia (una ciudad usa la moneda de su región) se resuelve subiendo por `parent_location_id` en código, no en el esquema.
- **`items`**: `campaign_id`, `name`, `description`, `effect` (texto libre), `category`, `rarity`, `weight?`, `image_path`, `deleted_at`. Sin `value` ni `currency_id`: los precios van aparte.
- **`item_prices`** `(item_id, currency_id, amount)`, PK `(item_id, currency_id)`: un ítem puede costar en varias monedas.
- **`pc_items`** `(pc_id, item_id, quantity, notes)`, PK `(pc_id, item_id)`.
- **`npc_items`**: igual, para botín y mercaderes.
- **`location_items`** `(location_id, item_id, notes)`: qué se vende o hay en cada locación. Confirmado para esta migración.
- **`location_item_prices`** `(location_id, item_id, currency_id, amount)`: precio propio por moneda; FK compuesta a `location_items`. Sin precio propio, rige `item_prices`.
- "Qué hace" es texto libre. Los efectos mecánicos estructurados (bonos, fórmulas) quedan afuera. Tampoco hay simulación de economía (oferta/demanda).
- Inventario con PJ como pestaña del detalle del jugador.

## 5. Herramientas narrativas nuevas

Confirmadas para la migración:

- **`secrets`** (secretos / revelaciones): `title`, `body` (Markdown), `status` (`oculto` | `revelado`), `revealed_session_id?`, y columnas opcionales `npc_id`, `location_id`, `lore_entry_id` (a qué apunta el secreto). Responde a "qué sabe cada cual y qué quedó sin soltar".
  - **`secret_npcs`** `(secret_id, npc_id)`: NPCs que conocen el secreto. Es la parte más específica, pero se incluye.
- **`notes`** (bandeja de ideas): título, cuerpo Markdown, flag "pendiente de ubicar". Para lo que surge a mitad de partida y todavía no es un NPC ni una quest.
- **`timelines`**: cronologías o "carriles" de la campaña. `campaign_id`, `name`, `description` (Markdown), `color` (`#rrggbb`, como `npc_types`), `start_label?`, `end_label?` (texto, solo para mostrar el rango), `position` (orden de los carriles en los filtros), `deleted_at`. Ejemplos: Historia del mundo, Cronología de la campaña, Guerra de X.
- **`timeline_events`**: `timeline_id` (uno por evento), `title`, `description` (Markdown), `date_label` (texto libre para mostrar: cada setting tiene su calendario), `end_date_label?` (períodos o eras), `sort_key REAL` (número que se escribe a mano, p. ej. `-3000` o `1174.5`; es lo que ordena), y vínculos opcionales a `arc_id`, `session_id`, `location_id`, `group_id` (facción), `lore_entry_id`; `deleted_at`.
  - **Orden por `sort_key`, no por `position` manual:** insertar un evento en el medio no obliga a renumerar ni a drag-and-drop. `date_label` es solo presentación.
  - **Una sola vista que mezcla todas las cronologías**, ordenadas por `sort_key`, con chips de color por timeline para filtrarlas (multiselección), y filtros por facción y por locación. Para "eventos de la facción X" o "del lugar Y" no se crea una timeline por cada una: se filtra por `group_id` / `location_id`. El filtro por locación incluye sus sub-locaciones, resuelto en el cliente subiendo por `parent_location_id`.
  - **Un evento pertenece a una sola timeline.** Si un hecho aplica a dos carriles, se filtra por entidad o se duplica; una tabla M:N (`timeline_event_timelines`) queda como mejora si el caso aparece.
  - **Tabla propia, no dependiente de lore:** un evento existe sin artículo, y un artículo (ej. "Los Heraldos") tiene muchos eventos.
  - **En la UI vive en la sección "Mundo"**, junto a Lore. La UI crea una timeline por defecto al registrar el primer evento, para no exigir un paso previo.

Sin esquema nuevo, a hacer igual:

- **Búsqueda global** (Ctrl+K) sobre NPCs, locaciones, sesiones, lore, items y quests.
- **"Aparece en"** en NPC, locación, facción y PJ (sesiones, quests y lore donde figura), usando los bridges existentes.
- **Exportar la campaña a Markdown**: la salida de emergencia de una herramienta que pretende reemplazar un Notion.

## Decidido dejar afuera

- **Recompensas de quest atadas a items/monedas:** la recompensa cabe en texto libre. Si hace falta, `quest_items` se suma luego con una migración chica.
- **Vínculos quest ↔ lore y lore ↔ NPC por tabla:** se resuelven con menciones o wikilinks en el Markdown. Una tabla se justifica cuando haga falta consultar en sentido inverso. Excepción: `quest_npcs`, que ya existe (ver abajo).
- **Mundo compartido entre campañas** (ver Principios).
- **Grafo visual de relaciones:** `npc_relations` ya guarda el dato.
- **Campos nuevos en NPC, locación, facción:** ninguno por ahora.

## Esquema de la migración (resumen)

| Cambio | Tipo |
| ------ | ---- |
| `player_characters.description` | columna |
| `sessions` (+ `oneshot`, índice único con `session_type`) | reconstrucción de tabla |
| `lore_categories`, `lore_entries` | nuevas |
| `currencies`, `currency_locations` | nuevas |
| `items`, `item_prices` | nuevas |
| `pc_items`, `npc_items`, `location_items`, `location_item_prices` | nuevas (bridges) |
| `quest_npcs.role` | columna |
| `secrets`, `secret_npcs`, `notes`, `timelines`, `timeline_events` | nuevas |

## Quests: `quest_npcs` se activa

La tabla ya existe en el esquema (`quest ↔ npc`, sin endpoints). En vez de borrarla, se le da pantalla: endpoints para vincular y desvincular NPCs desde la quest, y bloque "NPCs involucrados" en el detalle/edición de la quest. Verificado: hoy es `(quest_id, npc_id)` sin `role`. Decidido: se le suma `role TEXT` opcional (como `npc_groups.role_in_group`) en la migración, más endpoints y UI.

## Convenciones del vault (decididas)

- **Oneshots:** `tags` incluye `campaña/oneshot`, análogo a `campaña/interludio`. Lo lee el indexer de sesiones.
- **Lore:** carpeta `Lore/` en el vault. La tabla sirve sola, así que el indexer puede ir en una fase posterior.

## Notas sueltas: campos (decididos)

`title`, `body` (Markdown), `pending` (flag booleano, "pendiente de ubicar"), timestamps y `deleted_at`.

## Pendiente de decidir

2. **Reconstrucción de `sessions`:** resuelta en `0024` siguiendo el precedente de `0023` (`-- notx`, `runMigrationWithoutForeignKeys`). Validada con datos reales de `session_npcs`, FKs y los dos índices únicos.
3. **Línea de tiempo:** un evento en una sola timeline (aprobado); M:N queda como mejora futura.

## Orden de trabajo sugerido

Una capa por vez (regla 6 de `AGENTS.md`): migración → modelo → repository → service → handler → cliente.

1. Congelar el esquema y escribir la migración única.
2. `players.description` + pestañas del detalle + refactor de warnings (es lo que ya duele).
3. Oneshots (reconstrucción de `sessions` aislada y probada).
4. Lore, secretos, notas, línea de tiempo.
5. Items, monedas, inventario, tiendas.
6. Búsqueda global, "aparece en", exportación.
