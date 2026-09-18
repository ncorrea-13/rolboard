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

- The dashboard indexes frontmatter and stores `obsidian_path` to open or render the note. Opening in Obsidian (`obsidian://`) is a first-class feature.
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

## Combat tracker

- A DM control view, list-based. No map.
- Participant = PC, NPC or loose enemy (`display_name`), mutually exclusive via `CHECK`. Loose enemies carry their own sheet on the participant; PC/NPC use their entity's (read-only in the tracker).
- Order: `initiative_value` for D&D; `turn_type` fast/slow for Cosmere (phases per round, no numeric initiative). `turn_type` clears when the round advances.
- PC HP persists in `player_characters` and syncs from the tracker; NPC HP is ephemeral.
- "Already acted" is local browser state, never persisted.

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
