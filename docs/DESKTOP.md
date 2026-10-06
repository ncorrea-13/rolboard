# Desktop app

[Español](DESKTOP.es.md)

Native build of Rolboard for a single computer, next to the Docker deployment. Same repository, services, handlers and vault indexer; only the entrypoint changes. The reasoning behind each choice is in [`DECISIONS.md`](DECISIONS.md#desktop-app).

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
- `config.json` only stores the vaults folder and is optional. Without it the app starts with no vaults folder and campaigns work dashboard-only.

### Desktop-only endpoints

Served by `cmd/desktop` before the router; they don't exist in Docker.

```
GET  /api/desktop/vaults-root   {"vaultsRoot": "..."}  ("" if none)
POST /api/desktop/vaults-root   opens the native folder dialog; 200 {"vaultsRoot": "..."} or 204 if cancelled
POST /api/desktop/open          {"url": "https://..."}  opens it in the default browser; https only
```

Changing the vaults folder saves `config.json` and rebuilds the app in place (new `app.New`, handler swap, old DB closed): no restart.

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

`server/internal/desktop/` loads and saves `config.json` and builds the data paths.

## Build from source

Requirements: Go 1.27, Node + pnpm, the Wails CLI, and on Linux `gcc`, `libgtk-3-dev` and `libwebkit2gtk-4.1-dev`.

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.14.0
cd server/cmd/desktop

# Linux (CGO, WebKitGTK 4.1)
wails build -tags webkit2_41 -skipbindings

# Windows, cross-compiled from Linux (no CGO)
wails build -platform windows/amd64 -skipbindings
```

Binaries land in `build/bin/`. `wails build` installs and builds the client itself. `-tags webkit2_41` is required: Wails v2 defaults to `webkit2gtk-4.0`, which Debian 13 and Ubuntu 24.04 no longer ship. The Docker build stays CGO-free and doesn't compile `cmd/desktop`.

The AppImage is packaged with `appimagetool` 1.9.1; the steps are in [`.github/workflows/release.yml`](../.github/workflows/release.yml). It relies on the system's `libwebkit2gtk-4.1` instead of bundling it.

## Release

`.github/workflows/release.yml`, a single `ubuntu-latest` job:

- **Tag `v*`:** builds both targets and publishes a GitHub Release with `rolboard-windows-amd64.exe` and `rolboard-linux-x86_64.AppImage`.
- **Manual run:** builds both and uploads them as a workflow artifact, no release.

Keep those asset names: the landing page and the README link to `releases/latest/download/<name>`. Third-party actions are pinned by SHA and `appimagetool` is checked against its SHA-256.

## Known limitations

- **WebKitGTK (Linux):** image uploads send the multipart already serialized to bytes, because Wails crashes reading a body that references a `File`. Selects use `appearance: base-select` so the dropdown is HTML, not a GTK menu.
- **"Open in Obsidian"** is hidden: the webview can't hand `obsidian://` off to the system.
- **Unsigned:** SmartScreen warns on Windows.
- **macOS:** builds in principle, but isn't distributed or tested; without an app menu, copy/paste shortcuts won't work there.

## Out of scope for now

- Moving data from a Docker install: copy the `.db` and the uploads folder by hand.
- Auto-update.
- Code signing (Windows certificate, Apple notarization).
