# Registro de Decisiones

Registro liviano (estilo ADR) de decisiones tomadas durante el diseño, con su razonamiento. Orden cronológico.

---

## Elección del proyecto sobre otras alternativas

Se evaluaron: to-do básico, gestor de gastos personal, dashboard de hábitos, lista de compras con sync, y el compañero de campaña.

**Decisión**: compañero de campaña de rol.

**Por qué**: dominio que ya le apasiona al usuario (es DM/GM activo), tiene un caso de uso real e inmediato (usable la próxima sesión), y ofrece superficie técnica interesante sin ser forzada (a diferencia de, por ejemplo, forzar WebSockets en una lista de compras solo por el ejercicio).

---

## Alcance: para el DM, no para los jugadores

**Decisión**: la herramienta es de uso exclusivo del DM/GM, no algo que ven los jugadores en simultáneo.

**Por qué**: elimina la necesidad de autenticación multiusuario, WebSockets, y UI pensada para terceros — reduce drásticamente el alcance sin perder el valor central (el "pantallazo" de la mesa).

**Consecuencia**: no hay tracker de combate en tiempo real compartido con jugadores en el MVP; si existe, es una vista de control personal del DM.

---

## Stack: Go + React/TypeScript, no templates server-rendered

**Decisión**: SPA separada (React + TS) consumiendo una API REST en Go, en vez de templates server-rendered (HTMX + Go templates).

**Por qué**: el plan incluye interactividad rica (mapa interactivo, grafo de relaciones navegable, tracker de combate) que los templates de Go manejan peor. El usuario ya tiene experiencia con React.

---

## Bundler: Vite, no Next.js

**Decisión**: Vite como bundler/dev server del frontend.

**Por qué**: la app es una SPA privada de un solo usuario, sin necesidad de SSR ni SEO — todo lo que Next.js resuelve de más (rutas server-side, API routes propias, optimización para sitios públicos) es peso sin beneficio para este caso. Vite es más liviano en dependencias y más rápido en dev/build (usa esbuild).

**Nota aparte**: se aclaró que TypeScript 7 (compilador reescrito en Go, "Project Corsa") mejora la experiencia de desarrollo (velocidad de compilación y type-checking) pero no reduce el tamaño del bundle final que llega al navegador — son preocupaciones independientes.

---

## Base de datos: SQLite, no Postgres

**Decisión**: SQLite (`modernc.org/sqlite`, sin cgo).

**Por qué**: single-user, dataset chico (confirmado luego por el audit del vault: ~166 entidades indexables), sin necesidad de un servidor de base de datos separado corriendo 24/7. Mismo driver que ya se usa en el homelab-status-api — consistencia de stack.

---

## Despliegue: ThinkCentre, no Raspberry Pi

**Decisión**: el proyecto corre en el ThinkCentre.

**Por qué**: separación de responsabilidades — la Pi cumple rol de gateway crítico (Pi-hole, Unbound, Caddy, cloudflared) y no debe cargarse con servicios de aplicación adicionales; el ThinkCentre es el nodo designado para aplicaciones (Vaultwarden, Miniflux, Immich, etc.). La diferencia de memoria libre entre ambos nodos en el momento de la decisión (~650MB en Pi vs. ~4GB en ThinkCentre) refuerza la decisión pero no es la razón principal.

---

## Multi-campaña desde el día uno

**Decisión**: el modelo de datos soporta múltiples campañas desde el MVP (no una sola campaña hardcodeada).

**Por qué**: decisión explícita del usuario — quiere poder usar la herramienta para más de una campaña (ej. distintos sistemas de juego) sin rediseñar el modelo después.

---

## Grupos como entidad completa desde el MVP

**Decisión**: `groups` es una tabla propia con relación many-to-many a `npcs`, no un campo de texto libre dentro de NPC.

**Por qué**: decisión explícita del usuario, confirmada además por el audit del vault real — 23 grupos/facciones con notas propias, y numerosos NPCs que referencian membresía en prosa. Modelarlo como texto libre hubiera perdido esa consultabilidad.

---

## Player Characters en el núcleo del MVP

**Decisión**: `player_characters` es una entidad separada de `npcs`, incluida desde el MVP.

**Por qué**: decisión explícita del usuario — los personajes jugadores son protagonistas de la campaña, no un detalle secundario a posponer.

---

## Relación con el vault de Obsidian: complementar, no migrar

**Decisión**: el dashboard no reemplaza el contenido del vault (757+ archivos de prosa, lore, reglas). Cada entidad indexada guarda solo un `obsidian_path` de referencia; el contenido narrativo largo se sigue editando y leyendo en Obsidian.

**Por qué**: migrar todo el contenido a formularios web hubiera sido un desperdicio de esfuerzo — Obsidian ya resuelve mejor la escritura de prosa larga, backlinks y grafo de notas. El valor real del dashboard está en la vista estructurada y consultable del _estado_ de la campaña, no en reemplazar dónde se escribe.

---

## Acceso al vault: Syncthing (filesystem), no clonar desde Codeberg

**Decisión**: el backend lee el vault desde un volumen montado read-only, sincronizado por Syncthing — no clona ni hace `git pull` del repo de Codeberg en cada operación.

**Por qué**: evita latencia de red y dependencia de que Codeberg esté disponible; el vault ya se sincroniza por Syncthing entre los dispositivos del usuario, así que basta con incluir al ThinkCentre como destino de esa sincronización. Codeberg queda como backup/versionado independiente, gestionado aparte (con la recomendación de excluir `.git/` del `.stignore` para evitar corrupción por sincronización a nivel de bytes de los objetos internos de Git).

---

## Link `obsidian://` como funcionalidad de primera clase

**Decisión**: el deep link de apertura en Obsidian (`obsidian://open?...`) se implementa como botón de igual jerarquía al render server-side, no como fallback de emergencia.

**Por qué**: inicialmente se consideró frágil por depender de que Obsidian esté instalado en la máquina cliente — pero el usuario confirmó que tiene Obsidian instalado en **todos** sus dispositivos con el vault sincronizado, por lo que la limitación no aplica en la práctica.

