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
- `SameSite=Lax` is the CSRF protection. Don't relax it.
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
- `attributes` / `skills` as free-form JSON: each game system (Cosmere, D&D) defines its own; no case needs filtering by attribute.
- An important NPC with a full sheet = `detail_level = full`, not a separate entity.

## Deletions and trash

- **Nothing is deleted for good.** `DELETE` is a soft delete and the trash screen restores it. There is no "empty trash": a hard delete would need a cascade that this schema deliberately avoids.
- **Deleting is blocked when it would leave visible orphans:** an arc with active sessions, a location with active NPCs or sub-locations, an NPC that is a character's spren. `409` with a code, and the user moves the dependants first. Not blocked, on purpose: sessions with encounters (the encounter just loses its link), a faction leader (the UI already warns), and the session↔NPC/quest bridges (they are history; reads filter deleted rows).
- **Restoring checks its parents.** A session, NPC or location whose arc or location is still deleted can't be restored (`restore_parent_deleted`), so a restore never creates an orphan.
- **Session numbers are unique among active sessions only** (partial index), so a deleted number can be reused. The trade-off: restoring can hit `409` if the number was reused.
- **Vault-archived sessions (`sub_number = 99`) stay out of the trash.** The vault manages that state: the next reindex would archive them again.
- **A reindex can revive a record deleted from the UI** when its note is still in the vault: the vault is the source of truth for what it holds. To remove it for good, delete or archive the note.
- **Session numbers are still proposed by the client** (`max + 1`). With one DM per campaign a race is unlikely, and the unique index turns it into a `409` instead of corrupt data.
- **API errors are translated by the client, not the server.** The server's `http.Error` text is English and meant for logs; only errors the user can act on carry a `code` the UI maps to the app language. Everything else shows a generic message by status.
- **Confirmations use an in-app dialog**, not the browser's `confirm()`: it follows the app's look and language and works in the desktop and Android webviews.

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

## Images

- One image per NPC, PC, location and faction (`image_path`). The same file serves both the large portrait and the small icon (CSS). No gallery or polymorphic table.
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
- **Update notice, not auto-update.** The app only links to a newer GitHub release; replacing a binary in place (or an APK) is a lot of code and a security surface for little gain.
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
