# Decisiones

[English](DECISIONS.md)

Decisiones vigentes y su porqué. Si una cambia, se reescribe aquí; el historial queda en git.

---

## Alcance: herramienta del DM, no de los jugadores

Un solo usuario (el DM), sin vistas para jugadores, sin estado compartido en vivo. Por eso no hay WebSockets, ni multiusuario, ni mapa de combate con tokens (se evaluó y se descartó: no aporta en una mesa donde nadie más mira la pantalla).

"Un usuario" no significa "sin seguridad": el DM entra desde varios dispositivos por red, así que hay auth por campaña, token de admin y rate limit, y todo contenido subido se trata como hostil.

## Stack

- **Go + `net/http` stdlib.** `ServeMux` ya tiene métodos y path params; un router de terceros no aporta nada para este tamaño. Además es un proyecto de aprendizaje de Go.
- **SQL crudo con `database/sql`**, sin ORM.
- **SQLite (`modernc.org/sqlite`, sin cgo).** Un usuario, pocos cientos de entidades, sin servidor de base que mantener. Binario estático.
- **React + TypeScript + Vite (SPA).** La UI es interactiva (tracker, formularios, modales); no hace falta SSR ni SEO, así que Next.js sobra.
- **CSS plano con tokens** (`client/src/styles/tokens.css`), sin Tailwind ni CSS-in-JS.
- **Caddy** sirve la SPA y proxea `/api`, así SPA y API comparten origen y no hace falta CORS.
- Carpetas `server/` y `client/`, sin tooling de monorepo.

## Multi-campaña

Un backend, varias campañas. Cada una con su `vault_path` (subcarpeta de `VAULTS_ROOT`), su código de acceso y sus datos aislados: el middleware verifica que cada recurso pertenezca a la campaña de la sesión.

## Autenticación

- Código de acceso por campaña (bcrypt), sesión en cookie `HttpOnly` con el hash del token en `auth_sessions`.
- Token de admin de instancia, preferentemente como secret (`ADMIN_TOKEN_FILE`). Su sesión vive en memoria: reiniciar el server obliga a volver a entrar, y está bien.
- `SameSite=Lax` es la protección CSRF. No relajarlo.
- `GET /api/campaigns` es público pero recortado (`id, name, system, status`): la pantalla de selección lo necesita antes de haber sesión, y no debe filtrar `vault_path`.

## Vault de Obsidian: fuente de la prosa, no de todo

- El dashboard indexa frontmatter y guarda `obsidian_path` para abrir o renderizar la nota. Abrir en Obsidian (`obsidian://`) es una función de primera clase en la web; la app de escritorio lo oculta (el webview no puede delegar esquemas propios).
- Lo que el vault no modela bien vive solo en la DB: quests, notas de preparación, `class`/`backstory` de PJs, fichas, HP, imágenes. Se mueve más contenido a la DB solo cuando aparece una necesidad concreta.
- Quests no tienen nota en el vault; `session_quests` se maneja solo desde el dashboard.

## Reindex

- Endpoint HTTP por campaña, síncrono.
- Upsert por `(campaign_id, obsidian_path)`; notas borradas → baja lógica.
- Notas sin cambios (hash en `vault_file_state`) no se reprocesan, para no sobrescribir ediciones hechas en el dashboard. Si la nota cambió, gana el vault. No hay UI de conflictos.
- Membresías con `source` (`vault` / `dashboard` / `removed`) para que el reindex no borre lo agregado a mano ni reviva lo quitado a mano.
- `session_npcs` / `session_pcs` salen de los wikilinks del cuerpo de la sesión: así se escriben naturalmente las notas, sin campos extra.
- Wikilinks se resuelven por nombre + tipo esperado; si hay ambigüedad no se adivina.

## Modelo de datos

- Migraciones SQL versionadas y embebidas. Nunca se edita una ya aplicada.
- Baja lógica (`deleted_at`) y `ON DELETE RESTRICT`: perder datos por un borrado en cascada es peor que desvincular a mano.
- Enums con `CHECK` en la base, no solo en Go.
- Timestamps `TEXT` ISO 8601: legibles con `sqlite3`, el costo de performance no importa aquí.
- PK compuesta en tablas puente.
- Sin índices sobre FKs todavía: con este volumen un scan es instantáneo.
- `groups` y `player_characters` son entidades propias desde el principio.
- `npc_relations` dirigida con rol libre, en lugar de un campo fijo de vínculo.
- `attributes` / `skills` como JSON libre: cada sistema de juego (Cosmere, D&D) define los suyos; no hay caso que necesite filtrar por atributo.
- NPC importante con ficha completa = `detail_level = full`, no una entidad aparte.

## Tracker de combate