---

## Reindexado: endpoint HTTP, síncrono, completo (no incremental)

**Decisión**: `POST /api/campaigns/{id}/reindex` (por campaña, no un endpoint global), disparado por el botón "Reindexar vault" en el header de `CampaignDashboard`. El endpoint bloquea hasta terminar (síncrono) y siempre reindexa todo desde cero (no incremental).

**Por qué**:

- **Endpoint vs. CLI aparte**: decisión explícita del usuario, prioriza comodidad de uso (un botón) sobre la separación de un binario aparte.
- **Síncrono vs. asíncrono**: con ~166 archivos chicos, el proceso completo tarda del orden de segundos — no justifica la complejidad de colas de jobs, polling de estado, o WebSockets para un caso de uso single-user y de disparo manual.
- **Completo vs. incremental**: más simple de razonar (no hay que trackear qué cambió desde la última corrida); el volumen actual no genera problema de performance corriendo siempre desde cero.

---

## Router HTTP: `net/http` stdlib, no `chi`

**Decisión**: usar el `ServeMux` de la biblioteca estándar de Go (1.22+), no un router de terceros.

**Por qué**: consistencia con el enfoque de aprendizaje "sin atajos" que el usuario ya viene aplicando en la migración del homelab-status-api. Desde Go 1.22, `ServeMux` soporta path params y routing por método HTTP de forma nativa (`mux.HandleFunc("GET /api/campaigns/{id}/npcs", ...)`), que era el argumento históricamente más fuerte a favor de `chi`. El scope de la API (CRUD directo sobre ~7 entidades) no demanda las features adicionales que `chi` aportaría (middleware chains complejas, agrupación de rutas avanzada).

---

## Naming: `server/` y `client/`, no `backend/` y `frontend/`

**Decisión**: las carpetas del monorepo se llaman `server` y `client`.

**Por qué**: preferencia explícita del usuario.

---

## Audit y normalización del frontmatter del vault (vía Claude Code)

**Contexto**: antes de diseñar el indexador en detalle, se auditó el vault real (166 archivos con contenido indexable) para verificar consistencia de frontmatter YAML.

**Resultado del audit inicial**: 97% de cobertura, 0 inconsistencias críticas — mejor estado del esperado al diseñar el modelo desde cero.

**Decisión derivada 1 — normalizar keys**: se optó por normalizar el YAML existente (`estado`→`status`, `alineamiento`→`alineacion`, `spren_futuro`→`spren`) en los 166 archivos, en vez de que el indexador tolere las keys originales en español.

**Por qué**: el usuario priorizó prolijidad y consistencia a largo plazo por sobre el ahorro de trabajo de escribir un indexador más tolerante. Ejecutado en dos fases con Claude Code (dry-run + confirmación antes de escribir): Fase 1 normalizó keys (95 archivos), Fase 2 completó campos deducibles desde prosa/nombre de archivo (20 archivos adicionales) — total 115 archivos modificados, 41 casos quedaron pendientes de revisión manual por ambigüedad genuina (sin inventar datos).

**Decisión derivada 2 — no duplicar la relación grupo↔NPC en YAML**: pese a que el audit sugería agregar `miembros_conocidos` en el YAML de cada grupo, se decidió calcular esa relación programáticamente desde el campo `groups`/`faccion` de cada NPC, para evitar mantener la misma información en dos lugares con riesgo de desincronización.

---

## Modelo de datos: convenciones y constraints (antes de la primera migración)

Discutido a fondo antes de escribir la primera migración SQL — ver `DATA_MODEL.md` para el detalle completo por tabla. Resumen de decisiones:

**Migraciones versionadas**, no un `schema.sql` único: archivos numerados (`0001_...sql`, `0002_...sql`) embebidos con `go:embed`, tracking de versión aplicada en tabla `schema_migrations`. Por qué: aunque es un proyecto de un solo dev, el modelo tiene evolución esperada (capas 2/3 del roadmap) y versionar desde el día uno es más barato que migrar el enfoque después.

**Baja lógica (`deleted_at`), no `DELETE` físico**: todas las tablas de entidad (no las puente) llevan `deleted_at TEXT NULL`. El `DELETE` físico queda como excepción rara. Por qué: decisión explícita del usuario, perder datos de campaña por error es peor que acumular filas inactivas — un vault de rol no genera volumen que justifique purgar.

**FKs con `ON DELETE RESTRICT`, no `CASCADE`**: ninguna fila padre se puede borrar físicamente mientras algo la referencie, sea la FK nullable o no. Por qué: decisión explícita del usuario — mismo espíritu que la baja lógica, preferir bloquear antes que borrar en cadena por accidente. Requiere `PRAGMA foreign_keys = ON` por conexión (SQLite lo trae apagado por default).

**`CHECK` constraints en campos enum-like** (`status`, `npc_kind`, `session_type`, `location_type`, etc.), no solo validación del lado Go. Por qué: decisión explícita del usuario — no depender de que todo el acceso a la DB pase por el código de la app para mantener la integridad de esos valores.

**PK compuesta en tablas puente** (`PRIMARY KEY (a_id, b_id)`), no `id` surrogate + `UNIQUE` aparte. Por qué: es el estándar para many-to-many puro sin atributos propios que necesiten ser referenciados desde otro lado — ahorra una columna y el índice de unicidad sale gratis de la PK.

**Timestamps como `TEXT` ISO 8601** (`datetime('now')`), no `INTEGER` epoch. Por qué: con el volumen del proyecto (~166 entidades) la diferencia de performance es irrelevante; gana la legibilidad de poder inspeccionar el `.db` a mano con `sqlite3` sin convertir fechas.

**`obsidian_path` único por campaña** (`UNIQUE(campaign_id, obsidian_path)`), no único global. Por qué: la ruta tiene sentido dentro del scope de su campaña/vault — el root absoluto del vault (ej. `/home/ncorrea/Documents/Obsidian/Cosmere` en esta laptop) NO se guarda en la base, es config de servidor (env var) porque difiere entre esta laptop y el ThinkCentre.

