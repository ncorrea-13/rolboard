# Desktop app

[Español](DESKTOP.es.md)

Native build of Rolboard for a single computer, next to the Docker deployment. Same repository, services, handlers and vault indexer; only the entrypoint changes. The Android app shares the same runtime: [`ANDROID.md`](ANDROID.md). The reasoning behind each choice is in [`DECISIONS.md`](DECISIONS.md#desktop-app).

Status: Linux tested; Windows cross-compiled but not yet run on a real machine; macOS not distributed.

---

## Docker vs desktop

| | Docker | Desktop |
|---|---|---|
| Target | DM self-hosting, several devices | One machine |
| Entrypoint | `server/cmd/server` | `server/cmd/desktop` |
| Config | env vars | `config.json` written by the app |
| Network | Caddy + HTTP on `:8080` | none: the webview talks to the router in-process |
| Auth | admin token + per-campaign codes | off (local mode) |
| Distribution | GHCR images | GitHub Release: `.exe` and AppImage |

## How it runs

```
Wails window (WebKitGTK / WebView2)
  └── AssetServer
        ├── embedded frontend (client/dist)       static files
        ├── /api/desktop/*                         cmd/desktop
        ├── /api/*                                 router from app.New (LocalMode: true)
        └── anything else                          index.html (SPA routes)
```

- `cmd/server` and `cmd/desktop` both build the app with `internal/app.New`. Only `cmd/desktop` sets `LocalMode`, so every request is admin and `GET /api/admin/session` returns `{"localMode": true}`. The client uses that to hide access codes, logout and "Open in Obsidian".
- Data lives in `os.UserConfigDir()/rolboard/` (`~/.config/rolboard` on Linux, `%AppData%\rolboard` on Windows): `config.json`, `rolboard.db`, `uploads/`.
- `config.json` stores the vaults folder and the sync folder, both optional. Without a vaults folder campaigns work dashboard-only.
- Both folders are set from **App settings** (the gear on the campaign selector), which only shows in local mode.
- **Update notice:** the campaign selector checks GitHub's latest release at most once a day and links to it if it's newer than the running version. Nothing is downloaded. The version is baked into the client at build time (`VITE_APP_VERSION`, set by the release workflow on tags); local builds don't have it and skip the check. In Docker everyone who opens the campaign selector sees it; CI bakes in the latest tag the image contains.
- `cmd/desktop` is a thin Wails shell over `internal/desktop.Runtime`, which owns the config, the app instance and the sync. `server/mobile` wraps the same runtime for Android.

### Desktop-only endpoints

Served by `cmd/desktop` before the router; they don't exist in Docker.

```
GET  /api/desktop/settings      {"vaultsRoot": "...", "syncDir": "..."}  ("" if unset)
POST /api/desktop/vaults-root   opens the native folder dialog; 200 with the settings or 204 if cancelled
POST /api/desktop/sync-dir      same, for the sync folder
POST /api/desktop/open          {"url": "https://..."}  opens it in the default browser; https only
```

Changing a folder saves `config.json` and rebuilds the app in place (new `app.New`, handler swap, old DB closed): no restart.

## Sync between devices

Optional. Pick a **sync folder** that some external tool keeps in sync (Syncthing, a cloud drive, or copying files by hand). Rolboard never opens a database inside it; it only writes and reads a snapshot.

```
<sync folder>/
├── rolboard.db            last exported snapshot
├── rolboard.conflict.db   the other device's copy, kept when both changed
└── uploads/               images (replaces the local uploads/ while sync is on)
```

- **Export:** `VACUUM INTO` a temp file, fsync, rename. Sync tools only ever see a complete file.
- **Import:** if the snapshot's SHA-256 differs from the last one this device saw. The schema is checked against the embedded migrations first (a snapshot from a newer version is refused), and the local DB is kept as `rolboard.db.bak`.
- **When:** the desktop imports at startup and exports 30 s after the last change and on close. Android imports when the app comes back to the foreground and exports when it goes to the background.
- **Only after changes:** a device that only read data doesn't export, so it can't overwrite a newer copy.
- **Conflicts:** last writer wins. If the snapshot changed since the last sync and this device also has changes, the other copy is kept as `rolboard.conflict.db` before overwriting.
- **Choosing the folder:** if it already has a snapshot, it's imported. If it's empty, this device exports. Existing images are copied into `uploads/`.
- `config.json` isn't synced: it holds paths specific to each machine.

Meant for one device at a time; merging changes made on two devices at once is out of scope.

## Layout

```
server/cmd/desktop/
├── main.go             Wails setup, startup, desktop endpoints
├── main_test.go        /api/desktop/open rejects non-https URLs
├── wails.json          frontend install/build commands
├── frontend/           client/dist is copied here at build time (git-ignored, .gitkeep only)
└── build/
    ├── appicon.png     app icon (Linux window, AppImage)
    └── windows/        icon.ico, manifest, version info for the .exe
```

- `server/internal/desktop/`: `config.json`, data paths and `Runtime` (app lifecycle, settings, sync).
- `server/internal/snapshot/`: export, import, conflict copy and upload copy for the sync folder.

## Build from source

Requirements: Go 1.27, Node + pnpm, the Wails CLI, and on Linux `gcc`, `libgtk-3-dev` and `libwebkit2gtk-4.1-dev`.

```bash
cd server
go install "github.com/wailsapp/wails/v2/cmd/wails@$(go list -m -f '{{.Version}}' github.com/wailsapp/wails/v2)"
cd cmd/desktop

# Linux (CGO, WebKitGTK 4.1)
wails build -tags webkit2_41 -skipbindings

# Windows, cross-compiled from Linux (no CGO)
wails build -platform windows/amd64 -skipbindings
```

Binaries land in `build/bin/`. `wails build` installs and builds the client itself. `-tags webkit2_41` is required: Wails v2 defaults to `webkit2gtk-4.0`, which Debian 13 and Ubuntu 24.04 no longer ship. The Docker build stays CGO-free and doesn't compile `cmd/desktop`.

The AppImage is packaged with `appimagetool` 1.9.1; the steps are in [`.github/workflows/release.yml`](../.github/workflows/release.yml). It relies on the system's `libwebkit2gtk-4.1` instead of bundling it.

## Release

`.github/workflows/release.yml`, `desktop` job on `ubuntu-latest` (the `android` job runs after it, see [`ANDROID.md`](ANDROID.md#release)):

- **Tag `v*`:** builds both targets and creates a **draft** GitHub Release with `rolboard-windows-amd64-vX.Y.Z.exe` and `rolboard-linux-x86_64-vX.Y.Z.AppImage`. Review the notes and publish it by hand.
- **Manual run:** builds both and uploads them as a workflow artifact, no release.

The version also goes into `wails.json` (`info.productVersion`), so the `.exe` shows it in its file properties; manual runs use `dev-<sha>` in the file names and `0.0.0` as product version. The Wails CLI version is read from `go.mod`, so Dependabot bumps keep it in sync. The README links to the latest release page and the landing page reads the asset URLs from the GitHub API, so keep the `windows-amd64` / `linux-x86_64` parts of the names. Third-party actions are pinned by SHA and `appimagetool` is checked against its SHA-256.

## Known limitations

- **WebKitGTK (Linux):** image uploads send the multipart already serialized to bytes, because Wails crashes reading a body that references a `File`. Selects use `appearance: base-select` so the dropdown is HTML, not a GTK menu.
- **"Open in Obsidian"** is hidden: the webview can't hand `obsidian://` off to the system.
- **Unsigned:** SmartScreen warns on Windows.
- **macOS:** builds in principle, but isn't distributed or tested; without an app menu, copy/paste shortcuts won't work there.

## Out of scope for now

- Moving data from a Docker install: copy the `.db` and the uploads folder by hand.
- Merging changes made on two devices at once.
- Auto-update (there's only a notice).
- Code signing (Windows certificate, Apple notarization).
