# Plan: servidor MCP

Exponer la campaña a clientes MCP de escritorio (Claude Desktop, Claude Code, Codex app/CLI, Antigravity 2.0) para consultarla y capturar ideas desde el agente. Cuando se implemente, lo vigente pasa a `DECISIONS.md` / `ARCHITECTURE.md` / `DESKTOP.md` / `API.md` y este archivo se borra.

## Alcance

- **Clientes:** solo los que lanzan un proceso local por stdio. Ningún camino necesita API key: el usuario entra al cliente con su cuenta.

  | Cliente | Windows | Linux | Para no técnicos |
  | --- | --- | --- | --- |
  | Claude Desktop | sí | sin build oficial (a verificar) | sí |
  | Codex app | sí | a verificar | sí |
  | Antigravity 2.0 | sí | sí | más o menos (orientado a agentes de código) |
  | Claude Code, Codex CLI, Antigravity CLI (`agy`) | sí | sí | no |

- **Quedan afuera**, y se reevalúan si cambian:
  - ChatGPT (app/web): llama desde la nube de OpenAI y solo acepta servidores HTTPS públicos; la instancia vive en una tailnet sin exposición pública.
  - Gemini para escritorio (Windows y macOS, sin Linux): no soporta MCP propio. Solo se integra con apps de Google, y el soporte de MCP aparece en pruebas sin lanzamiento oficial.
- **Backends:** las dos formas de correr Rolboard.
  - **Docker en la tailnet:** el MCP habla con la API por HTTPS (`tailscale serve`), con login por access code.
  - **App de escritorio:** el MCP habla con la app abierta por un unix socket local.
- **Sin OAuth.** Con stdio no hace falta: la tailnet es la capa de red y el access code el control de acceso. OAuth solo tendría sentido con un endpoint MCP HTTP público.
- **Android:** fuera. No hay cliente MCP en el teléfono.
- **Secretos:** se exponen. El único usuario es el DM.

## Arquitectura

```
Claude Desktop / Codex / Antigravity
        │ stdio (JSON-RPC, una línea por mensaje)
        ▼
rolboard mcp  ──  internal/mcpserver (tools)  ──  cliente HTTP de la API
                                               │
                     ┌─────────────────────────┴─────────────────────────┐
                     │ TCP + cookie de campaña                           │ unix socket, sin auth (local mode)
                     ▼                                                   ▼
          Docker en la tailnet (Caddy → server)              app de escritorio abierta (Runtime)
```

- **Un solo cliente, dos transportes.** El MCP es un cliente más de la API REST, como el frontend: no importa `internal/service` ni abre la DB. Reutiliza los structs de `internal/models` para decodificar las respuestas, que son la única fuente del formato JSON. Lo único que cambia entre backends es el `http.Transport` (dial TCP o dial unix) y si hace login.
- **Por qué no SQLite directo en desktop:** `Runtime` detecta cambios con un flag en memoria (`dirty`, `internal/desktop/runtime.go:49`) que se marca en cada request de escritura. Si otro proceso escribe el archivo, la app no exporta, y el próximo `Pull` reemplaza la DB local con el snapshot de otro dispositivo, así que los cambios quedan solo en `.bak`. Además, `Import` reemplaza el archivo con el MCP potencialmente teniéndolo abierto.
- **Por qué no un puerto en localhost:** reabre la superficie de DNS rebinding y CSRF que la decisión "No network" cerró.
- **Costo del socket:** solo funciona con la app abierta. Con la app cerrada, cada tool responde un error claro ("Abrí Rolboard").

### Paquetes y binarios

- `server/internal/mcpserver/`: cliente HTTP, definición de tools y `Run(ctx, cfg)`. Mismo patrón que `app.New`: un paquete, dos entrypoints.
- `server/cmd/mcp/`: binario standalone `rolboard-mcp`, sin CGO, para quien usa Docker en la tailnet y no tiene la app instalada.
- `server/cmd/desktop`: subcomando `rolboard mcp` que llama a `mcpserver.Run` **antes** de arrancar Wails. El botón de conexión apunta al propio ejecutable y no hay un binario extra que distribuir. Depende del spike de la Fase 0 (stdio en el `.exe` GUI de Windows); si falla, la app desktop usa `rolboard-mcp`.
- SDK: `github.com/modelcontextprotocol/go-sdk` **v1.8.0** (dependencia nueva; pide Go 1.25, el proyecto usa 1.27). Trae `github.com/google/jsonschema-go` como dependencia. Las firmas del esqueleto están verificadas contra el código fuente de esa versión.

