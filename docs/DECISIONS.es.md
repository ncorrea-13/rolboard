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
- `SameSite=Strict` es la protección CSRF. No relajarlo.
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
- `origen` y `subtipo` son texto libre en los NPC (antes `etnia` y `tipo_spren`); el parser del vault conserva las keys viejas como alias para que las notas existentes no pierdan el valor en el próximo reindex. `wardails` mantiene el nombre en el código y la API; la UI lo muestra como "Temas sensibles".
- **El export es Markdown en el formato propio del indexador**, así que sirve de respaldo y de salida. Las imágenes van en `Imagenes/`, con el nombre de su nota; la papelera queda afuera (borrado es borrado). Lo que el vault nunca tuvo (quests, secretos, objetos...) va a carpetas propias, que el indexador ignora.
- **`Lore/` en el vault solo fija título, categoría, arco y locación.** El texto queda en la nota (se ve renderizado desde la entrada) y el `body` de la base sigue siendo del dashboard, igual que la descripción de un NPC.
- Los vínculos NPC ↔ jugador viven en `npc_player_relations` (rol libre, `source` como en los puentes de grupos), no en una columna de spren: un mismo NPC puede estar atado a varios personajes y entra cualquier tipo de vínculo. El vault los declara desde la nota del NPC (`vinculado_a`), sin rol. Borrar un NPC con vínculos está permitido: las lecturas ocultan los vínculos de filas borradas.
- `attributes` / `skills` como JSON libre: cada sistema de juego (Cosmere, D&D) define los suyos; no hay caso que necesite filtrar por atributo.
- NPC importante con ficha completa = `detail_level = full`, no una entidad aparte.

## Bajas y papelera

- **Nada se borra para siempre.** `DELETE` es baja lógica y la pantalla de papelera lo restaura. No hay "vaciar papelera": un borrado físico necesitaría una cascada que este esquema evita a propósito.
- **Se bloquea la baja cuando dejaría huérfanos visibles:** un arco con sesiones activas, una ubicación con NPCs o sub-ubicaciones activas. `409` con un código, y el usuario mueve primero a los dependientes. No se bloquea, a propósito: sesiones con encuentros (el encuentro solo pierde su vínculo), el líder de una facción (la UI ya avisa) ni las tablas puente sesión↔NPC/quest (son historia; las lecturas filtran lo borrado).
- **Restaurar revisa a los padres.** Una sesión, NPC o ubicación cuyo arco o ubicación sigue borrado no se puede restaurar (`restore_parent_deleted`), así que restaurar nunca crea un huérfano.
- **El número de sesión es único solo entre sesiones activas** (índice parcial), así que un número borrado se puede reutilizar. A cambio: restaurar puede dar `409` si el número se reutilizó.
- **Las sesiones archivadas por el vault (`sub_number = 99`) no van a la papelera.** Ese estado lo maneja el vault: el próximo reindex las archivaría de nuevo.
- **Un reindex puede revivir un registro borrado desde la UI** si su nota sigue en el vault: el vault es la fuente de verdad de lo que contiene. Para quitarlo del todo, borrá o archivá la nota.
- **El número de sesión lo sigue proponiendo el cliente** (`max + 1`). Con un DM por campaña una carrera es improbable, y el índice único la convierte en un `409` en vez de datos corruptos.
- **El cliente traduce los errores de la API, no el servidor.** El texto de `http.Error` está en inglés y es para los logs; solo los errores sobre los que el usuario puede actuar llevan un `code` que la UI mapea al idioma de la app. El resto muestra un mensaje genérico según el estado.
- **Las confirmaciones usan un diálogo propio**, no el `confirm()` del navegador: respeta el estilo y el idioma de la app y funciona en los webviews de escritorio y Android.

## Lore

- **Por campaña, no compartido.** No hay entidad "mundo": rompería el aislamiento por campaña (auth, vault, reindex, papelera).
- **Las categorías son datos, no un enum**, mismo patrón que `npc_types`: cada campaña tiene las suyas, sembradas al crearla. Una entrada puede no tener categoría.
- **Una categoría usada por cualquier entrada no se puede borrar** (`409`), contando también las entradas dadas de baja, para que restaurar nunca apunte a una categoría inexistente.
- **Borrar un arco o una locación no se bloquea por entradas de lore.** El vínculo es opcional y la entrada simplemente deja de mostrarlo.