**Índices sobre FKs, diferidos**: SQLite no indexa automático las foreign keys comunes (solo PK y `UNIQUE`). Se documentó la falta pero se decidió no bloquear el MVP por esto — con ~166 entidades un table scan es instantáneo; se agregan cuando el volumen lo justifique.

**Comparación con `homelab-status-api`**: se confirmó mismo enfoque de fondo (SQL crudo, `database/sql` + `modernc.org/sqlite`, sin ORM, sin atajos) pero no mismo nivel de aparataje — ese proyecto tiene 2 tablas sin relación FK real entre sí (apto para un poller de eventos append-only), mientras que `campaign-dashboard` tiene un grafo relacional de 7 entidades con jerarquía y many-to-many, que sí justifica migraciones versionadas, `CHECK`, y PK compuesta. El patrón de baja lógica (columna `active`) ya estaba validado en `homelab-status-api` (`internal/store/sqlite.go`, `RemoveService`), reforzando que no es sobre-ingeniería nueva sino un patrón que el usuario ya usa.

---

## Frontend: styling en CSS plano + design tokens, no Tailwind ni CSS-in-JS

**Decisión**: variables CSS (`custom properties`) centralizadas en `client/src/styles/tokens.css` para paleta y tipografía, más un `.css` por componente/pantalla (import directo, sin CSS Modules).

**Por qué**: el mockup no tiene requisitos de theming dinámico ni de aislamiento estricto de estilos que justifiquen Tailwind (setup de PostCSS + purga) o CSS-in-JS (runtime, bundle extra). Con `client/` recién arrancado, la opción más chica que resuelve el problema es CSS nativo + variables — se reevalúa si el árbol de componentes crece mucho o aparece theming real (claro/oscuro intercambiable en vivo).

---

## Frontend: paleta "Obsidiana" (Shadesmar) + tipografía EB Garamond / Alegreya Sans / IBM Plex Mono

**Decisión**: de las direcciones visuales exploradas en `screens/Cosmere DM Dashboard - Direcciones visuales.dc.html`, se tomó la paleta oscura "Obsidiana" (turno 2, opción 2a — negro neutro-verdoso `#07080A`/`#0E1114`/`#161A1D`, acento único cálido `#D08A3C`, colores de "cristal" por tipo de entidad NPC/spren/locación/facción-quest, semáforo de estado apagado con punto+palabra) aplicada al set completo de 6 pantallas (turno 3, opción 3a), combinando el tratamiento de resaltado 4a (sigilo teñido: el color vive en el tile de inicial) + 4d (subrayado del nombre) en simultáneo, y la tipografía 4e (EB Garamond para display, Alegreya Sans para texto de cuerpo, IBM Plex Mono para labels/datos).

**Por qué**: decisión explícita del usuario tras revisar las alternativas exploradas en el documento de direcciones visuales — 4a+4d combinados dan más peso al color de tipo de entidad que cualquiera de las dos opciones por separado, sin tocar el fondo de la fila (que queda reservado para el estado). Tokens exactos en `client/src/styles/tokens.css`.

**Nota**: el color de "cristal" (tipo de entidad) y el de "estado" son escalas separadas y no se combinan en el mismo elemento — regla ya establecida en el documento de direcciones visuales, ver sección "Reglas de uso del color" de 2a.

**Actualizado en sesión posterior** (el documento de direcciones visuales ya no existe, se usó y se borró — ver `AGENTS.md`):
- **Tipografía**: EB Garamond + Alegreya Sans reemplazadas por **Fraunces** (display) + **Inter** (cuerpo) — la combo original leía como "mockup fantasy genérico" para una herramienta que se usa en vivo durante la sesión (legibilidad en tablas/listas a 11-13px pesa más que tono literario). IBM Plex Mono se mantiene para datos/labels.
- **Filete vertical de color eliminado en todos lados**, incluida la sidebar (el ítem activo tenía `inset 2px 0 0 var(--accent-flame)`, la misma línea vertical ya descartada en 4a-4d) — reemplazado por subrayado (mismo patrón 4d) bajo el label del ítem activo.
- **Paleta de acentos ampliada**, ya no un único ámbar de CTA: `--accent-obsidian` (violeta, identidad principal — CTA/links/marca/glow), `--accent-obsidian-deep` (hover), `--accent-sky` (celeste — barras de progreso y códigos de sesión, dato no-CTA), `--accent-teal` (variedad extra en nav). El ámbar (`--accent-flame`) y el rojo (`--status-dead`) se mantienen pero acotados a usos con significado real (ej. prioridad de quest P1=rojo/P2=ámbar/P3=neutro, barra "editando sin guardar" en NpcEdit) — no decorativos sueltos.
- **Cada ítem del sidebar tiene un color distinto y notorio** (ícono + marcador + subrayado activo comparten el mismo color por ítem) para que se distingan a simple vista, no solo los que tienen "cristal" semántico (NPCs/Locaciones/Facciones/Quests) — Resumen/Arcos/Sesiones/Jugadores también llevan color propio aunque no tengan tipo-cristal asociado.
- **Íconos de sidebar**: `lucide-react` (íconos de línea reales, no emoji a color ni glyphs Unicode sueltos) — se probaron ambas alternativas antes y no daban el tono correcto para una herramienta de DM seria.

---

## Quests: solo DB/API, nunca nota de Obsidian — `quest_npcs`/`session_quests` se manejan por el dashboard

**Decisión**: Quests no tiene ni va a tener nota propia en el vault. `quest_npcs` y `session_quests` se pueblan exclusivamente vía API/formularios del dashboard, nunca desde el indexer.