### Socket en la app de escritorio

- Ruta: `os.UserConfigDir()/rolboard/mcp.sock`, permisos `0600`. Cualquier proceso del usuario ya puede leer `rolboard.db`, así que el socket no da privilegios nuevos.
- **El handler del socket no es `d` entero.** `desktopApp.ServeHTTP` también atiende `/api/desktop/*` (diálogos nativos, `BrowserOpenURL`, cambio de carpetas) y el SPA. El socket usa un handler propio que:
  - solo acepta `/api/`;
  - rechaza `/api/desktop/` con `404`;
  - llama a `rt.ServeHTTP` y, si no es GET, a `d.schedulePush()`, igual que `cmd/desktop/main.go:151-155`.
- Al arrancar se borra un socket viejo (crash anterior). Si el listen falla (por ejemplo, otra instancia abierta), se loguea y la app sigue sin MCP.
- On/off en App settings, guardado en `config.json` (`mcpEnabled`). **Apagado por default**: en local mode cada request es admin.
- Límite: la ruta de un unix socket tiene un máximo de unos 108 bytes. `UserConfigDir` cabe en casos normales; si el path es más largo, se loguea el error y no hay socket.

## Tools v1

Todas reciben `campaign_id`, salvo `list_campaigns`. No hay tools de borrado ni de imágenes.

**Lectura** (`ReadOnlyHint: true`)

- `list_campaigns`
- Listar y leer: NPCs, personajes jugadores, sesiones, quests, locaciones, facciones, lore, notas sueltas, secretos, timeline.
  - Los `list_*` devuelven una vista resumida (id, nombre/título, tipo, estado), y los `get_*` el detalle. Una campaña con cientos de NPCs completos llenaría el contexto del modelo.
  - Las listas se devuelven envueltas en un struct (`{"items": [...]}`). La v1.8 del SDK acepta slices como salida, pero un objeto es lo que espera cualquier cliente.
- `get_appearances` (NPC / PC): reutiliza `GET .../appearances`.
- `search`: la búsqueda es client-side (no hay endpoint). El MCP trae las listas y filtra con el mismo criterio (título, subtítulo y cuerpo, sin tildes ni mayúsculas). Si resulta lento, la alternativa es mover la búsqueda al server: es una decisión aparte.

**Escritura** (`ReadOnlyHint: false`, `DestructiveHint: false` salvo en los updates)

- `create_loose_note`, `update_loose_note`
- `update_session_prep`: `PUT /api/sessions/{id}` reemplaza la entidad entera, así que la tool hace GET, cambia `prep_notes` y hace PUT con el resto intacto. Un `409 session_conflict` se devuelve como error de la tool.
- `create_npc`, `create_quest`, `create_lore`: solo crear, no editar. Una entidad creada desde el MCP no tiene nota en el vault; vive solo en la DB, igual que una creada desde el dashboard.
- Los valores válidos de los enums (`status`, `npc_kind`, `detail_level`…) salen de los `CHECK` de las migraciones. Van en la descripción del campo (`jsonschema:"..."`) para que el modelo no invente valores; un valor inválido igual vuelve como `400` y se devuelve como error de la tool.

## Conexión con los clientes

| Cliente | Dónde | Formato |
| --- | --- | --- |
| Claude Desktop | Windows: `%APPDATA%\Claude\claude_desktop_config.json`; macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` (a verificar) | JSON, `mcpServers.<name>.{command,args,env}` |
| Claude Code | `claude mcp add rolboard -- <exe> mcp` | CLI |
| Codex (app, CLI e IDE) | `~/.codex/config.toml`, `[mcp_servers.rolboard]` con `command` y `args` | TOML |
| Antigravity 2.0 | `~/.gemini/config/mcp_config.json` (compartido con IDE y `agy`, a verificar con la app 2.0) | JSON, `mcpServers.<name>.{command,args}`; los remotos usan `serverUrl`, no `url` |

Antigravity también tiene plugins instalables desde la UI (Settings → Customizations). Un plugin de Rolboard daría instalación de un clic, pero queda para después de la v1: primero hay que ver si un plugin puede declarar un MCP stdio local.

**Configuración del binario:**

- Desktop: `rolboard mcp` sin argumentos usa el socket.
- Tailnet: `ROLBOARD_URL=https://<host>.<tailnet>.ts.net`, `ROLBOARD_CAMPAIGN=<id>` y `ROLBOARD_CODE_FILE` (el access code va en un archivo, no en el JSON de config del cliente).