## Objetos y economía

- **Narrativo, no una simulación.** Un objeto tiene un "qué hace" en texto libre, categoría y rareza; no hay bonos mecánicos ni oferta y demanda.
- **Una moneda base opcional por campaña.** Las demás llevan `rate_to_base`; marcar una nueva base mueve la marca. Las monedas no dependen del sistema de juego: cada campaña define las suyas.
- **Precios por moneda.** Un objeto puede costar 5 esferas o 2 de oro; una tienda puede pisar el precio de catálogo en su locación.
- **Una moneda usada por un objeto o un precio de tienda no se puede borrar** (`409`).

## Búsqueda y "aparece en"

- **La búsqueda es del lado del cliente.** Toda entidad de la campaña ya está cargada en memoria, así que la paleta (Ctrl/Cmd+K o el botón del sidebar) filtra localmente: sin endpoint y sin índice que mantener sincronizado. El orden prioriza el título, luego el subtítulo y luego el cuerpo; ignora tildes y mayúsculas.
- **"Aparece en" se calcula donde viven los datos.** Las sesiones, quests y encuentros de un NPC o un jugador salen de `GET .../appearances` (requieren joins inversos); locaciones, facciones y lore usan las listas que el cliente ya tiene (lore, eventos de la línea de tiempo, secretos, NPCs, monedas).

## Secretos

- **Un secreto no está atado a un solo NPC.** Apunta opcionalmente a un NPC, una locación o una entrada de lore (de qué trata), y un bridge aparte lista quién lo conoce.
- **Revelar guarda la sesión.** Al revelar se guarda la sesión (opcional); al volver a ocultarlo se limpia, para que una sesión nunca quede asociada a un secreto oculto.

## Línea de tiempo

- **Fechas en texto libre, orden numérico.** Cada setting tiene su calendario y no se puede parsear, así que `date_label` solo se muestra y `sort_key` (escrito a mano) ordena. Insertar un evento en el medio no obliga a renumerar.
- **Varias cronologías, una vista.** Las cronologías son carriles (historia del mundo, crónica de la campaña, una guerra) que se muestran juntos y se filtran con chips. "Eventos de la facción X / del lugar Y" son filtros sobre `group_id` / `location_id`, no cronologías extra; filtrar por locación incluye sus sub-locaciones.
- **Un evento pertenece a una sola cronología.** La relación muchos a muchos queda afuera hasta que haga falta.
- **El primer evento crea una cronología por defecto**, sin exigir un paso previo.

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
- **Cielo violeta y círculos mágicos (`styles/aura.css`, `components/Sigil.tsx`):** nítido en el splash y el selector de campañas; difuso (`aura--soft`) y tenue en la ayuda y detrás de las pantallas de campaña (`AppShell`), con uno de tres diseños según la sección (círculo, astrolabio para el mundo, runas para combate y secretos). Las tarjetas conservan su propia superficie, así que los datos nunca quedan directamente sobre el fondo. Es una capa estática: Android WebView y webkit2gtk no tienen animación por scroll, y un SVG quieto es barato en celulares de gama baja y OLED. El blur es un solo `filter` sobre dos capas: probarlo en Android de gama baja. Se puede apagar en los ajustes de la app (escritorio y Android): una marca en `localStorage` (`lib/appearance.ts`) pone `data-aura="off"` en `<html>` y `aura.css` oculta las capas. En Docker no hay engranaje: la env `AURA=off` del cliente la sirve Caddy como `/config.json` y se lee al arrancar (la elección del dispositivo, si existe, gana).

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
- **Datos en `os.UserConfigDir()/rolboard/`**: `config.json` (carpetas de vaults y de sincronización), `rolboard.db`, `uploads/`. Las dos carpetas son opcionales y se eligen con un diálogo nativo desde **Ajustes de la app**, el engranaje del selector de campañas (`POST /api/desktop/vaults-root`, `POST /api/desktop/sync-dir`). Cambiar una reconstruye la app en caliente, sin reiniciar. Son ajustes de cada dispositivo, así que no están en los formularios de campaña ni en Docker, que usa `VAULTS_ROOT`. Sin carpeta de vaults, las campañas funcionan solo como dashboard. La app no tiene barra de menú.
- **Links externos** pasan por `POST /api/desktop/open`, que solo acepta URLs `https` y llama a `runtime.BrowserOpenURL`. El runtime JS de Wails solo se inyecta en `/`, así que falta después de recargar una deep link.
- **Parches para WebKitGTK (Linux):** las subidas de imágenes mandan el multipart ya serializado a bytes, porque Wails lee los bodies fuera del hilo principal de GTK y crashea con un body que referencia un `File`. Los selects usan `appearance: base-select` para que el desplegable sea HTML y no un menú de GTK.
- **Aviso de actualización, no auto-update.** La app solo enlaza a la página de descargas del sitio cuando existe un release más nuevo en GitHub; reemplazar un binario en caliente (o un APK) es mucho código y superficie de ataque para poca ganancia.
- **Empaquetado:** `.exe` sin firmar (compilado desde Linux, sin CGO) y AppImage que usa la `libwebkit2gtk-4.1` del sistema.