**Por qué**: se confirmó contra el vault real que no existe carpeta `Quests/` ni ninguna nota `tipo: quest` — las quests viven solo en la cabeza del DM y en la prosa de las sesiones, nunca como entidad propia de Obsidian. Meter quests al vault implicaría diseñar un schema de frontmatter nuevo y retrofitear plot threads que hoy no son notas, para algo que el dashboard ya resuelve gratis con un form (multi-select de NPCs/quests). Coincide con que `quests` no tenga columna `obsidian_path` en `DATA_MODEL.md`.

---

## `session_npcs`/`session_pcs`: wikilinks del body de la sesión, no un campo de frontmatter

**Decisión**: el indexer escanea el cuerpo completo de cada nota de sesión con `ExtractWikilinks`, resuelve cada nombre contra el `NameIndex` y filtra por `Type` (`npc`/`player_character`) para poblar `session_npcs`/`session_pcs`. Cualquier otro wikilink del body (locations, facciones, arcos, otras sesiones) se ignora a propósito, no se reporta como roto.

**Por qué**: confirmado contra Ses. 12-14 del vault real — NPCs y PJs se mencionan como wikilinks sueltos en la prosa de la sesión, no hay (ni tiene sentido agregar) un campo `npcs:`/`pjs:` en el frontmatter para algo que ya se escribe naturalmente al narrar. De paso se corrigió un bug real: `player_character.CharacterName` dependía de un campo `personaje:` que no existe en ninguna de las 5 fichas reales de `Jugadores/` — el indexer las descartaba todas con error. Ahora usa directamente el nombre del archivo, que es además como se linkea al PJ desde la prosa.

---

## `CrystalType`/`StatusKind` del frontend: extender un bucket real, filtrar el que no es un NPC

**Decisión**: al wirear NPCs reales (reindex del vault `Cosmere`) aparecieron dos `npc_kind` sin bucket en `CrystalType` (hoy `npc | spren | location | faction-quest`) y dos `status` sin bucket en `StatusKind` (hoy `alive | missing | dead | paused`).

- `entidad-cognitiva` (ej. Kira) es un personaje real → se agrega como quinto valor de `CrystalType`, con color propio (`--crystal-entidad-cognitiva`, reusa el mauve ya definido y sin uso, `--accent-crystalline`).
- `referencia` (un único caso: `NPC/NPCs menores.md`, nota índice que agrupa secundarios sin ficha propia) **no** es un personaje — se filtra client-side (`App.tsx`, antes de mapear) y no entra al `CrystalType` en absoluto. Sigue en la DB con su `obsidian_path` intacto, solo no aparece en `NpcList`/dashboard.
- `status`: `activo`→`alive`, `consolidado`→`dead` (spren fusionado/narrativamente cerrado se trata como cerrado, no como un quinto estado).

**Por qué**: `entidad-cognitiva` sí es una entidad narrativa con la que el DM interactúa — perder su distinción visual mezclándola en el bucket `npc` genérico rompería el criterio ya establecido de que el cristal marca tipo de entidad a simple vista (ver "Cada ítem del sidebar tiene un color distinto..." más arriba). `referencia`, en cambio, no es una entidad — es un artefacto de organización del vault (una nota catch-all), así que darle un cristal la trataría como si fuera un personaje más, lo cual es directamente incorrecto — se descarta antes que se le busque un color. Para `status`, forzar un quinto bucket por dos valores raros del vault no pagaba la complejidad; `activo`/`consolidado` caen conceptualmente del lado de "vivo" o "cerrado" del semáforo existente.

---

## `arcs.status` y `arcs.subarc_order`: columnas nuevas, dato que el indexer ya parseaba y tiraba

**Decisión**: al wirear Arcs se encontró que `mapper.go` (`ArcFrontmatter`) ya parseaba `status` (`en curso`/`planificado`, real en las 4 notas de `Arcos/` del vault) y `subarco` (testeado en `mapper_frontmatter_test.go`, sin caso real en el vault todavía), pero `indexer.go` armaba el `models.Arc` sin usar ninguno de los dos — se descartaban en silencio, y `models.Arc`/schema no tenían columna para ninguno.

- `status TEXT NOT NULL DEFAULT 'planificado' CHECK (status IN ('planificado', 'en_curso', 'cerrado'))` — migración `0005_arcs_status.sql`. 3 valores, no 2: el vault distingue "planificado" (arco todavía no arrancó) de "en curso" (activo), son conceptos distintos aunque el client hoy solo mostraba 2 (reusaba `StatusKind` alive/dead). Vault usa "en curso" con espacio; se normaliza a `en_curso` en `indexer.go` (función `arcStatus`, mismo patrón que `playedStatuses`/`sessionType`) para no romper la convención kebab/snake_case de los demás enums (`entidad-cognitiva`, etc.). Valor no reconocido cae a `planificado` por default, no rompe el reindex.
- `subarc_order INTEGER` nullable, **sin FK a otro arc**. El vault permite `arco: 2, subarco: 1` — dos notas de arco pueden compartir el mismo `"order"` (arco 2 principal + arco 2 subarco 1, 2, ...) y se distinguen/ordenan por `subarc_order` (`NULL` en el arco principal, ordena primero en SQLite ASC; 1/2/3... en sus subarcos). Se evaluó `parent_arc_id` FK (más relacional, como `location.parent_location_id`) pero se descartó: exigía una segunda pasada de resolución en el indexer (como el resolver de wikilinks de NPCs) para algo que hoy no tiene ningún consumidor que necesite navegar la relación como grafo — el agrupamiento por `"order"` compartido alcanza.

**Por qué**: mismo criterio que "no duplicar member_count" — si el dato ya existe y se puede persistir con una columna simple, no tiene sentido seguir tirándolo. `CreateArcPayload`/`UpdateArcPayload` ahora exigen `status` válido igual que los demás enums del proyecto (`npc_kind`, `location_type`), no un default silencioso — consistencia con el resto de los handlers.

**Pendiente, no resuelto en esta pasada**: `ArcRepository.Create` sigue sin `ON CONFLICT` (a diferencia de npcs/locations/groups, que dedupan por `obsidian_path`) — re-reindexar el vault hoy duplicaría arcs. `arcs` tampoco tiene columna `obsidian_path`. Bug preexistente, no introducido por este cambio, queda para otra sesión.