- Vista de control del DM, en lista. Sin mapa.
- Participante = PJ, NPC o enemigo suelto (`display_name`), exclusivo por `CHECK`. Los enemigos sueltos tienen ficha propia en el participante; PJ/NPC usan la de su entidad (solo lectura en el tracker).
- Orden: `initiative_value` para D&D; `turn_type` rápido/lento para Cosmere (fases por ronda, sin iniciativa numérica). Al avanzar de ronda se limpia `turn_type`.
- El HP de PJs y NPCs persiste en su entidad (`player_characters` / `npcs`, ambos opcionales) y se sincroniza desde el tracker: un NPC que sobrevive a un combate llega al siguiente con sus heridas. Los enemigos sueltos solo tienen el HP del participante.
- "Ya jugó" es estado local del navegador, no se guarda.
- Un encuentro cerrado es de solo lectura (si no, pisaría el HP actual de las entidades con valores viejos); "Reabrir" lo vuelve a `activo`.
- El HP se modifica con montos de daño/curación: la curación no pasa del HP máximo, y el daño frena en 0 (caído) antes de que otro golpe lo lleve a negativo. Un HP por encima del máximo (cargado a mano) se ve como un segmento aparte en la barra.

## Frontend

- `CrystalType` (color por tipo de entidad) y `StatusKind` (semáforo de estado) nunca se mezclan en el mismo elemento.
- NPCs `referencia` (notas índice del vault) se filtran en el cliente: no son personajes.
- `activo` → alive, `consolidado` → dead en el semáforo.
- La membresía a facciones se gestiona solo desde la facción (un PJ/NPC puede estar en varias).
- i18n español/inglés propio (`lib/i18n.ts`), sin librería.

## Imágenes

- Una imagen por NPC, PJ, locación y facción (`image_path`). La misma sirve para el retrato grande y el ícono chico (CSS). Sin galería ni tabla polimórfica.
- En filesystem bajo `UPLOADS_ROOT`, no BLOB: la base y los backups quedan livianos. Fuera del vault.
- Se escribe solo por su endpoint, nunca por el `PUT` de la entidad (un save del formulario no la sobrescribe) ni por el reindex.
- **Solo PNG y JPEG**, detectados decodificando el contenido. SVG rechazado: se serviría desde el mismo origen y podría ejecutar JS con la sesión del DM. WebP/AVIF requerirían una dependencia nueva.
- La ruta en disco se construye (`<entidad>/<id>-portrait.<ext>`); el nombre subido nunca se usa. Cierra path traversal.
- Máx. 5 MiB y `X-Content-Type-Options: nosniff` al servir.
- Compresión: el cliente reduce a 1600 px y JPEG antes de subir (canvas, sin dependencias). Sin procesamiento en el servidor.
- Al dar de baja una entidad, su archivo queda en disco (deuda aceptada).

## Logging

- `log/slog` estructurado; `LOG_JSON=true` para JSON en producción.
- Middleware de request log: `method, path, status, duración, remote`.
- Eventos de auth en `Warn`: login fallido, sesión inválida, mismatch de campaña, admin rechazado. Nunca se loguean códigos ni tokens.

## App de escritorio

- **Mismo código, segundo entrypoint.** `cmd/server` (Docker) y `cmd/desktop` (Wails) llaman a `app.New`; solo cambian la config y el transporte.
- **Wails v2 sobre v3.** v2 es estable; v3 seguía en beta. Reevaluar cuando v3 sea estable.
- **Sin red.** El webview habla con el router dentro del proceso vía `AssetServer.Handler`: no hay puerto, así que no hay superficie de DNS rebinding ni CSRF.
- **El modo local lo activa solo `cmd/desktop`, nunca una env var**, para que un contenedor mal configurado no quede sin auth. En modo local todo request es admin; `GET /api/admin/session` devuelve `{"localMode": true}` y el cliente oculta códigos de acceso, logout y "Abrir en Obsidian".
- **Datos en `os.UserConfigDir()/rolboard/`**: `config.json` (carpeta de vaults), `rolboard.db`, `uploads/`. La carpeta de vaults es opcional: se elige con un diálogo nativo desde el campo "Carpeta de vaults" de los formularios de campaña (`POST /api/desktop/vaults-root`), que reconstruye la app en caliente, sin reiniciar. Sin ella, las campañas funcionan solo como dashboard. La app no tiene barra de menú.
- **Links externos** pasan por `POST /api/desktop/open`, que solo acepta URLs `https` y llama a `runtime.BrowserOpenURL`. El runtime JS de Wails solo se inyecta en `/`, así que falta después de recargar una deep link.
- **Parches para WebKitGTK (Linux):** las subidas de imágenes mandan el multipart ya serializado a bytes, porque Wails lee los bodies fuera del hilo principal de GTK y crashea con un body que referencia un `File`. Los selects usan `appearance: base-select` para que el desplegable sea HTML y no un menú de GTK.
- **Empaquetado:** `.exe` sin firmar (compilado desde Linux, sin CGO) y AppImage que usa la `libwebkit2gtk-4.1` del sistema.