## Sincronización entre dispositivos

- **La base de trabajo nunca sale del dispositivo.** Una herramienta de sincronización que copia un SQLite abierto (con su WAL) lo corrompe, así que cada dispositivo exporta una copia (`VACUUM INTO` a un temporal, fsync, rename) e importa la del otro. Sirve cualquier herramienta que sincronice una carpeta: Syncthing, una nube o copiar el archivo a mano.
- **Cambios detectados por SHA-256**, no por mtime, que las herramientas de sincronización y las copias no conservan de forma confiable.
- **Exportar solo después de escrituras locales.** Si no, un dispositivo que solo leyó datos pisaría una copia más nueva de otro.
- **Gana la última copia, más una copia de conflicto.** Si cambiaron los dos lados, la copia del otro dispositivo queda como `rolboard.conflict.db`. Mezclar cambios queda fuera de alcance: la app está pensada para un dispositivo por vez.
- **Al importar se valida el esquema** contra las migraciones embebidas y se rechaza una copia de una versión más nueva. La base local anterior queda como `.bak`.
- **Las imágenes van en `uploads/` dentro de la carpeta de sincronización**; `config.json` no se sincroniza porque tiene rutas propias de cada máquina.
- Compartido entre escritorio y Android vía `internal/desktop.Runtime` e `internal/snapshot`.

## App de Android

- **gomobile y no Wails v3.** v3 tiene Android, pero seguía en beta con bugs abiertos de ciclo de vida. gomobile lo mantiene el equipo de Go y el `WebView` de Android es estable. Reevaluar cuando v3 sea estable.
- **Sin servidor en `localhost`**, igual que en escritorio: el `WebView` carga un origen virtual (`https://rolboard.local`) y los requests se interceptan. Los GET van por `shouldInterceptRequest`; las escrituras, por un `JavascriptInterface`, porque Android no expone los cuerpos de POST a la intercepción.
- **El vault se lee por ruta** con "Acceso a todos los archivos", en vez de copiarlo con el Storage Access Framework: un vault ya sincronizado en el teléfono queda al día sin pasos extra. Google Play casi nunca aprueba ese permiso; para un APK en GitHub no es problema.
- **Se mantiene `modernc.org/sqlite`, solo ARM64.** Anda en ARM64 (probado en un teléfono), pero en x86_64 `modernc.org/libc` usa `SYS_lstat`, que el filtro seccomp de Android bloquea. Solo se distribuye `arm64-v8a`; si alguna vez hace falta x86_64, la alternativa es `ncruces/go-sqlite3`.
- **Kotlin, sin AndroidX**, una sola `Activity`. AGP 9 trae Kotlin incorporado, así que no hay plugin extra.
- **Build en un contenedor** (`docker-compose.android.yml`): no hace falta el SDK de Android en la máquina de desarrollo.
- **Firmado con clave propia**, no con una clave de debug pública: la firma es lo que prueba que una actualización viene del proyecto, y la app tiene "Acceso a todos los archivos". Dos secrets: la keystore en base64 y una contraseña; el alias es fijo.
- **ID de aplicación `io.github.ncorrea_13.rolboard`:** un dominio atado a la cuenta de GitHub que lo publica. Los IDs no admiten guiones, por eso el guion bajo. No se puede cambiar nunca sin que pase a ser otra app.
- **APK en GitHub Releases, no Google Play**, por ahora.