### UI en App settings (desktop)

- Toggle "Permitir conexión de agentes" (el socket).
- Botones "Conectar con Claude Desktop" y "Conectar con Antigravity". Comparten el mismo helper (`mergeMCPServer`, ver esqueleto), porque ambos usan JSON con `mcpServers`. Cada botón:
  - pide confirmación;
  - deja un backup del archivo;
  - agrega o reemplaza solo la entrada `rolboard`, sin tocar las demás claves.
- Botón "Conectar con Codex": la stdlib de Go no trae TOML, así que se escribe como texto (`mergeCodexServer`). Mismas reglas que los botones de JSON: confirmación, backup y solo se toca el bloque de `rolboard`.
- Cada botón aparece solo si el directorio del cliente existe (cliente instalado).
- AppImage: la ruta del ejecutable cambia en cada montaje. Usar `$APPIMAGE` (ruta del archivo `.AppImage`), que es estable mientras el usuario no lo mueva. En el `.exe`, `os.Executable()`.

## Fases

Una capa por vez, verificando cada paso con `go test ./...` y `go vet ./...` antes de pasar a la siguiente.

0. **Spike (sin código productivo).** Lo que se puede probar en Linux con Claude Code va primero; lo de Windows y los otros clientes, después de la Fase 3.
   - Que un `.exe` de Wails (subsistema GUI) hable stdio cuando lo lanza Claude Desktop.
   - AF_UNIX en Windows y cómo quedan sus permisos (ACL, no `0600`).
   - Que Antigravity 2.0 lea `~/.gemini/config/mcp_config.json`.
   - Rutas de config de Claude Desktop por OS, y si existe build de Linux.
   - Qué planes (incluidos los gratis) de Claude Desktop, Codex y Antigravity permiten MCP local, y con qué límites.
   - Qué hace cada cliente con `ReadOnlyHint` / `DestructiveHint` (si confirma o no las escrituras).
1. **`internal/mcpserver` + `cmd/mcp`, solo lectura, contra Docker en la tailnet.**
   - Login con access code, cookie jar y re-login ante `401` una sola vez. El login tiene rate limit de 5 intentos por minuto, así que no puede reintentar en loop.
   - Probado con Claude Code en Linux: `claude mcp add rolboard-<campaña> -e ROLBOARD_URL=... -e ROLBOARD_CAMPAIGN=... -e ROLBOARD_CODE_FILE=... -- /ruta/rolboard-mcp`.
2. **Tools de escritura.** Probado con Claude Code en Linux.
3. **Socket en desktop:** listener, `mcpEnabled` en `config.json`, endpoint de settings, subcomando `mcp`. Probado con Claude Code en Linux contra la AppImage o `wails dev` (`claude mcp add rolboard -- <exe> mcp`).
4. **UI de App settings:** toggle y botones de Claude Desktop, Antigravity y Codex. Acá entran las pruebas en Windows y con los otros clientes.
5. **Release y docs:**
   - `rolboard-mcp` (linux-amd64, windows-amd64) en `release.yml`.
   - Actualizar `ARCHITECTURE`, `DECISIONS`, `DESKTOP` y `API` (también las `.es.md`) y `README`.

## Estado

- **Fase 1 (solo lectura) hecha** (rama `dev`, sin commit): `internal/mcpserver` (cliente HTTP con login automático, servidor) y `cmd/mcp`. 25 tools:
  - `list_campaigns`;
  - `list_*` / `get_*` de NPCs, personajes jugadores, sesiones, arcos, quests, locaciones, facciones, lore, notas sueltas, secretos y eventos de timeline (helper genérico `registerEntity`);
  - `get_appearances` (NPC / personaje jugador);
  - `search` (mismos pesos que el cliente web: título, subtítulo, cuerpo; sin tildes ni mayúsculas).
  - Probado con Claude Code real (`--mcp-config`, sin tocar `~/.claude.json`) en el primer corte; el resto está cubierto por tests con la app real y transporte en memoria.