---

## Reindex no pisa ediciones del dashboard si la nota no cambió (`vault_file_state`)

**Decisión**: antes de esto, cada reindex volvía a correr `ON CONFLICT (campaign_id, obsidian_path) DO UPDATE` sobre npcs/locations/groups/player_characters **siempre**, aunque la nota de Obsidian no hubiera cambiado ni un carácter desde el reindex anterior. Si un DM editaba un dato (ej. `status` de un NPC) desde el dashboard sin tocar el `.md` correspondiente, el próximo reindex lo pisaba con el valor viejo del vault — pérdida de datos silenciosa.

Se agregó `vault_file_state` (tabla nueva, `migrations/0006_vault_file_state.sql`): `(campaign_id, path)` → `content_hash` (SHA-256 del contenido completo del archivo, `crypto/sha256` stdlib) + `entity_type`/`entity_id`. En `indexer.go`, antes de parsear una nota de `npc`/`location`/`group`/`player_character`, se compara su hash contra el guardado (`Indexer.skipUnchanged`): si coincide, la nota se saltea por completo (no se parsea, no se llama `Create`/`Update`, no se re-encolan sus relaciones) y solo se re-agrega al `NameIndex` en memoria con su ID existente, para que otras notas puedan seguir resolviendo wikilinks contra ella. Si el hash difiere (o es la primera vez que se ve el archivo), se procesa normal y se guarda el hash nuevo.

**Por qué**: es un caso real de pérdida de datos con acceso asimétrico (dashboard sin vault a mano) — no un problema hipotético. La alternativa de "el dashboard gana siempre" se descartó: rompería el flujo real de trabajo (el vault es donde se escribe la campaña en serio, editar ahí tiene que seguir pisando). Un merge/conflicto explícito (avisar y dejar elegir) se descartó por sobrecomplicar una herramienta de un solo DM — la regla simple "si la nota no cambió, no la toco" cubre el caso real reportado sin necesitar UI de resolución de conflictos.

**Alcance, a propósito NO se aplicó a**:
- `arcs`: no tiene columna `obsidian_path` todavía (ver bug pendiente arriba) — sin eso no hay forma de indexar el `content_hash` contra la fila correcta. Se resuelve junto con ese pendiente.
- `sessions`: una sesión sin cambios en su propio contenido igual puede necesitar re-resolver `session_npcs`/`session_pcs` si un NPC mencionado en su prosa recién se creó/renombró en *este* reindex (el `NameIndex` crece durante la corrida) — saltearla podría dejar wikilinks sin resolver que sí resolverían hoy. Tampoco hay wiring de dashboard a `sessions` todavía, así que no hay riesgo real de pérdida que resolver ahí.

**Pendiente, no resuelto en esta pasada**: `vault_file_state` no se limpia cuando un archivo se borra del vault (`deleteStalePaths` no lo toca) — quedan filas huérfanas, inofensivas pero sin recolectar.

---

## `player_characters` extendido: race/class/status/spren_npc_id + tabla `pc_groups`

**Decisión**: `player_characters` solo tenía `player_name`/`character_name`/`backstory`/`progression_notes`/`obsidian_path` — el client (`PlayerEdit.tsx`) ya editaba `race`/`class`/`status`/`faction`/`links` desde antes, sin ningún backing real. Se encontró además un bug igual al de Arc: `JugadorFrontmatter.Estado` tenía `yaml:"estado"`, pero las 5 fichas reales de `Jugadores/` usan la clave `status:` — nunca matcheaba nada. Se corrigió a `Status string yaml:"status"`.

Migración `0007_player_characters_extend.sql`:
- `race TEXT`, `class TEXT`: texto libre, sin `CHECK`. `race` tiene backing real (`raza:` en 2/5 fichas del vault, opcional). `class` **no existe en ningún lado del vault** — es un campo dashboard-only (mismo trato que `backstory`/`progression_notes`, que tampoco vienen del vault). Se evaluó sacarlo del form por no tener fuente de datos, pero es exactamente el mismo caso que esos dos campos ya existentes — no hay motivo para tratarlo distinto. Texto libre, no se buscó modelar un enum de clases del sistema.
- `status TEXT CHECK IN ('vivo','muerto','desaparecido','activo')`: mismo vocabulario que NPC pero **sin** `consolidado` (es específico de spren fusionado, no aplica a un PJ).
- `spren_npc_id INTEGER REFERENCES npcs(id)` nullable, **no** vía `npc_relations` (que es NPC↔NPC, no PC↔NPC). Es 1:1 (un PJ tiene a lo sumo un spren) — no ameritaba una tabla de relaciones genérica como la de NPC, alcanza una FK simple. Se resuelve en el indexer (`resolvePCs`, calcado de `resolveNPCs`) contra el campo `spren:` del vault, que apunta a una nota de NPC con `npc_kind: spren`.
- `pc_groups (pc_id, group_id, role_in_group, PK(pc_id, group_id))`: calcado 1:1 de `npc_groups`, resuelto contra `facciones:` del vault (array de wikilinks, a diferencia de NPC que usa singular `faccion:`).

**Por qué NO viaja `spren_npc_id` en el `PUT` del dashboard**: mismo criterio que `vinculo_con` de NPC — es dato exclusivamente resuelto por el indexer del vault. Si viajara en el `UPDATE`, cada edición del dashboard (ej. cambiar `backstory`) lo pisaría a `NULL`, porque el form no tiene (ni tiene sentido que tenga, ver bug de `location_id` abajo) un selector de spren con IDs reales todavía.

