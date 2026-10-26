# Decisions

[Español](DECISIONS.es.md)

Current decisions and the reasoning behind them. If one changes, it gets rewritten here; history stays in git.

---

## Scope: a DM tool, not a player tool

A single user (the DM), no player-facing views, no live shared state. Hence no WebSockets, no multi-user, no combat map with tokens (evaluated and dropped: no value at a table where nobody else looks at the screen).

"Single user" doesn't mean "no security": the DM logs in from several devices over the network, so there's per-campaign auth, an admin token and rate limiting, and all uploaded content is treated as hostile.

## Stack

- **Go + `net/http` stdlib.** `ServeMux` already has methods and path params; a third-party router adds nothing at this size. It's also a Go-learning project.
- **Raw SQL with `database/sql`**, no ORM.
- **SQLite (`modernc.org/sqlite`, no cgo).** One user, a few hundred entities, no DB server to maintain. Static binary.
- **React + TypeScript + Vite (SPA).** The UI is interactive (tracker, forms, modals); no need for SSR or SEO, so Next.js is overkill.
- **Plain CSS with tokens** (`client/src/styles/tokens.css`), no Tailwind or CSS-in-JS.
- **Caddy** serves the SPA and proxies `/api`, so SPA and API share an origin and CORS isn't needed.
- `server/` and `client/` folders, no monorepo tooling.

## Multi-campaign

One backend, several campaigns. Each with its own `vault_path` (subfolder of `VAULTS_ROOT`), its own access code and isolated data: middleware verifies each resource belongs to the session's campaign.

## Authentication

- Per-campaign access code (bcrypt), session in an `HttpOnly` cookie with the token hash in `auth_sessions`.
- Instance admin token, preferably as a secret (`ADMIN_TOKEN_FILE`). Its session lives in memory: restarting the server forces a re-login, and that's fine.
- `SameSite=Strict` is the CSRF protection. Don't relax it.
- `GET /api/campaigns` is public but trimmed (`id, name, system, status`): the selection screen needs it before there's a session, and it must not leak `vault_path`.

## Obsidian vault: source of the prose, not of everything

