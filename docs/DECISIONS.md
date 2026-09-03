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

**Decisión**: `POST /api/admin/reindex`, disparado por un botón en el dashboard. El endpoint bloquea hasta terminar (síncrono) y siempre reindexa todo desde cero (no incremental).

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