- **Fuera de la v1 de lectura:** timelines (solo hay eventos), encuentros, items y monedas. Sumarlos es una línea por entidad con `registerEntity`.
- **Hallazgo:** los modelos con `json.RawMessage` rompen la validación de salida del SDK, que infiere un schema de array. Son solo tres: `NPC`, `PlayerCharacter` y `EncounterParticipant` (`attributes`, `skills`). Sus `get_*` devuelven `any`; el resto de los modelos puede usarse como salida tipada.
- **HTTPS probado:** test con servidor TLS y cookies `Secure` (`TestClientLoginOverHTTPSWithSecureCookie`): el login funciona y la cookie se reutiliza. Falta probar contra `tailscale serve` real.
- **Decidido sobre la marcha:** `campaign_id` sigue siendo parámetro de las tools. Con access code el login ya limita a una campaña, pero el mismo set de tools tiene que servir al socket de desktop (modo local, todas las campañas).

## Qué más tener en cuenta

- **stdout es del protocolo.** Nada puede escribir ahí: ni `fmt.Println`, ni logs, ni Wails. `slog` va a stderr. En el subcomando de desktop, `mcpserver.Run` tiene que ejecutarse antes de `wails.Run` y terminar con `os.Exit`.
- **Timeouts:** `http.Client{Timeout: 15 * time.Second}`. El reindex del vault es síncrono y puede tardar, así que no hay tool de reindex en la v1.
- **Versionado:** `Implementation.Version` toma la misma versión que el release (`ldflags`). Un MCP más nuevo que un server viejo en la tailnet recibe `404` en endpoints que no existen; se devuelve como error de la tool, sin chequeo de versión.
- **Errores:** un status ≥ 400 se devuelve como error de la tool con el status y el `code` si viene (`{"code": "..."}`). El texto en inglés del server sirve para el modelo.
- **Tamaño de las respuestas:** `description`, `notes` y `body` pueden ser largos. Los `get_*` los devuelven completos; los `list_*` no los incluyen.
- **Reindex vs escrituras del MCP:** si el MCP crea un NPC con el mismo nombre que una nota del vault, el reindex crea otro (upsert por `obsidian_path`, que el MCP no setea). Se documenta en la descripción de `create_npc`.
- **CI:** `internal/mcpserver` entra en `go test ./...` del job existente. El subcomando de desktop se compila solo con Wails, así que la lógica tiene que vivir en `internal/mcpserver` y no en `cmd/desktop`.
- **Dependabot** ya cubre `go.mod`, así que el SDK se actualiza solo. Antes de mergear un bump, correr los tests del protocolo.

## Testing

- Tests de `internal/mcpserver` contra `httptest.Server` con `app.New` sobre una DB temporal: auth real, tools reales, sin mocks de la API.
- Protocolo con `mcp.NewInMemoryTransports()`: un `mcp.Client` conectado al server en memoria llama a cada tool con `CallTool`. Sin stdio.
- Socket: test que levanta el listener en un `t.TempDir()`, hace un POST por el socket y verifica que `/api/desktop/*` responde `404`.
- `mergeMCPServer`: test con un JSON que ya tiene otras entradas y claves desconocidas, que verifique que sobreviven.
- `mergeCodexServer`: test con otros servers, comentarios y una subtabla `[mcp_servers.rolboard.env]`, que verifique que solo cambia el bloque de `rolboard`.
- Manual por cliente: Claude Code, Claude Desktop, Codex app y Antigravity 2.0, en Linux y Windows.

## Riesgos y deuda

- **El agente escribe en la campaña.** Mitigado sin tools de borrado, con soft delete en todo y confirmación del cliente. Qué tan bien confirma cada cliente no está verificado (Fase 0).
- **Prompt injection:** el contenido de las notas (incluido el vault) entra al contexto del modelo. Con tools de escritura, una nota maliciosa podría inducir escrituras. Es el contenido del propio DM, así que el riesgo es bajo, pero existe.
- **Windows:** la app ya anda en Windows (probado en una máquina real; `DESKTOP.md` todavía dice que no, se corrige en la Fase 5). El MCP agrega dos incógnitas propias: stdio en un binario GUI y AF_UNIX.
- **Soporte de clientes:** ChatGPT, Gemini y Antigravity cambian rápido. La tabla de clientes hay que revisarla en cada release.
- **Doc desactualizada:** `DECISIONS.md` dice `SameSite=Lax` y el código usa `Strict` (`handlers/auth.go:54`). Se corrige junto con los docs de la Fase 5.

## Decisiones tomadas