- The dashboard indexes frontmatter and stores `obsidian_path` to open or render the note. Opening in Obsidian (`obsidian://`) is a first-class feature on the web; the desktop app hides it (the webview can't hand off custom schemes).
- What the vault doesn't model well lives only in the DB: quests, prep notes, PC `class`/`backstory`, sheets, HP, images. More content moves to the DB only when a concrete need shows up.
- Quests have no note in the vault; `session_quests` is only managed from the dashboard.

## Reindex

- One HTTP endpoint per campaign, synchronous.
- Upsert by `(campaign_id, obsidian_path)`; deleted notes → soft delete.
- Unchanged notes (hash in `vault_file_state`) aren't reprocessed, so dashboard edits aren't overwritten. If the note changed, the vault wins. No conflict UI.
- Memberships carry `source` (`vault` / `dashboard` / `removed`) so the reindex doesn't delete what was added by hand or revive what was removed by hand.
- `session_npcs` / `session_pcs` come from the wikilinks in the session's body: notes get written naturally, no extra fields needed.
- Wikilinks resolve by name + expected type; ambiguity is never guessed.

## Data model

- Versioned, embedded SQL migrations. An applied one is never edited.
- Soft delete (`deleted_at`) and `ON DELETE RESTRICT`: losing data to a cascade delete is worse than unlinking by hand.
- Enums with `CHECK` at the DB level, not just in Go.
- ISO 8601 `TEXT` timestamps: readable with `sqlite3`, performance cost doesn't matter here.
- Composite PK on bridge tables.
- No indexes on FKs yet: at this volume a scan is instant.
- `groups` and `player_characters` are first-class entities from the start.
- `npc_relations` is directed with a free-text role, instead of a fixed relationship field.
- `origen` and `subtipo` are free text on NPCs (they were `etnia` and `tipo_spren`); the vault parser keeps the old keys as aliases so existing notes don't lose the value on the next reindex. `wardails` keeps its name in the code and the API; the UI calls it "Sensitive topics".
- **The export is Markdown in the indexer's own format**, so it doubles as backup and as a way out. Images go along under `Imagenes/`, named after their note; the trash stays out (deleted means deleted). Entities the vault never had (quests, secrets, items...) go to their own folders, which the indexer ignores.
- **`Lore/` in the vault only fixes title, category, arc and location.** The text stays in the note (rendered from the entry) and the database `body` stays the dashboard's, like the description of an NPC.
- NPC ↔ player links live in `npc_player_relations` (free-text role, `source` like the group bridges), not in a spren column: the same NPC can be tied to several characters and any kind of tie fits. The vault declares them from the NPC note (`vinculado_a`), without a role. Deleting an NPC with links is allowed: reads hide the links of deleted rows.
- `attributes` / `skills` as free-form JSON: each game system (Cosmere, D&D) defines its own; no case needs filtering by attribute.
- An important NPC with a full sheet = `detail_level = full`, not a separate entity.

## Deletions and trash

- **Nothing is deleted for good.** `DELETE` is a soft delete and the trash screen restores it. There is no "empty trash": a hard delete would need a cascade that this schema deliberately avoids.
- **Deleting is blocked when it would leave visible orphans:** an arc with active sessions, a location with active NPCs or sub-locations. `409` with a code, and the user moves the dependants first. Not blocked, on purpose: sessions with encounters (the encounter just loses its link), a faction leader (the UI already warns), and the session↔NPC/quest bridges (they are history; reads filter deleted rows).
- **Restoring checks its parents.** A session, NPC or location whose arc or location is still deleted can't be restored (`restore_parent_deleted`), so a restore never creates an orphan.
- **Session numbers are unique among active sessions only** (partial index), so a deleted number can be reused. The trade-off: restoring can hit `409` if the number was reused.
- **Vault-archived sessions (`sub_number = 99`) stay out of the trash.** The vault manages that state: the next reindex would archive them again.
- **A reindex can revive a record deleted from the UI** when its note is still in the vault: the vault is the source of truth for what it holds. To remove it for good, delete or archive the note.
- **Session numbers are still proposed by the client** (`max + 1`). With one DM per campaign a race is unlikely, and the unique index turns it into a `409` instead of corrupt data.
- **API errors are translated by the client, not the server.** The server's `http.Error` text is English and meant for logs; only errors the user can act on carry a `code` the UI maps to the app language. Everything else shows a generic message by status.
- **Confirmations use an in-app dialog**, not the browser's `confirm()`: it follows the app's look and language and works in the desktop and Android webviews.

## Lore

- **Per campaign, not shared.** No "world" entity: it would break the per-campaign isolation (auth, vault, reindex, trash).
- **Categories are data, not an enum**, same pattern as `npc_types`: each campaign has its own, seeded on creation. An entry may have no category.
- **A category used by any entry can't be deleted** (`409`), counting soft-deleted entries too, so a restore never points at a missing category.
- **Deleting an arc or location doesn't block on lore entries.** The link is optional and the entry simply stops showing it.

## Items and economy

- **Narrative, not a simulation.** An item has a free-text "what it does", a category and a rarity; there are no mechanical bonuses and no supply and demand.
- **One optional base currency per campaign.** Other currencies carry `rate_to_base`; setting a new base moves the flag. Currencies are not tied to a game system: each campaign defines its own.
- **Prices per currency.** An item can cost 5 spheres or 2 gold; a shop may override the catalog price for its location.
- **A currency used by an item or shop price can't be deleted** (`409`).

## Search and "appears in"

- **Search is client-side.** Every entity of the campaign is already loaded in memory, so the palette (Ctrl/Cmd+K, or the sidebar button) filters locally: no endpoint, no index to keep in sync. Ranking is title match first, then subtitle, then body; accents and case are ignored.
- **"Appears in" is computed where the data lives.** Sessions, quests and encounters of an NPC or a player character come from `GET .../appearances` (they need reverse joins); locations, factions and lore entries use the lists the client already holds (lore, timeline events, secrets, NPCs, currencies).

## Secrets

- **A secret is not tied to a single NPC.** It optionally points at an NPC, a location or a lore entry (what it is about), and a separate bridge lists who knows it.
- **Revealing keeps the history.** Revealing stores the session (optional); hiding it again clears it, so the session never lingers on a hidden secret.

## Timeline

- **Free-text dates, numeric order.** Each setting has its own calendar and it can't be parsed, so `date_label` is only displayed and `sort_key` (typed by hand) orders. Inserting an event in the middle needs no renumbering.
- **Several timelines, one view.** Timelines are lanes (world history, campaign chronicle, a war) shown together and filtered with chips. "Events of faction X / place Y" are filters over `group_id` / `location_id`, not extra timelines; filtering by a location includes its sub-locations.
- **One timeline per event.** A many-to-many link is left out until a real case needs it.
- **The first event creates a default timeline** so there is no mandatory previous step.

## Combat tracker

- A DM control view, list-based. No map.
- Participant = PC, NPC or loose enemy (`display_name`), mutually exclusive via `CHECK`. Loose enemies carry their own sheet on the participant; PC/NPC use their entity's (read-only in the tracker).
- Order: `initiative_value` for D&D; `turn_type` fast/slow for Cosmere (phases per round, no numeric initiative). `turn_type` clears when the round advances.
- PC and NPC HP persists in their entity (`player_characters` / `npcs`, both optional) and syncs from the tracker: an NPC that survives a fight keeps its wounds for the next one. Loose enemies only have the participant's HP.
- "Already acted" is local browser state, never persisted.
- A closed encounter is read-only (it would otherwise overwrite the entities' current HP with old values); "Reopen" sets it back to `activo`.
- HP is changed with damage/heal amounts: healing caps at max HP, and damage stops at 0 (down) before a further hit can take it negative. HP above max (typed by hand) shows as a separate segment on the bar.

## Frontend

- `CrystalType` (color by entity type) and `StatusKind` (status traffic light) never mix on the same element.
- `referencia` NPCs (vault index notes) are filtered client-side: they're not characters.
- `activo` → alive, `consolidado` → dead in the traffic light.
- Faction membership is managed only from the faction (a PC/NPC can belong to several).
- Custom Spanish/English i18n (`lib/i18n.ts`), no library.
- **Violet sky and magic circles (`styles/aura.css`, `components/Sigil.tsx`):** crisp on the splash and the campaign selector; blurred (`aura--soft`) and faint on help and behind the campaign screens (`AppShell`), with one of three designs by section (circle, astrolabe for the world, runes for combat and secrets). Cards keep their own surface, so data never sits directly on it. It is a static layer: Android WebView and webkit2gtk lack scroll-driven animation, and a still SVG is cheap on low-end phones and OLED. The blur is one `filter` on two layers: check it on low-end Android. It can be turned off in the app settings (desktop and Android): a `localStorage` flag (`lib/appearance.ts`) sets `data-aura="off"` on `<html>` and `aura.css` hides the layers. In Docker there is no gear: the client's `AURA=off` env is served by Caddy as `/config.json` and read at startup (the device choice, when set, wins).

## Images

- One image per NPC, PC, location, faction, item, arc, lore entry and quest (`image_path`). The same file serves both the large portrait and the small icon (CSS). No gallery or polymorphic table.
- On the filesystem under `UPLOADS_ROOT`, not a BLOB: the DB and backups stay light. Outside the vault.
- Written only by its own endpoint, never by the entity's `PUT` (a form save doesn't overwrite it) or by the reindex.
- **PNG and JPEG only**, detected by decoding the content. SVG rejected: it would be served from the same origin and could run JS with the DM's session. WebP/AVIF would need a new dependency.
- The on-disk path is built server-side (`<entity>/<id>-portrait.<ext>`); the uploaded filename is never used. Closes path traversal.
- Max 5 MiB and `X-Content-Type-Options: nosniff` when serving.
- Compression: the client downsizes to 1600 px and JPEG before upload (canvas, no dependencies). No server-side processing.
- When an entity is soft-deleted, its file stays on disk (accepted debt).

## Logging

- Structured `log/slog`; `LOG_JSON=true` for JSON in production.
- Request log middleware: `method, path, status, duration, remote`.
- Auth events at `Warn`: failed login, invalid session, campaign mismatch, admin rejected. Codes and tokens are never logged.

## Desktop app

- **Same codebase, second entrypoint.** `cmd/server` (Docker) and `cmd/desktop` (Wails) both call `app.New`; only config and transport change.
- **Wails v2 over v3.** v2 is stable; v3 was still beta. Re-evaluate when v3 goes stable.
- **No network.** The webview talks to the router in-process through `AssetServer.Handler`: no port, so no DNS rebinding or CSRF surface.
- **Local mode is set only by `cmd/desktop`, never by an env var**, so a misconfigured container can't end up without auth. In local mode every request is admin; `GET /api/admin/session` returns `{"localMode": true}` and the client hides access codes, logout and "Open in Obsidian".
- **Data in `os.UserConfigDir()/rolboard/`**: `config.json` (vaults and sync folders), `rolboard.db`, `uploads/`. Both folders are optional and are picked with a native dialog from **App settings**, the gear on the campaign selector (`POST /api/desktop/vaults-root`, `POST /api/desktop/sync-dir`). Changing one rebuilds the app in place, no restart. They are per-device settings, so they aren't in the campaign forms or in Docker, which uses `VAULTS_ROOT`. Without a vaults folder, campaigns work dashboard-only. No app menu bar.
- **External links** go through `POST /api/desktop/open`, which only accepts `https` URLs and calls `runtime.BrowserOpenURL`. Wails' JS runtime is only injected on `/`, so it's missing after reloading a deep link.
- **WebKitGTK workarounds (Linux):** image uploads send the multipart already serialized to bytes, because Wails reads request bodies off the GTK main thread and crashes on a body that references a `File`. Selects use `appearance: base-select` so the dropdown is HTML and not a GTK menu.
- **Update notice, not auto-update.** The app only links to the website's download page when a newer GitHub release exists; replacing a binary in place (or an APK) is a lot of code and a security surface for little gain.
- **Packaging:** unsigned `.exe` (cross-compiled from Linux, no CGO) and AppImage that relies on the system's `libwebkit2gtk-4.1`.

## Sync between devices

- **The working DB never leaves the device.** Sync tools copying an open SQLite file (with its WAL) corrupt it, so each device exports a snapshot (`VACUUM INTO` a temp file, fsync, rename) and imports the other's. Any tool that syncs a folder works: Syncthing, a cloud drive, or copying the file by hand.
- **Change detection by SHA-256**, not mtime, which sync tools and copies don't preserve reliably.
- **Push only after local writes.** A device that only read data would otherwise overwrite a newer copy from another device.
- **Last writer wins, plus a conflict copy.** If both sides changed, the other device's snapshot is kept as `rolboard.conflict.db`. Real merging is out of scope: the app is meant for one device at a time.
- **Imports check the schema** against the embedded migrations and refuse a snapshot from a newer version. The previous local DB is kept as `.bak`.
- **Images go in `uploads/` inside the sync folder**; `config.json` is not synced, since it holds per-machine paths.
- Shared by desktop and Android through `internal/desktop.Runtime` and `internal/snapshot`.

## Android app

- **gomobile, not Wails v3.** v3 supports Android but was still beta, with open lifecycle bugs. gomobile is maintained by the Go team and Android's `WebView` is stable. Re-evaluate when v3 goes stable.
- **No server on `localhost`**, same as desktop: the `WebView` loads a virtual origin (`https://rolboard.local`) and requests are intercepted. GETs go through `shouldInterceptRequest`; writes go through a `JavascriptInterface`, because Android doesn't expose POST bodies to interception.
- **The vault is read by path** with "All files access", instead of copying it through the Storage Access Framework: a vault already synced to the phone stays up to date with no extra step. Google Play rarely approves that permission; for an APK on GitHub it's fine.
- **`modernc.org/sqlite` kept, ARM64 only.** It works on ARM64 (tested on a phone), but on x86_64 `modernc.org/libc` calls `SYS_lstat`, which Android's seccomp filter blocks. Only `arm64-v8a` is shipped; `ncruces/go-sqlite3` is the fallback if x86_64 is ever needed.
- **Kotlin, no AndroidX**, one `Activity`. AGP 9 has built-in Kotlin, so there's no extra plugin.
- **Build in a container** (`docker-compose.android.yml`): no Android SDK needed on the developer machine.
- **Signed with its own key**, not a public debug key: the signature is what proves an update comes from the project, and the app holds "All files access". Two secrets: the keystore in base64 and one password; the alias is fixed.
- **Application ID `io.github.ncorrea_13.rolboard`:** a domain tied to the GitHub account that publishes it. Hyphens aren't allowed in IDs, hence the underscore. It can never change without becoming a different app.
- **APK on GitHub Releases, not Google Play**, for now.

## AI agents (MCP)

- **MCP over stdio, one more client of the REST API.** The assistant launches a local process that speaks MCP on stdin/stdout and calls the same `/api` the frontend uses. It doesn't import `internal/service` or open the database, so auth, validation and soft delete apply to it unchanged. SDK: `github.com/modelcontextprotocol/go-sdk`.
- **No API keys, no OAuth.** The assistant keeps using the user's own account with its provider. OAuth would only make sense with a public HTTP MCP endpoint, which would put the instance on the internet. That also rules out ChatGPT (calls from OpenAI's cloud) and the Gemini desktop app (no MCP of its own). Android has no MCP client.
- **Desktop: a unix socket, not SQLite and not a port.** Another process writing the database would bypass the `dirty` flag of `Runtime`, so the next `Pull` could replace the local DB with another device's snapshot and lose the writes. A `localhost` port would reopen the DNS rebinding and CSRF surface that "No network" closed. The socket (`mcp.sock`, `0600`, in the data folder) serves only `/api/`: `/api/desktop/*` answers `404`, so an agent can't open dialogs or rewrite other clients' configs. Writes schedule the sync push like the webview's.
- **Off by default.** In local mode every request is admin, so the user turns the socket on in **App settings** (`mcpEnabled` in `config.json`). The app has to be open; with it closed the assistant gets a clear error.
- **One executable for non-technical users.** The client launches the app's own executable as `rolboard mcp`, a stdio bridge to the socket that runs before Wails starts. The connect button points the client at that path (`$APPIMAGE` on Linux, since the mount path changes on every run) and **Reconnect** fixes it after a move or update.
- **Docker: `rolboard-mcp` with the campaign's access code**, not the admin token. The code limits the agent to one campaign; the admin token would also expose every campaign, access-code changes and the admin routes. Cost: one entry per campaign. It's a separate small binary (no CGO) shipped in the release, not part of the server image.
- **The access code is typed once with `rolboard-mcp login`**, hidden like `sudo`, checked against the server and saved to `<UserConfigDir>/rolboard/mcp-<campaign>.code` (`0600`). It never goes into the client's config file, a command line or a log, and the assistant never sees it. Plain text with SSH-key protection is the accepted trade-off: the alternative was depending on an external credential manager. On Windows the mode isn't enforced; the profile folder's ACL protects it. Campaign logins are rate limited to 5 per minute, so the client logs in once and retries a `401` only once.
- **Reads almost everything, writes little.** `list_*` return summaries and `get_*` the detail, so a campaign with hundreds of NPCs doesn't fill the model's context. Writes are `create_loose_note`, `update_loose_note`, `update_session_prep`, `create_npc`, `create_quest` and `create_lore`; every write tool declares its destructive hint. **There is no delete tool.** Secrets are readable on purpose: the only user is the DM, and what the assistant reads goes to its provider.
- **Config files are edited only from the desktop button**, with confirmation, a `<file>.rolboard.bak` of the original (first time only), symlinks followed and every other key kept. Codex's TOML is edited as text, to avoid a dependency. A JSONC `opencode.json` is refused instead of rewritten without its comments.