**Bug relacionado, encontrado y arreglado en el camino**: `NPCRepository.Update` SÍ tenía `location_id` en su `UPDATE`, pero `NpcEdit.tsx` nunca mandaba un `location_id` real (el selector de ubicación usaba el breadcrumb como `value`, no el id) — cada edición de NPC desde el dashboard pisaba `location_id` a `NULL` en silencio. Se evaluó sacar `location_id` del `UPDATE` (como se hizo con `spren_npc_id` arriba) pero se descartó: a diferencia de `spren`/`vinculo_con`, la ubicación **sí** tiene un selector real y con intención de ser editable desde el dashboard. Se arregló wireando el selector a IDs reales (`Npc.locationId`, `NpcEdit.tsx` usa `value={l.id}` en vez de breadcrumb) en vez de capar el backend — el breadcrumb de display (`Npc.location`) ahora se computa en `App.tsx` (`campaignNpcs`) a partir de `locationId` + `campaignLocations`, no se guarda como string suelto.

**Pendiente en su momento, resuelto más abajo** ("Cierre de pendientes"): faltaba `GET /groups/{id}/pc-members` para mostrar PJs como miembros de una facción. `faction`/`links` en `PlayerEdit.tsx` siguen siendo cosmético-only en el dashboard (igual que en NPC), no se manda por PUT — esto sigue sin resolver.

---

## `attributes`/`skills` JSON en npcs y player_characters + tracker de combate (`encounters`/`encounter_participants`)

**Decisión**: migración `0012_character_sheets_and_encounters.sql` agrega `attributes TEXT NOT NULL DEFAULT '{}'` y `skills TEXT NOT NULL DEFAULT '{}'` a `npcs` y `player_characters`, más las tablas nuevas `encounters`/`encounter_participants`.

**Por qué JSON y no tablas normalizadas**: `campaign.system` es texto libre ("Cosmere RPG", "D&D 5e") y cada sistema define su propio set de atributos/habilidades (Cosmere: Velocidad/Fuerza/Voluntad/Intelecto/Presencia + 18 habilidades; D&D: Fuerza/Destreza/Constitución/Inteligencia/Sabiduría/Carisma + skills propias). Modelar una tabla de catálogo fija rompería en cuanto exista una segunda campaña con otro sistema. Mismo criterio que `class` (ver decisión de arriba, `player_characters extendido`): texto libre, sin `CHECK`, validación (si hace falta) del lado de la UI. Se prefirió JSON en vez de dejarlo fuera del modelo porque sí hace falta persistir el build completo de un personaje; se migraría a tabla normalizada solo si aparece un caso de uso real que necesite `JOIN`/filtrar por atributo individual entre personajes — no existe hoy.

**Por qué `npcs` también tiene estos campos, no solo `player_characters`**: la idea que disparó esto es la de NPC con ficha completa ("falso jugador") — un NPC importante (jefe, rival recurrente) armado con el mismo nivel de detalle mecánico que un PJ. Ya existe el bucket para esto: `detail_level = 'full'` (vs `'minor'`). No se creó una entidad nueva "NPC con hoja" separada de `npcs` — habría duplicado `notes`/`obsidian_path`/relaciones que ya tiene NPC sin necesidad. Para un NPC `detail_level='minor'`, ambos campos simplemente quedan en `'{}'` — no hay `CHECK` que ate `attributes`/`skills` a `detail_level`, alcanza con disciplina de la DJ.

**Tracker de combate — decisión revisada**: entradas previas de este documento asumían el tracker de combate como capa 2/3 fuera del MVP (ver diagrama de scope). Se reconsideró: la necesidad real es una vista **de control personal del DM**, no una feature compartida con jugadores — coincide con lo que ya se había anotado como excepción ("si existe, es una vista de control personal del DM"), así que entra al alcance actual bajo esa forma limitada.

- `encounters`: `campaign_id` + `session_id` nullable (se puede armar un combate sin sesión asociada todavía) + `round` + `status`. No tiene `obsidian_path` — no es una entidad que viva en el vault, es dato dashboard-only.
- `encounter_participants`: referencia opcional a `pc_id` **o** `npc_id` **o**, si ninguno aplica, `display_name` suelto — para enemigos genéricos de un solo uso (ej. "Bandido 3") sin crear una fila de `npcs` que después queda huérfana.
- **HP asimétrico a propósito**: la vida de un PJ es persistente entre sesiones (pertenece conceptualmente a `player_characters`, columna todavía no agregada — pendiente para cuando se implemente esa parte); la vida de un NPC es efímera por default, vive solo en `encounter_participants.current_hp` y se descarta al cerrar el encuentro, salvo que sea un NPC prepped (`detail_level='full'`) que puede traer `max_hp` de referencia desde su propia ficha.
- **Orden de turno, por sistema, mismas columnas**: `initiative_value` (D&D — número fijo por combate, se ordena la lista descendente) y `turn_type` (Cosmere — `CHECK IN ('rapido','lento')`, se reedita cada ronda, no hay orden numérico: confirmado leyendo `Manual_del_Archivo/10_combate.md` del vault, Cosmere RPG no usa tirada de iniciativa individual, sino fases fijas por ronda — PJs rápidos → PNJs rápidos → PJs lentos → PNJs lentos — con elección de bando en cada ronda y desempate por Velocidad y luego d20). No se modeló una tabla separada por sistema: ambas columnas conviven nullable en la misma tabla, cada sistema usa la que le corresponde.

**Pendiente en su momento, resuelto más abajo** ("Cierre de pendientes"): columna de HP persistente en `player_characters`.

**Nota de scope**: el mapa interactivo, que estas mismas entradas mencionaban antes como ítem de capa 2/3, se descarta del proyecto — no se va a implementar. Alcance MVP actualizado en `DATA_MODEL.md`.

---

## Wireo de `attributes`/`skills` (backend + UI) y tracker de combate: estados, iniciativa, ficha

**Contexto**: `0012` había agregado las columnas `attributes`/`skills` a `npcs`/`player_characters` como puro schema, sin backend Go ni UI (ver entrada anterior). Esta pasada completa el wireo end-to-end y construye la UI del tracker de combate (`EncountersList`/`EncounterDetail`).