- **Auth en la tailnet: access code por campaña, no admin token.** La base es la misma en los dos casos: lo que cambia es qué puede tocar el MCP.
  - El access code limita al agente a una campaña. Una nota con prompt injection no alcanza a las demás.
  - El admin token es la llave maestra de la instancia: además de todas las campañas, da acceso a cambiar access codes y a las rutas de admin. Además quedaría escrito en el archivo de config de cada cliente.
  - Costo: una entrada de MCP por campaña (`rolboard-<campaña>`). Se acepta.
- **Codex: se escribe en `~/.codex/config.toml` como texto, sin dependencia de TOML.** Ver `mergeCodexServer` en el esqueleto.
- **Orden de pruebas: primero Claude Code en Linux** (la máquina de desarrollo). Las fases 1–3 se validan ahí, contra la tailnet y contra el socket de la app de escritorio. Después vienen Claude Desktop y el resto de los clientes, y Windows.

## Decisiones abiertas

- **Binario en desktop:** subcomando `rolboard mcp` o `rolboard-mcp` aparte. No se decide todavía: lo define el spike de la Fase 0 (stdio en el `.exe` GUI de Windows).

## Esqueleto

Guía para implementar, no código final. Las firmas de `mcp.*` están verificadas contra `go-sdk@v1.8.0`; lo marcado `TODO` hay que resolverlo leyendo el código del proyecto (handlers, migraciones), sin inventar.

### `server/internal/mcpserver/client.go`

```go
// Package mcpserver exposes a Rolboard campaign to MCP clients over stdio,
// acting as one more client of the REST API.
package mcpserver

// Config selects how the API is reached.
type Config struct {
	Socket     string // unix socket of the desktop app; "" means TCP
	BaseURL    string // e.g. https://host.tailnet.ts.net (TCP only)
	CampaignID int64  // campaign to log into (TCP only)
	AccessCode string // read from ROLBOARD_CODE_FILE (TCP only)
	Version    string
}

type apiClient struct {
	http    *http.Client // Jar set for TCP; custom DialContext for unix
	base    string       // "http://rolboard" over the socket
	cfg     Config
	loginMu sync.Mutex
}

func newAPIClient(cfg Config) (*apiClient, error) {
	// TCP: cookiejar.New(nil) + Timeout 15s.
	// Unix: &http.Transport{DialContext: func(ctx, _, _) { return (&net.Dialer{}).DialContext(ctx, "unix", cfg.Socket) }}
	//       base = "http://rolboard" (the host is ignored by the dialer).
	// TODO
}

// do sends a JSON request and decodes the response into out (nil to skip).
// On 401 over TCP it logs in once and retries once; never loops.
func (c *apiClient) do(ctx context.Context, method, path string, in, out any) error {
	// TODO: encode in, build request, send, on 401 && Socket == "" → c.login(ctx) and retry once.
	// Status >= 400 → return &apiError{Status, Code} (Code from {"code": "..."} if JSON).
}

func (c *apiClient) login(ctx context.Context) error {
	// POST /api/campaigns/{id}/login {"code": "..."}; the jar keeps rolboard_session_<id>.
	// Never log the code.
}

type apiError struct {
	Status int
	Code   string
	Text   string
}

func (e *apiError) Error() string { /* "rolboard API 409 session_conflict: ..." */ }

// isUnavailable reports a dial error on the socket, to answer "open Rolboard".
func isUnavailable(err error) bool { /* errors.Is(err, syscall.ECONNREFUSED) || errors.Is(err, fs.ErrNotExist) — verify on Windows */ }
```

### `server/internal/mcpserver/server.go`

```go
// Run serves the MCP protocol over stdin/stdout until the client disconnects.
func Run(ctx context.Context, cfg Config) error {
	api, err := newAPIClient(cfg)
	if err != nil {
		return err
	}
	s := newServer(api, cfg.Version)
	return s.Run(ctx, &mcp.StdioTransport{})
}

// newServer is split from Run so tests can connect it to in-memory transports.
func newServer(api *apiClient, version string) *mcp.Server {
	s := mcp.NewServer(&mcp.Implementation{Name: "rolboard", Version: version}, nil)
	registerReadTools(s, api)
	registerWriteTools(s, api)
	return s
}
```

### `server/internal/mcpserver/tools_read.go`

Un patrón, repetido por entidad. `In` y `Out` son structs; el SDK infiere el schema y valida la entrada.