## Agentes de IA (MCP)

- **MCP por stdio, un cliente más de la API REST.** El asistente lanza un proceso local que habla MCP por stdin/stdout y llama a la misma `/api` que usa el frontend. No importa `internal/service` ni abre la base, así que la auth, la validación y el borrado lógico le aplican igual. SDK: `github.com/modelcontextprotocol/go-sdk`.
- **Sin claves de API ni OAuth.** El asistente sigue usando la cuenta del usuario con su proveedor. OAuth solo tendría sentido con un endpoint MCP HTTP público, que dejaría la instancia en internet. Eso descarta también a ChatGPT (llama desde la nube de OpenAI) y a la app de escritorio de Gemini (sin MCP propio). Android no tiene cliente MCP.
- **Escritorio: un unix socket, no SQLite ni un puerto.** Otro proceso escribiendo la base saltearía el flag `dirty` de `Runtime`: el próximo `Pull` podría reemplazar la DB local con el snapshot de otro dispositivo y perder las escrituras. Un puerto en `localhost` reabriría la superficie de DNS rebinding y CSRF que "Sin red" cerró. El socket (`mcp.sock`, `0600`, en la carpeta de datos) solo sirve `/api/`: `/api/desktop/*` responde `404`, así que un agente no puede abrir diálogos ni reescribir la config de otros clientes. Las escrituras programan el push de sincronización igual que el webview.
- **Apagado por defecto.** En modo local cada request es admin, así que el usuario enciende el socket en **Ajustes de la app** (`mcpEnabled` en `config.json`). La app tiene que estar abierta; cerrada, el asistente recibe un error claro.
- **Un solo ejecutable para el usuario no técnico.** El cliente lanza el ejecutable de la propia app como `rolboard mcp`, un puente stdio hacia el socket que corre antes de que arranque Wails. El botón de conexión apunta el cliente a esa ruta (`$APPIMAGE` en Linux, porque la ruta de montaje cambia en cada ejecución) y **Reconectar** la corrige tras mover o actualizar la app.
- **Docker: `rolboard-mcp` con el código de acceso de la campaña**, no el token de admin. El código limita al agente a una campaña; el token de admin además expondría todas las campañas, el cambio de códigos y las rutas de admin. Costo: una entrada por campaña. Es un binario chico aparte (sin CGO) que va en el release, no en la imagen del servidor.
- **El código de acceso se escribe una vez con `rolboard-mcp login`**, oculto como `sudo`, se comprueba contra el servidor y se guarda en `<UserConfigDir>/rolboard/mcp-<campaña>.code` (`0600`). Nunca va en el archivo de config del cliente, en una línea de comandos ni en un log, y el asistente no lo ve. Texto plano con la protección de una clave SSH es el trade-off aceptado: la alternativa era depender de un gestor de credenciales externo. En Windows el modo no se aplica; protege la ACL de la carpeta de perfil. El login de campaña tiene rate limit de 5 por minuto, así que el cliente entra una vez y reintenta un `401` una sola vez.
- **Lee casi todo y escribe poco.** Los `list_*` devuelven resúmenes y los `get_*` el detalle, para que una campaña con cientos de NPCs no llene el contexto del modelo. Escribe `create_loose_note`, `update_loose_note`, `update_session_prep`, `create_npc`, `create_quest`, `create_lore`, `create_item`, `update_inventory_item` y `update_shop_item`; toda tool de escritura declara su hint de destructividad. **No hay tool de borrado.** Los secretos se pueden leer a propósito: el único usuario es el DM, y lo que el asistente lee va a su proveedor.
- **Los archivos de config se editan solo desde el botón de escritorio**, con confirmación, un `<archivo>.rolboard.bak` del original (solo la primera vez), siguiendo symlinks y conservando las demás claves. El TOML de Codex se edita como texto, para no sumar una dependencia. Un `opencode.json` con comentarios (JSONC) se rechaza en vez de reescribirlo sin ellos.
