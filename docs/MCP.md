# AI agents (MCP)

[Español](MCP.es.md)

How to connect an AI assistant (Claude Code, Claude Desktop, OpenCode, Codex or Antigravity) to a Rolboard campaign. Rolboard exposes the campaign as an MCP server over stdio; the assistant launches it as a local process. No API keys and no OAuth: the assistant keeps using your own account with its provider.

Pick the section that matches where your Rolboard runs: [desktop app](#desktop-app) or [Docker server](#docker-server). Android has no MCP client and is not supported.

---

## What the assistant can do

It reads everything in the campaign's database and writes with limits: it can create and edit, never delete.

**Reads**

- `list_*` return summaries and `get_*` the full record, for campaigns, NPCs, player characters, sessions, arcs, quests, locations, groups, lore entries, loose notes, secrets, timelines, timeline events, items, currencies and encounters (`get_encounter` includes the participants).
- `list_npc_types` and `list_lore_categories` give the keys that `create_npc` and `create_lore` need.
- `get_appearances` (sessions, quests and lore where an NPC or character shows up), `get_item_owners`, `get_inventory`, `get_shop`.
- `search`: ranked search across NPCs, characters, locations, groups, arcs, quests, sessions, lore, secrets, notes, timeline events, items and encounters.

**Writes**

- **Create:** `create_loose_note`, `create_npc`, `create_player_character`, `create_quest`, `create_lore`, `create_arc`, `create_session`, `create_location`, `create_group`, `create_secret`, `create_timeline_event`, `create_item`, `create_encounter`, `create_encounter_participant`.
- **Edit:** `update_loose_note`, `update_npc`, `update_player_character`, `update_quest`, `update_lore`, `update_arc`, `update_session`, `update_session_prep`, `update_location`, `update_group`, `update_secret`, `update_timeline_event`, `update_item`, `update_encounter`, `update_encounter_participant`. Only the fields you pass change; a text field you pass replaces the old text (an empty string empties it), so the assistant reads it first to append. A reference such as a location, an arc or a leader can be set or changed but not cleared.
- **Links:** `link_session_npc`, `link_session_quest`, `link_group_npc`, `link_group_pc`, `link_npc_npc` (a directed relation with a role), `link_npc_player` and `link_quest_npc` (with a role). Each returns the list it belongs to.
- **Inventories and shops:** `update_inventory_item` and `update_shop_item` put an item in or change its quantity, notes or prices.

What it cannot do:

- **No delete tool exists.** An assistant cannot remove anything, take an item out of an inventory or a shop, or unlink anything. It also cannot restore the trash, reindex the vault or touch images.
- **Secrets are readable.** Whatever the assistant reads travels to the AI service you use. If you don't want a secret to leave your machine, don't connect that client.
- **One campaign.** With an access code (Docker) the connection reaches only that campaign: the client refuses any other `campaign_id`, and the server checks every reference in a request (a location, an NPC, an item...) against the campaign of the session. The desktop app is in local mode and reaches all your campaigns.
- Entities created from the assistant live only in the database: they have no note in the Obsidian vault, and a vault note with the same name creates another one on the next reindex.

## Desktop app

The desktop app serves MCP through a unix socket owned by your user (`mcp.sock`, mode `0600`, inside the app's data folder). The assistant launches the same executable as `rolboard mcp`, which only relays stdio to that socket. There is no network port, so a web page in your browser cannot reach it.

### Connect with the button

1. Open Rolboard, then **App settings** (the gear on the campaign selector).
2. Turn on **Let AI agents connect**. A list of clients appears.
3. Press **Connect** on the client you use. Rolboard asks for confirmation, saves a copy of the client's config as `<file>.rolboard.bak` (only the first time) and adds a `rolboard` entry to it. The rest of the file is kept.
4. Restart the client so it reads the new configuration.
5. Ask it something about your campaign, for example "list my Rolboard campaigns".

Clients that are not installed show **Not installed** and their button is disabled. If you move the app or update it to a new location, press **Reconnect**: the entry stores the path to the executable.

The app has to be open while the assistant works. If it is closed, or agent connections are off, the assistant reports: "la app de Rolboard no está abierta, o no tiene activada la conexión de agentes".

### Where each client keeps its config

| Client | File | Entry |
|---|---|---|
| Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` (Windows), `~/.config/Claude/claude_desktop_config.json` (Linux) | `mcpServers.rolboard` with `command` and `args: ["mcp"]` |
| Claude Code | `~/.claude.json` | `mcpServers.rolboard`, same shape |
| OpenCode | `~/.config/opencode/opencode.json` | `mcp.rolboard` with `type: "local"` and `command: [exe, "mcp"]` |
| Codex | `~/.codex/config.toml` | table `[mcp_servers.rolboard]` with `command` and `args = ["mcp"]` |
| Antigravity | `~/.gemini/config/mcp_config.json` | `mcpServers.rolboard`, same shape as Claude |

Things to know:

- **Close Claude Code before connecting.** It rewrites `~/.claude.json` while it runs and could overwrite the change.
- **OpenCode with comments.** If your `opencode.json` has comments (JSONC), Rolboard refuses to touch it and tells you. Add the entry by hand.
- **Symlinked configs** (dotfiles) are followed: the real file is edited, not the link.

### Connect by hand

Any MCP client that can launch a stdio command works. Give it the executable and the argument `mcp`:

```
/path/to/rolboard mcp
```

On Linux with the AppImage, use the path of the `.AppImage` itself, not the temporary mount.

## Docker server

With Docker the assistant runs on your computer and talks to the server over HTTPS, with the campaign's access code. It needs the `rolboard-mcp` program, a small binary that is not part of the server image.

### 1. Get `rolboard-mcp`

Download `rolboard-mcp-linux-amd64-<tag>` or `rolboard-mcp-windows-amd64-<tag>.exe` from the GitHub Release, or build it:

```sh
cd server
go build -ldflags "-X main.version=dev" -o rolboard-mcp ./cmd/mcp
```

On Linux, make it executable with `chmod +x`.

### 2. Save the access code

Run it once in a terminal:

```sh
rolboard-mcp login --url https://your-server --campaign 3
```

- `--url` is the address you use in the browser. Use HTTPS: the session cookie is `Secure` unless the server sets `COOKIE_SECURE=false`.
- `--campaign` is the number after `/c/` in the address bar.
- It asks for the campaign's access code without echo (like `sudo`), checks it against the server and, only if it is accepted, saves it. Nothing is saved on a wrong code.
- The code goes to `rolboard/mcp-<campaign>.code` in your user config folder (`~/.config` on Linux, `%AppData%` on Windows), mode `0600`. On Windows the file is private through the ACL of your profile folder, not through the mode.

Each campaign has its own code, so a connection reaches a single campaign. Repeat the steps with another `--campaign` for more. If you change a campaign's access code, run `login` again.

### 3. Connect the client

In Rolboard, open the campaign settings: the **Connect an AI agent** block builds each command with your server's address and the campaign number. By hand:

| Client | What to do |
|---|---|
| Claude Code | `claude mcp add --scope user rolboard-3 -e ROLBOARD_URL=https://your-server -e ROLBOARD_CAMPAIGN=3 -- /path/to/rolboard-mcp` |
| Codex | `codex mcp add rolboard-3 --env ROLBOARD_URL=https://your-server --env ROLBOARD_CAMPAIGN=3 -- /path/to/rolboard-mcp` |
| Claude Desktop | add to `claude_desktop_config.json`: `{"mcpServers": {"rolboard-3": {"command": "/path/to/rolboard-mcp", "env": {"ROLBOARD_URL": "https://your-server", "ROLBOARD_CAMPAIGN": "3"}}}}` |
| Antigravity | the same JSON, in `~/.gemini/config/mcp_config.json` |
| OpenCode | add to `~/.config/opencode/opencode.json`: `{"mcp": {"rolboard-3": {"type": "local", "command": ["/path/to/rolboard-mcp"], "environment": {"ROLBOARD_URL": "https://your-server", "ROLBOARD_CAMPAIGN": "3"}, "enabled": true}}}` |

Claude Code and Codex save their own configuration. For the others, merge the entry into the file and restart the client. `--scope user` makes the Claude Code entry available in every folder; without it, it only exists for the folder where you ran the command.

### Environment variables

| Variable | Meaning |
|---|---|
| `ROLBOARD_URL` | server address (HTTPS) |
| `ROLBOARD_CAMPAIGN` | campaign number |
| `ROLBOARD_CODE_FILE` | optional: a file with the access code, instead of the one `login` saved |

## Check that it works

- Claude Code: `claude mcp list` should show `rolboard` as connected.
- Any client: ask "list my Rolboard campaigns" or "search my campaign for <an NPC name>".

## Troubleshooting

| Message or symptom | Cause and fix |
|---|---|
| `la app de Rolboard no está abierta…` | Desktop only. Open the app and check that **Let AI agents connect** is on. |
| `no hay código de acceso guardado: corré rolboard-mcp login …` | Docker only. Run `login` for that campaign. |
| `el servidor no aceptó el código` / `401 Invalid access code` | Wrong code, or the code was changed. Run `login` again. |
| Too many login attempts | The server allows 5 campaign logins per minute. Wait a minute and retry. |
| The client does not list Rolboard | Restart the client after connecting. For Claude Code, check that the entry was added with `--scope user`. |
| **Connect** fails with `is not valid JSON` | The client's config has comments or is damaged. Fix it or add the entry by hand. |
| The entry points to a path that no longer exists | The app moved. Press **Reconnect**. |

## Security notes

- Desktop: the socket lives in your user's data folder with mode `0600`, and the handler only serves `/api/` (never the desktop-only endpoints). Another user on the machine cannot reach it.
- Docker: the access code is stored in plain text under your user config folder, with the same protection as an SSH key. Rolboard does not ask for the code through the assistant, and the assistant never sees it.
- The provider of the assistant sees whatever the assistant reads.