```go
type campaignArgs struct {
	CampaignID int64 `json:"campaign_id" jsonschema:"campaign ID, from list_campaigns"`
}

type idArgs struct {
	ID int64 `json:"id" jsonschema:"entity ID, from the matching list_* tool"`
}

type npcSummary struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Kind   string `json:"npc_kind"`
	Status string `json:"status"`
}

type npcList struct {
	Items []npcSummary `json:"items"`
}

var readOnly = &mcp.ToolAnnotations{ReadOnlyHint: true}

func registerReadTools(s *mcp.Server, api *apiClient) {
	mcp.AddTool(s, &mcp.Tool{
		Name:        "list_npcs",
		Description: "List the NPCs of a campaign (summary). Use get_npc for details.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in campaignArgs) (*mcp.CallToolResult, npcList, error) {
		var npcs []models.NPC
		if err := api.do(ctx, http.MethodGet, fmt.Sprintf("/api/campaigns/%d/npcs", in.CampaignID), nil, &npcs); err != nil {
			return nil, npcList{}, err // the SDK turns it into IsError, not a protocol error
		}
		out := npcList{Items: make([]npcSummary, 0, len(npcs))}
		for _, n := range npcs {
			// TODO: skip npc_kind == "referencia" (vault index notes), like the client does.
			out.Items = append(out.Items, npcSummary{ID: n.ID, Name: n.Name, Kind: n.NPCKind, Status: n.Status})
		}
		return nil, out, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_npc",
		Description: "Get one NPC with description, notes and stats.",
		Annotations: readOnly,
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in idArgs) (*mcp.CallToolResult, models.NPC, error) {
		var n models.NPC
		err := api.do(ctx, http.MethodGet, fmt.Sprintf("/api/npcs/%d", in.ID), nil, &n)
		return nil, n, err
	})

	// TODO: same pair for sessions, quests, locations, groups, player characters,
	// lore, loose notes, secrets, timeline. Paths in docs/API.md.
	// TODO: list_campaigns (GET /api/campaigns), get_appearances, search.
}
```

### `server/internal/mcpserver/tools_write.go`

```go
type createLooseNoteArgs struct {
	CampaignID int64  `json:"campaign_id"`
	Title      string `json:"title" jsonschema:"short title"`
	Body       string `json:"body" jsonschema:"Markdown body"`
}

type updatePrepArgs struct {
	SessionID int64  `json:"session_id"`
	PrepNotes string `json:"prep_notes" jsonschema:"full new prep notes in Markdown; replaces the current ones"`
}

func registerWriteTools(s *mcp.Server, api *apiClient) {
	mcp.AddTool(s, &mcp.Tool{
		Name:        "create_loose_note",
		Description: "Save a loose idea or note in the campaign.",
		Annotations: &mcp.ToolAnnotations{DestructiveHint: ptr(false)},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in createLooseNoteArgs) (*mcp.CallToolResult, models.LooseNote, error) {
		var note models.LooseNote
		// TODO: check the exact POST body in handlers (payloads) before sending.
		body := map[string]any{"title": in.Title, "body": in.Body}
		err := api.do(ctx, http.MethodPost, fmt.Sprintf("/api/campaigns/%d/loose-notes", in.CampaignID), body, &note)
		return nil, note, err
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "update_session_prep",
		Description: "Replace the prep notes of a session. Read them first with get_session to append.",
		Annotations: &mcp.ToolAnnotations{DestructiveHint: ptr(true)},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in updatePrepArgs) (*mcp.CallToolResult, models.Session, error) {
		// PUT replaces the whole session: read, change one field, write back.
		var sess models.Session
		path := fmt.Sprintf("/api/sessions/%d", in.SessionID)
		if err := api.do(ctx, http.MethodGet, path, nil, &sess); err != nil {
			return nil, models.Session{}, err
		}
		sess.PrepNotes = in.PrepNotes
		// TODO: confirm the PUT payload matches models.Session's JSON (handlers/payloads).
		err := api.do(ctx, http.MethodPut, path, sess, &sess)
		return nil, sess, err
	})

	// TODO: update_loose_note (same GET + PUT pattern), create_npc, create_quest, create_lore.
	// Enum values for each field come from the CHECK constraints in the migrations.
}

func ptr[T any](v T) *T { return &v }
```

### `server/cmd/mcp/main.go`

