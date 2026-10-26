# Agentes de IA (MCP)

[English](MCP.md)

Cómo conectar un asistente de IA (Claude Code, Claude Desktop, OpenCode, Codex o Antigravity) a una campaña de Rolboard. Rolboard expone la campaña como un servidor MCP por stdio; el asistente lo lanza como un proceso local. Sin claves de API ni OAuth: el asistente sigue usando tu propia cuenta con su proveedor.

Elige la sección según dónde corre tu Rolboard: [app de escritorio](#app-de-escritorio) o [servidor Docker](#servidor-docker). Android no tiene cliente MCP y no está soportado.

---

## Qué puede hacer el asistente

Lee todo lo que hay en la base de la campaña y escribe con límites: puede crear y editar, nunca borrar.

**Lee**

- `list_*` devuelven resúmenes y `get_*` el registro completo, de campañas, NPCs, personajes de jugadores, sesiones, arcos, quests, locaciones, facciones, entradas de lore, notas sueltas, secretos, líneas de tiempo, eventos, objetos, monedas y encuentros (`get_encounter` incluye los participantes).
- `list_npc_types` y `list_lore_categories` dan las claves que necesitan `create_npc` y `create_lore`.
- `get_appearances` (sesiones, quests y lore donde aparece un NPC o personaje), `get_item_owners`, `get_inventory`, `get_shop`.
- `search`: búsqueda ordenada por relevancia en NPCs, personajes, locaciones, facciones, arcos, quests, sesiones, lore, secretos, notas, eventos, objetos y encuentros.

**Escribe**

- **Crear:** `create_loose_note`, `create_npc`, `create_player_character`, `create_quest`, `create_lore`, `create_arc`, `create_session`, `create_location`, `create_group`, `create_secret`, `create_timeline_event`, `create_item`, `create_encounter`, `create_encounter_participant`.
- **Editar:** `update_loose_note`, `update_npc`, `update_player_character`, `update_quest`, `update_lore`, `update_arc`, `update_session`, `update_session_prep`, `update_location`, `update_group`, `update_secret`, `update_timeline_event`, `update_item`, `update_encounter`, `update_encounter_participant`. Solo cambian los campos que se pasan; un campo de texto que se pasa reemplaza al anterior, así que el asistente lo lee antes para agregar.
- **Inventarios y tiendas:** `update_inventory_item` y `update_shop_item` ponen un objeto o cambian su cantidad, notas o precios.

Lo que no puede hacer:

- **No existe ninguna herramienta para borrar.** Un asistente no puede eliminar nada, sacar un objeto de un inventario o de una tienda, ni vaciar un campo. Tampoco restaura la papelera, reindexa el vault ni toca imágenes.
- **Los secretos se pueden leer.** Todo lo que el asistente lee viaja al servicio de IA que uses. Si no quieres que un secreto salga de tu equipo, no conectes ese cliente.
- **Una sola campaña.** Con un código de acceso (Docker) la conexión llega solo a esa campaña: el cliente rechaza cualquier otro `campaign_id` y el servidor comprueba cada referencia de un request (una locación, un NPC, un objeto...) contra la campaña de la sesión. La app de escritorio está en modo local y llega a todas tus campañas.
- Lo que se crea desde el asistente vive solo en la base: no tiene nota en el vault de Obsidian, y una nota del vault con el mismo nombre crea otra entidad en el próximo reindex.

## App de escritorio

La app de escritorio sirve MCP por un unix socket de tu usuario (`mcp.sock`, modo `0600`, dentro de la carpeta de datos de la app). El asistente lanza el mismo ejecutable como `rolboard mcp`, que solo retransmite stdio hacia ese socket. No hay puerto de red, así que una página web en tu navegador no puede alcanzarlo.

### Conectar con el botón

1. Abre Rolboard y entra a **Ajustes de la app** (el engranaje del selector de campañas).
2. Activa **Permitir que agentes de IA se conecten**. Aparece la lista de clientes.
3. Pulsa **Conectar** en el cliente que uses. Rolboard pide confirmación, guarda una copia de la configuración del cliente como `<archivo>.rolboard.bak` (solo la primera vez) y le agrega una entrada `rolboard`. El resto del archivo se conserva.
4. Reinicia el cliente para que lea la configuración nueva.
5. Pídele algo de tu campaña, por ejemplo "lista mis campañas de Rolboard".

Los clientes que no están instalados muestran **No instalado** y su botón queda deshabilitado. Si mueves la app o la actualizas a otra ubicación, pulsa **Reconectar**: la entrada guarda la ruta del ejecutable.

La app tiene que estar abierta mientras el asistente trabaja. Si está cerrada, o la conexión de agentes está apagada, el asistente avisa: "la app de Rolboard no está abierta, o no tiene activada la conexión de agentes".

### Dónde guarda la configuración cada cliente

| Cliente | Archivo | Entrada |
|---|---|---|
| Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` (Windows), `~/.config/Claude/claude_desktop_config.json` (Linux) | `mcpServers.rolboard` con `command` y `args: ["mcp"]` |
| Claude Code | `~/.claude.json` | `mcpServers.rolboard`, misma forma |
| OpenCode | `~/.config/opencode/opencode.json` | `mcp.rolboard` con `type: "local"` y `command: [exe, "mcp"]` |
| Codex | `~/.codex/config.toml` | tabla `[mcp_servers.rolboard]` con `command` y `args = ["mcp"]` |
| Antigravity | `~/.gemini/config/mcp_config.json` | `mcpServers.rolboard`, misma forma que Claude |

Cosas a tener en cuenta:

- **Cierra Claude Code antes de conectar.** Reescribe `~/.claude.json` mientras corre y podría pisar el cambio.
- **OpenCode con comentarios.** Si tu `opencode.json` tiene comentarios (JSONC), Rolboard no lo toca y te lo avisa. Agrega la entrada a mano.
- **Configuraciones con symlink** (dotfiles): se sigue el enlace y se edita el archivo real, no el link.

### Conectar a mano

Sirve cualquier cliente MCP que pueda lanzar un comando por stdio. Dale el ejecutable y el argumento `mcp`:

```
/ruta/a/rolboard mcp
```

En Linux con el AppImage, usa la ruta del `.AppImage` en sí, no el montaje temporal.

## Servidor Docker

Con Docker el asistente corre en tu computadora y habla con el servidor por HTTPS, con el código de acceso de la campaña. Necesita el programa `rolboard-mcp`, un binario chico que no forma parte de la imagen del servidor.

### 1. Conseguir `rolboard-mcp`

Descarga `rolboard-mcp-linux-amd64-<tag>` o `rolboard-mcp-windows-amd64-<tag>.exe` del Release de GitHub, o compílalo:

```sh
cd server
go build -ldflags "-X main.version=dev" -o rolboard-mcp ./cmd/mcp
```

En Linux, dale permiso de ejecución con `chmod +x`.

### 2. Guardar el código de acceso

Ejecútalo una vez en una terminal:

```sh
rolboard-mcp login --url https://tu-servidor --campaign 3
```

- `--url` es la dirección que usas en el navegador. Usa HTTPS: la cookie de sesión es `Secure`, salvo que el servidor use `COOKIE_SECURE=false`.
- `--campaign` es el número que aparece tras `/c/` en la barra de direcciones.
- Pide el código de acceso de la campaña sin mostrarlo (como `sudo`), lo comprueba contra el servidor y, solo si lo acepta, lo guarda. Con un código incorrecto no se guarda nada.
- El código va a `rolboard/mcp-<campaña>.code` dentro de tu carpeta de configuración (`~/.config` en Linux, `%AppData%` en Windows), con modo `0600`. En Windows el archivo es privado por la ACL de tu carpeta de perfil, no por el modo.

Cada campaña tiene su propio código, así que una conexión da acceso a una sola. Para otra, repite los pasos con otro `--campaign`. Si cambias el código de acceso de una campaña, vuelve a ejecutar `login`.

### 3. Conectar el cliente

En Rolboard, abre los ajustes de la campaña: el bloque **Conectar un agente de IA** arma cada comando con la dirección de tu servidor y el número de la campaña. A mano:

| Cliente | Qué hacer |
|---|---|
| Claude Code | `claude mcp add --scope user rolboard-3 -e ROLBOARD_URL=https://tu-servidor -e ROLBOARD_CAMPAIGN=3 -- /ruta/a/rolboard-mcp` |
| Codex | `codex mcp add rolboard-3 --env ROLBOARD_URL=https://tu-servidor --env ROLBOARD_CAMPAIGN=3 -- /ruta/a/rolboard-mcp` |
| Claude Desktop | agrega a `claude_desktop_config.json`: `{"mcpServers": {"rolboard-3": {"command": "/ruta/a/rolboard-mcp", "env": {"ROLBOARD_URL": "https://tu-servidor", "ROLBOARD_CAMPAIGN": "3"}}}}` |
| Antigravity | el mismo JSON, en `~/.gemini/config/mcp_config.json` |
| OpenCode | agrega a `~/.config/opencode/opencode.json`: `{"mcp": {"rolboard-3": {"type": "local", "command": ["/ruta/a/rolboard-mcp"], "environment": {"ROLBOARD_URL": "https://tu-servidor", "ROLBOARD_CAMPAIGN": "3"}, "enabled": true}}}` |

Claude Code y Codex guardan su propia configuración. En los demás, mezcla la entrada en el archivo y reinicia el cliente. `--scope user` deja la entrada de Claude Code disponible en cualquier carpeta; sin eso, solo existe para la carpeta donde ejecutaste el comando.

### Variables de entorno

| Variable | Significado |
|---|---|
| `ROLBOARD_URL` | dirección del servidor (HTTPS) |
| `ROLBOARD_CAMPAIGN` | número de la campaña |
| `ROLBOARD_CODE_FILE` | opcional: un archivo con el código de acceso, en vez del que guardó `login` |

## Comprobar que funciona

- Claude Code: `claude mcp list` tiene que mostrar `rolboard` como conectado.
- Cualquier cliente: pide "lista mis campañas de Rolboard" o "busca en mi campaña a <el nombre de un NPC>".

## Problemas frecuentes

| Mensaje o síntoma | Causa y solución |
|---|---|
| `la app de Rolboard no está abierta…` | Solo escritorio. Abre la app y comprueba que **Permitir que agentes de IA se conecten** esté activo. |
| `no hay código de acceso guardado: corré rolboard-mcp login …` | Solo Docker. Ejecuta `login` para esa campaña. |
| `el servidor no aceptó el código` / `401 Invalid access code` | Código incorrecto, o se cambió. Ejecuta `login` otra vez. |
| Demasiados intentos de login | El servidor permite 5 logins de campaña por minuto. Espera un minuto y reintenta. |
| El cliente no lista Rolboard | Reinicia el cliente después de conectar. En Claude Code, comprueba que la entrada se agregó con `--scope user`. |
| **Conectar** falla con `is not valid JSON` | La configuración del cliente tiene comentarios o está dañada. Arréglala o agrega la entrada a mano. |
| La entrada apunta a una ruta que ya no existe | La app se movió. Pulsa **Reconectar**. |

## Notas de seguridad

- Escritorio: el socket vive en la carpeta de datos de tu usuario con modo `0600`, y el handler solo sirve `/api/` (nunca los endpoints exclusivos del escritorio). Otro usuario de la máquina no puede alcanzarlo.
- Docker: el código de acceso se guarda en texto plano dentro de tu carpeta de configuración, con la misma protección que una clave SSH. Rolboard no le pide el código al asistente, y el asistente nunca lo ve.
- El proveedor del asistente ve todo lo que el asistente lee.
