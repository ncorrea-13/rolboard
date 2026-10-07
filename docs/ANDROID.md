# Android app

[Español](ANDROID.es.md)

Native build of Rolboard for an Android phone or tablet. It runs entirely on the device, with no server and no internet, like the [desktop app](DESKTOP.md). Same repository, services, handlers and vault indexer; only the entrypoint and the way the client reaches the router change. The reasoning behind each choice is in [`DECISIONS.md`](DECISIONS.md#android-app).

Status: tested on an ARM64 phone. Only `arm64-v8a` is built.

---

## Desktop vs Android

| | Desktop | Android |
|---|---|---|
| Entrypoint | `server/cmd/desktop` (Wails v2) | `server/mobile` (gomobile) + `android/` project |
| Frontend host | Wails webview | Android `WebView` |
| Transport to the API | `AssetServer.Handler` in-process | intercepted GETs + JS bridge → Kotlin → Go |
| Data | `os.UserConfigDir()/rolboard/` | the app's private `filesDir` |
| Vaults folder | native folder dialog | Android folder picker, read by path with "All files access" |
| Distribution | `.exe` and AppImage | signed APK on GitHub Releases |

Auth is off (local mode) in both. Both use the same `internal/desktop.Runtime`, so settings and [sync](DESKTOP.md#sync-between-devices) behave the same.

## How it runs

```
MainActivity (Kotlin)
  └── WebView at https://rolboard.local (virtual origin, nothing listens on a port)
        ├── shouldInterceptRequest
        │     ├── GET /api/*         → Mobile.request → router from app.New (LocalMode: true)
        │     └── anything else      → client/dist from the APK assets, index.html fallback
        └── window.RolboardAndroid   (JavascriptInterface)
              ├── request            POST / PUT / DELETE → Mobile.request
              ├── settings           {"vaultsRoot", "syncDir"}
              ├── pickFolder         Android folder picker → Mobile.setVaultsRoot / setSyncDir
              └── openExternal       https links in the system browser
```

- Android's `WebView` doesn't hand POST bodies to `shouldInterceptRequest`, hence the bridge for writes. The client picks the transport in `client/src/lib/android.ts`: if `window.RolboardAndroid` exists, non-GET requests go through it; otherwise `fetch`.
- `server/mobile` is the gomobile package: `Start`, `Stop`, `Request` (runs the router with `httptest.NewRecorder`), the folder setters and `Push` / `Pull`. gomobile turns it into `rolboard.aar`, a Java package named `mobile`.
- **Lifecycle:** `onResume` pulls the sync snapshot and reloads the page if it changed; `onPause` pushes; `onDestroy` (when finishing) stops the runtime. All three run on one thread, in order.
- **Vaults folder:** needs the "All files access" permission (`MANAGE_EXTERNAL_STORAGE`, or `READ_EXTERNAL_STORAGE` + `WRITE_EXTERNAL_STORAGE` on Android 8–10). The first time, the app opens the permission screen; after granting it, pick the folder again. The picker returns a tree URI that is turned into a path (`primary:Documents/Obsidian` → `/storage/emulated/0/Documents/Obsidian`), so Go reads the vault like any folder, with no copy. If the vault is already synced to the phone, Rolboard sees it up to date.
- The update notice works as on [desktop](DESKTOP.md#how-it-runs); the CSP allows `connect-src https://api.github.com` for it.
- The app follows the system bars (edge-to-edge insets) and pins `textZoom` to 100 so the UI matches the web.

## Layout

```
server/mobile/
├── mobile.go           gomobile API over desktop.Runtime
└── mobile_test.go      creates a campaign through Request and reads it back
android/
├── settings.gradle, build.gradle, gradle.properties
└── app/
    ├── build.gradle    SDK 26–36, arm64-v8a, version and signing from the build
    ├── libs/           rolboard.aar (generated, git-ignored)
    └── src/main/
        ├── AndroidManifest.xml
        ├── assets/web/ client/dist (generated, git-ignored)
        ├── java/io/github/ncorrea_13/rolboard/MainActivity.kt
        └── res/        adaptive icon and strings
docker-compose.android.yml   debug build in a container
```

## Build from source

No local Android SDK needed: `docker-compose.android.yml` runs the whole build in `reactnativecommunity/react-native-android` (JDK 17 + Android SDK). Works with Podman and Docker.

```bash
podman compose -f docker-compose.android.yml run --rm apk
```

The APK lands in `android/dist/rolboard-debug.apk`. The build:

1. Copies the repo (mounted read-only) into the container, so nothing is written to the working tree except `android/dist/`.
2. Downloads the Go version from `server/go.mod`, builds the client and copies `client/dist` to the APK assets.
3. Runs `gomobile bind -target=android/arm64 -androidapi 26` on `./mobile`. `gomobile` and `gobind` are `tool` directives in `go.mod`.
4. Downloads Gradle 9.8.0 (checked against its SHA-256; AGP 9 needs Gradle ≥ 9.6, newer than the image's) and runs `assembleDebug`.

Named volumes cache Go, modules, pnpm, Gradle, the SDK packages Gradle adds and the debug signing key. Keep them (`podman volume ls`): the first build downloads several GB, and a new debug key means Android won't update the installed app over it.

## Release

The `android` job in `.github/workflows/release.yml` runs after the `desktop` job (two jobs creating the draft at the same time could make two drafts). It builds the client, runs `gomobile bind` with the runner's NDK, downloads the same Gradle and runs `assembleRelease`.

- **Version from the tag:** `v0.1.2` → `versionName 0.1.2`, `versionCode 102` (`major*10000 + minor*100 + patch`, so minor and patch go up to 99). Manual runs use `0.0.0` and code `1`.
- **Tag `v*`:** adds `rolboard-android-arm64-vX.Y.Z.apk` to the draft release.
- **Manual run:** uploads the APK as a workflow artifact, no release.
- **Signing:** two repository secrets.
  - `ANDROID_KEYSTORE_BASE64`: `base64 -w0 rolboard-release.jks`
  - `ANDROID_KEYSTORE_PASSWORD`: used for both the keystore and the key. The key alias is fixed to `rolboard`.

To create the keystore once:

```bash
podman run --rm -it -v ~/keys:/k docker.io/eclipse-temurin:17 \
  keytool -genkeypair -keystore /k/rolboard-release.jks -alias rolboard \
  -keyalg RSA -keysize 4096 -validity 10000
```

Back up the keystore and its password outside the machine. Android only installs an update signed with the same key: losing it means users have to uninstall (and lose their data) to get new versions.

## Installing

1. Download the APK on the phone and open it; allow installing from that app when asked.
2. **Play Protect** warns about an app from an unknown developer: *More details → Install anyway*. Nothing in the app can skip it.
3. Updating: install the new APK over the old one. Data stays, as long as both are signed with the same key. A debug build and a release build use different keys, so switching between them needs an uninstall.

## Known limitations

- **ARM64 only.** `modernc.org/libc` calls `SYS_lstat` on `linux_amd64`, which Android's seccomp filter blocks, so an x86_64 build crashes opening the DB. That rules out x86_64 emulators. Plan B, if ever needed: `ncruces/go-sqlite3` (SQLite in WASM, no CGO).
- **APK size:** about 20 MB, mostly the Go library.
- **"Open in Obsidian"** is hidden, as on desktop.
- **CSS:** `appearance: base-select` and View Transitions depend on the phone's Android System WebView version; without them the UI degrades but still works.

## Out of scope for now

- Google Play: costs USD 25, has a review process, and rarely approves "All files access".
- iOS.
- Merging changes made on two devices at once.