```go
func main() {
	cfg := mcpserver.Config{
		BaseURL: os.Getenv("ROLBOARD_URL"),
		Version: version,
	}
	// TODO: no Go `version` var exists today (only VITE_APP_VERSION in the client).
	// Add `var version = "dev"` in each cmd and set it in release.yml with
	// -ldflags "-X main.version=vX.Y.Z" (wails build takes -ldflags too).
	// TODO: parse ROLBOARD_CAMPAIGN with strconv.ParseInt; read ROLBOARD_CODE_FILE
	// with os.ReadFile + strings.TrimSpace. Missing values → slog.Error to stderr, exit 1.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	if err := mcpserver.Run(ctx, cfg); err != nil {
		slog.Error("mcp", "err", err)
		os.Exit(1)
	}
}
```

### `server/cmd/desktop/main.go` (cambios)

```go
func main() {
	if len(os.Args) > 1 && os.Args[1] == "mcp" {
		// Before anything Wails-related: stdout belongs to the protocol.
		dir, err := desktop.Dir()
		// TODO: handle err (stderr, exit 1).
		err = mcpserver.Run(context.Background(), mcpserver.Config{Socket: desktop.SocketPath(dir), Version: version})
		// TODO: exit 1 on err, 0 otherwise.
	}
	// ...current main...
}

// serveMCP is the socket handler: API only, no desktop endpoints, push after writes.
func (d *desktopApp) serveMCP(w http.ResponseWriter, r *http.Request) {
	if !strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/api/desktop/") {
		http.NotFound(w, r)
		return
	}
	rt := d.rt.Load()
	if rt == nil {
		http.Error(w, "Starting", http.StatusServiceUnavailable)
		return
	}
	rt.ServeHTTP(w, r)
	if r.Method != http.MethodGet {
		d.schedulePush()
	}
}

// listenMCP starts the socket if enabled. A failure is logged, never fatal.
func (d *desktopApp) listenMCP() {
	// path := desktop.SocketPath(d.dir)
	// os.Remove(path) — stale socket from a crash.
	// ln, err := net.Listen("unix", path); on err: slog.Warn and return.
	// os.Chmod(path, 0o600)
	// go http.Serve(ln, http.HandlerFunc(d.serveMCP))
	// Keep ln to Close it in shutdown, and when the toggle turns off.
	// TODO
}
```

En `internal/desktop/config.go`: `MCPEnabled bool \`json:"mcpEnabled,omitempty"\`` en `Config`, y `func SocketPath(dir string) string { return filepath.Join(dir, "mcp.sock") }`.

### `server/internal/desktop/clients.go` (botones de conexión)

```go
// mergeMCPServer adds or replaces mcpServers[name] in a JSON config file,
// keeping every other key. It writes a .bak copy first.
// Used for Claude Desktop and Antigravity, which share the mcpServers shape.
func mergeMCPServer(path, name string, entry map[string]any) error {
	// 1. Read file; fs.ErrNotExist → start from {}.
	// 2. json.Unmarshal into map[string]any (unknown keys survive).
	// 3. Copy original to path + ".bak" if it existed.
	// 4. servers := doc["mcpServers"].(map[string]any), create if missing.
	// 5. servers[name] = entry  // {"command": exe, "args": ["mcp"]}
	// 6. MarshalIndent, write to path + ".tmp", os.Rename (same as Save).
	// TODO
}

// mergeCodexServer adds or replaces the [mcp_servers.<name>] block in
// ~/.codex/config.toml as plain text, keeping every other line.
func mergeCodexServer(path, name, exe string) error {
	// 1. Read file; fs.ErrNotExist → empty. Copy to path + ".bak" if it existed.
	// 2. Drop the old block: from a line equal to "[mcp_servers.<name>]" or
	//    starting with "[mcp_servers.<name>." (subtables like .env) up to the
	//    next line starting with "[" that is not part of that block.
	// 3. Append:
	//      [mcp_servers.<name>]
	//      command = <exe quoted with strconv.Quote>   // TOML basic strings share Go's escapes for \ and "
	//      args = ["mcp"]
	// 4. Write to path + ".tmp", os.Rename.
	// shortcut: line-based, not a TOML parser; breaks on a multi-line string that
	// contains a "[" header-looking line. Upgrade to a TOML dependency if that shows up.
	// Test: file with other servers, a [mcp_servers.rolboard.env] subtable and comments.
	// TODO
}

// selfExecutable returns a path that stays valid after the app exits:
// $APPIMAGE for an AppImage, os.Executable() otherwise.
func selfExecutable() (string, error) { /* TODO */ }
```