**`status` de `encounters` — 3 valores, no 2**: se agregó `planificado` (antes solo `activo`/`cerrado`) porque un encounter puede armarse antes de jugarlo — mismo criterio que `arcs.status`. **Migración editada in-place en `0012`** porque en ese momento todavía no había corrido contra ningún DB real (confirmado antes de tocarla).

**`CHECK` de exclusión mutua en `encounter_participants`**: `(pc_id IS NOT NULL) + (npc_id IS NOT NULL) + (display_name IS NOT NULL) <= 1`, agregado a `0012` por el mismo motivo (no corrida aún) — mismo criterio de la decisión "CHECK constraints en campos enum-like", extendido a esta regla de integridad aunque no sea un enum.

**Migración `0013`, no editar `0012` de nuevo**: al agregar `attributes`/`skills` a `encounter_participants`, `0012` ya había corrido en el volumen Docker real (`rolboard_campaign_data`) — el error concreto fue un 500 en `GET /encounters/:id/participants` por columnas inexistentes. Se revirtió el intento de editar `0012` y se agregó `0013` con `ALTER TABLE` — refuerza la regla "nunca editar una migración ya aplicada" con un caso real, no hipotético.

**Dónde vive la edición de `attributes`/`skills`**: en `NpcEdit`/`PlayerEdit`, no en el tracker de combate. Por qué: son datos de la ficha del personaje (persistente, fuera de un combate puntual) — editarlos en el tracker mezclaría la vista operativa de la ronda con el build del personaje. Excepción: un enemigo ad-hoc (`display_name`, sin `npc_id`/`pc_id`) no tiene ficha en ningún otro lado — para ese caso sí se edita inline en el tracker (`encounter_participants.attributes`/`skills`, agregado en `0013`), es la única ubicación posible.

**Vista de ficha en el tracker — solo lectura para PJ/NPC vinculados**: botón "Ver ficha" abre un modal (`CharacterSheet`, componente compartido con `NpcDetail`/`PlayerDetail`) que lee `attributes`/`skills` de la entidad vinculada, no del participant. Incluye HP del combate actual (`current_hp`/`max_hp` de `encounter_participants`) porque eso sí es dato de la ronda, no del personaje — el personaje todavía no tiene HP persistente propio (pendiente, ver entrada anterior).

**División visual de `attributes` en dos filas de hasta 6**: los primeros 6 campos cargados (por orden de inserción del JSON, que en JS/Go se preserva) se muestran como "Atributos" (Fuerza, Destreza, etc.); del 7º al 12º como "Otros" (armadura, defensa, y similares). No se agregó un tercer campo al schema para distinguirlos — se decidió que no pagaba la complejidad de una migración nueva para algo que el orden de carga ya resuelve razonablemente. `skills` no tiene esta división: se muestra en tabla única ordenada alfabéticamente (no depende de orden de carga).

**Íconos en la ficha — variedad visual, no significado por campo**: 3 íconos fijos rotando por índice en cada sección (atributos, "otros", habilidades) — se descartó mapear íconos por nombre de campo (ej. "armadura" → ícono de escudo) por ser lógica frágil con vocabulario libre en español/inglés mezclado, para un beneficio puramente decorativo.

**Tracker de Cosmere — sin iniciativa tirada, fases fijas**: confirmado contra `Tracker de Iniciativa.md` del vault real — el sistema no usa iniciativa numérica, sino 4 fases por ronda (PJ rápido → PNJ rápido → PJ lento → PNJ lento), cada personaje elige rápido/lento y juega una sola vez por ronda. El tracker agrupa participantes por fase (`turn_type` × PJ/NPC) en vez de ordenar por `initiative_value` (ese campo es de D&D, se muestra pero no ordena). El "ya jugó su turno" es un checkbox local del navegador, no persistido en DB — se resetea solo al cambiar de ronda (estado de mesa, no de campaña, ver "Solo agrupar visualmente" más abajo). Al avanzar de ronda (`+1 ronda`) se limpia `turn_type` de todos los participantes (vía `PUT`), pero no `initiative_value`.

**Modal `size="sheet"`**: variante nueva de `Modal` (ancho ~680px, alto automático con tope de viewport y scroll interno) para la ficha — la variante `"large"` existente fuerza casi pantalla completa, incómodo para un contenido que normalmente entra en media pantalla. Usada de forma consistente en `NpcDetail`, `PlayerDetail` y el tracker, mismo tamaño en los tres lugares.

---

## Cierre de pendientes acumulados (HP persistente de PJ, `pc_groups` expuesto, `vault_file_state` huérfano)

**`ArcRepository.Create` sin `ON CONFLICT` / `arcs` sin `obsidian_path`**: revisado — ya estaba resuelto (migración `0009_arcs_obsidian_path_groups_extend.sql` agregó la columna, `ArcRepository.Create` ya tenía el `ON CONFLICT (campaign_id, obsidian_path)`). La nota "pendiente" había quedado desactualizada en el documento, no reflejaba el código real.

**HP persistente en `player_characters`**: migración `0014_player_characters_hp.sql` agrega `current_hp`/`max_hp` (`INTEGER`, nullable — un PJ recién creado no tiene vida cargada todavía). Wireado end-to-end: `PlayerEdit.tsx` tiene los inputs, `PlayerDetail.tsx`/`CharacterSheet` los muestran.

**Sincronización con `encounter_participants.current_hp`/`max_hp` para un PJ**: al agregar un PJ a un encuentro, su HP arranca desde el valor persistido en `player_characters` (no desde cero) — `EncounterDetail.addParticipant` lo lee de `playerCharacters` antes de armar el `POST`. Al editar el HP de un participante vinculado a un PJ durante el combate, se propaga de vuelta a `player_characters` (`onSyncPlayerHp`, reusa `savePlayer` del hook — mismo camino que cualquier edición de ficha, no un fetch aparte) para que la vida persista después de cerrar el encuentro. Para un NPC, no hay propagación — su HP sigue efímero, vive y muere con el `encounter_participants` (decisión ya tomada, sin cambios).

**`GET /groups/{id}/pc-members`**: nuevo endpoint, calcado de `GET /groups/{id}/members` pero contra `pc_groups`/`player_characters` en vez de `npc_groups`/`npcs`. Solo lectura — a diferencia de los miembros NPC (que se administran a mano desde el dashboard, `AddMember`/`RemoveMember`), `pc_groups` se puebla exclusivamente desde el indexer (campo `facciones:` del vault) — no tiene sentido un botón "Agregar PJ" en el dashboard para un dato que el vault ya gobierna. `FactionDetail` muestra la sección "Jugadores" solo si hay al menos un PJ vinculado (no un bloque vacío permanente).

**`vault_file_state` huérfano al borrar del vault**: `Indexer.deleteStalePaths` borraba la entidad (NPC/location/group/PC) pero nunca su fila en `vault_file_state` — quedaba una fila con `entity_id` apuntando a una entidad ya borrada, inofensiva pero sin recolectar indefinidamente. Se agregó `VaultFileStateRepository.Delete` y se llama junto con cada borrado de entidad stale. `sessions` queda afuera a propósito, mismo motivo que la entrada original de `vault_file_state` (nunca se le hizo `Set` en primer lugar, no hay nada que limpiar ahí).

---

## `Npc.faction`/`PlayerCharacter.faction` eliminados — eran decorativos, nunca persistían

**Contexto**: se evaluó agregar una FK `faccion_id` a `player_characters` para que el dropdown "Facción" de `PlayerEdit` funcionara de verdad. Al revisar el código se encontró que ese dropdown (y su equivalente en `NpcEdit`) **nunca hizo nada**: `mapNpc`/`mapPlayerCharacter` devuelven `faction: "—"` fijo, ninguno de los dos `toApiPayload` manda el campo — cualquier valor elegido en el `<select>` se descartaba en el próximo reload. `NpcList` además filtraba/mostraba una columna "Facción" que por lo mismo siempre decía `"—"`.

**Decisión**: no agregar la FK — hubiera sido una segunda fuente de verdad al lado de la que ya existe (`npc_groups`/`pc_groups`, many-to-many, poblada por el indexer desde el vault). Se eliminó el campo `faction` de `Npc`/`PlayerCharacter` (dominio, mappers, drafts en blanco, forms de edición, columna/búsqueda de `NpcList`, bloques de display muertos en `NpcDetail`/`PlayerDetail` que nunca renderizaban por la misma razón). La gestión real de membresía sigue siendo `FactionDetail` (`AddMember`/`RemoveMember` para NPC; solo lectura para PJ vía `pc-members`, ver entrada anterior).

**Por qué eliminar en vez de arreglar el dropdown**: arreglarlo (hacer que el `<select>` escriba a `npc_groups`/`pc_groups`) hubiera significado reimplementar ahí lo que `FactionDetail` ya hace bien — dos UIs para la misma acción, con el problema extra de que un PJ/NPC puede estar en más de una facción y un `<select>` de valor único no puede representar eso sin mentir. Eliminar el campo decorativo y señalar al lugar que ya funciona era la opción con menos código y menos superficie de bugs.

---

## `npc_groups`/`pc_groups` ganan `source` — el reindex pisaba en silencio membresías agregadas a mano

**Contexto**: al plantear exponer alta/baja de PJ en `FactionDetail` (mismo patrón que NPC), se encontró que `resolveNPCs`/`resolvePCs` en el indexer hacen `DELETE FROM npc_groups WHERE npc_id = ?` (ídem `pc_groups`) **en cada reindex**, después reinsertan desde el vault. Esto ya afectaba a NPC (que sí tenía botones `AddMember`/`RemoveMember` desde antes): agregar una facción a mano y después reindexar el vault borraba esa membresía sin aviso. No era un bug nuevo introducido por esta sesión, pero se decidió arreglarlo de raíz en vez de repetirlo para PJ.

**Decisión**: migración `0015_group_membership_source.sql` agrega `source TEXT NOT NULL DEFAULT 'dashboard' CHECK IN ('vault','dashboard','removed')` a ambas tablas puente.

- El indexer solo borra filas `source='vault'` (`DELETE ... AND source = 'vault'`) — lo agregado a mano nunca se toca en un reindex.
- El `INSERT` del indexer usa `ON CONFLICT DO UPDATE SET source = CASE WHEN source = 'removed' THEN 'removed' ELSE 'vault' END` — si el vault confirma una membresía que ya existía a mano, pasa a ser "del vault" (sin pérdida de dato); si estaba dada de baja a mano (`'removed'`), el reindex no la revive.
- **Baja lógica, no física**: `RemoveMember`/`RemovePCMember` pasan de `DELETE` a `UPDATE ... SET source = 'removed'` — mismo criterio que el resto del proyecto ("baja lógica, no `DELETE` físico"), aplicado acá a una tabla puente porque hace falta recordar la intención explícita de la DJ de sacar algo que el vault sigue afirmando. Sin esto, sacar a mano una membresía que el vault todavía lista hubiera sido inútil: el próximo reindex la revive en silencio, mismo problema que se estaba arreglando. `AddMember`/`AddPCMember` revive una fila `'removed'` (`ON CONFLICT DO UPDATE SET source = 'dashboard'`).
- `GetMembers`/`GetPCMembers` filtran `source != 'removed'`.

**`GET/POST/DELETE /api/groups/{id}/pc-members`**: con el bug de raíz resuelto, ya tiene sentido exponer alta/baja de PJ igual que NPC — se agregó `AddPCMember`/`RemovePCMember` (handler, service, repo) calcados de los de NPC, y la UI correspondiente en `FactionDetail` (antes solo mostraba PJs, ahora también permite agregar/sacar). La entrada anterior de este documento ("pc-members solo lectura, no tiene sentido un botón para un dato que el vault ya gobierna") queda superada por esto — la razón de fondo para no tener el botón era el bug del reindex, no que fuera conceptualmente incorrecto tener uno.
