# App de Android

[English](ANDROID.md)

Build nativo de Rolboard para un teléfono o tablet Android. Corre entero en el dispositivo, sin servidor ni internet, como la [app de escritorio](DESKTOP.es.md). Mismo repositorio, servicios, handlers e indexador del vault; solo cambian el entrypoint y la forma en que el cliente llega al router. El porqué de cada decisión está en [`DECISIONS.es.md`](DECISIONS.es.md#app-de-android).

Estado: probado en un teléfono ARM64. Solo se compila `arm64-v8a`.

---

## Escritorio vs Android

| | Escritorio | Android |
|---|---|---|
| Entrypoint | `server/cmd/desktop` (Wails v2) | `server/mobile` (gomobile) + proyecto `android/` |
| Host del frontend | webview de Wails | `WebView` de Android |
| Transporte a la API | `AssetServer.Handler` dentro del proceso | GET interceptados + puente JS → Kotlin → Go |
| Datos | `os.UserConfigDir()/rolboard/` | `filesDir` privado de la app |
| Carpeta de vaults | diálogo nativo de carpetas | selector de carpetas de Android, leída por ruta con "Acceso a todos los archivos" |
| Distribución | `.exe` y AppImage | APK firmado en GitHub Releases |

En los dos la auth está desactivada (modo local). Los dos usan el mismo `internal/desktop.Runtime`, así que los ajustes y la [sincronización](DESKTOP.es.md#sincronización-entre-dispositivos) funcionan igual.

## Cómo funciona

```
MainActivity (Kotlin)
  └── WebView en https://rolboard.local (origen virtual, nada escucha en un puerto)
        ├── shouldInterceptRequest
        │     ├── GET /api/*         → Mobile.request → router de app.New (LocalMode: true)
        │     └── cualquier otra     → client/dist desde los assets del APK, fallback a index.html
        └── window.RolboardAndroid   (JavascriptInterface)
              ├── request            POST / PUT / DELETE → Mobile.request
              ├── settings           {"vaultsRoot", "syncDir"}
              ├── pickFolder         selector de carpetas → Mobile.setVaultsRoot / setSyncDir
              └── openExternal       links https en el navegador del sistema
```

- El `WebView` de Android no le pasa los cuerpos de POST a `shouldInterceptRequest`; por eso las escrituras van por el puente. El cliente elige el transporte en `client/src/lib/android.ts`: si existe `window.RolboardAndroid`, los requests que no son GET van por ahí; si no, `fetch`.
- `server/mobile` es el paquete de gomobile: `Start`, `Stop`, `Request` (corre el router con `httptest.NewRecorder`), los setters de carpetas y `Push` / `Pull`. gomobile lo convierte en `rolboard.aar`, un paquete Java llamado `mobile`.
- **Ciclo de vida:** `onResume` trae la copia de sincronización y recarga la página si cambió; `onPause` exporta; `onDestroy` (al cerrar la app) detiene el runtime. Los tres corren en un mismo hilo, en orden.
- **Carpeta de vaults:** necesita el permiso "Acceso a todos los archivos" (`MANAGE_EXTERNAL_STORAGE`, o `READ_EXTERNAL_STORAGE` + `WRITE_EXTERNAL_STORAGE` en Android 8–10). La primera vez, la app abre la pantalla del permiso; después de darlo, hay que elegir la carpeta de nuevo. El selector devuelve un URI de árbol que se convierte a ruta (`primary:Documents/Obsidian` → `/storage/emulated/0/Documents/Obsidian`), así que Go lee el vault como cualquier carpeta, sin copiarlo. Si el vault ya está sincronizado en el teléfono, Rolboard lo ve al día.
- El aviso de actualización funciona como en [escritorio](DESKTOP.es.md#cómo-funciona); el CSP permite `connect-src https://api.github.com` para eso.
- La app respeta las barras del sistema (insets edge-to-edge) y fija `textZoom` en 100 para que la UI coincida con la web.

## Estructura

```
server/mobile/
├── mobile.go           API de gomobile sobre desktop.Runtime
└── mobile_test.go      crea una campaña con Request y la lee de vuelta
android/
├── settings.gradle, build.gradle, gradle.properties
└── app/
    ├── build.gradle    SDK 26–36, arm64-v8a, versión y firma desde el build
    ├── libs/           rolboard.aar (generado, ignorado en git)
    └── src/main/
        ├── AndroidManifest.xml
        ├── assets/web/ client/dist (generado, ignorado en git)
        ├── java/io/github/ncorrea_13/rolboard/MainActivity.kt
        └── res/        ícono adaptable y strings
docker-compose.android.yml   build de debug en un contenedor
```

## Compilar desde el código

No hace falta el SDK de Android instalado: `docker-compose.android.yml` corre todo el build en `reactnativecommunity/react-native-android` (JDK 17 + SDK de Android). Funciona con Podman y Docker.

```bash
podman compose -f docker-compose.android.yml run --rm apk
```

El APK queda en `android/dist/rolboard-debug.apk`. El build:

1. Copia el repo (montado de solo lectura) dentro del contenedor, así que no escribe nada en el árbol de trabajo salvo `android/dist/`.
2. Baja la versión de Go de `server/go.mod`, compila el cliente y copia `client/dist` a los assets del APK.
3. Corre `gomobile bind -target=android/arm64 -androidapi 26` sobre `./mobile`. `gomobile` y `gobind` son directivas `tool` en `go.mod`.
4. Baja Gradle 9.8.0 (verificado contra su SHA-256; AGP 9 necesita Gradle ≥ 9.6, más nuevo que el de la imagen) y corre `assembleDebug`.

Volúmenes con nombre guardan Go, los módulos, pnpm, Gradle, los paquetes del SDK que agrega Gradle y la clave de firma de debug. No borrarlos (`podman volume ls`): el primer build baja varios GB, y con una clave de debug nueva Android no actualiza la app instalada.

## Release

El job `android` de `.github/workflows/release.yml` corre después del job `desktop` (dos jobs creando el borrador a la vez podrían dejar dos borradores). Compila el cliente, corre `gomobile bind` con el NDK del runner, baja el mismo Gradle y corre `assembleRelease`.

- **Versión desde el tag:** `v0.1.2` → `versionName 0.1.2`, `versionCode 102` (`major*10000 + minor*100 + patch`, así que minor y patch llegan hasta 99). Las ejecuciones manuales usan `0.0.0` y código `1`.
- **Tag `v*`:** agrega `rolboard-android-arm64-vX.Y.Z.apk` al release en borrador.
- **Ejecución manual:** sube el APK como artifact del workflow, sin release.
- **Firma:** dos secrets del repositorio.
  - `ANDROID_KEYSTORE_BASE64`: `base64 -w0 rolboard-release.jks`
  - `ANDROID_KEYSTORE_PASSWORD`: se usa para la keystore y para la clave. El alias es fijo: `rolboard`.

Para crear la keystore, una sola vez:

```bash
podman run --rm -it -v ~/keys:/k docker.io/eclipse-temurin:17 \
  keytool -genkeypair -keystore /k/rolboard-release.jks -alias rolboard \
  -keyalg RSA -keysize 4096 -validity 10000
```

Guardar un backup de la keystore y su contraseña fuera de la máquina. Android solo instala una actualización firmada con la misma clave: si se pierde, para tener versiones nuevas hay que desinstalar (y perder los datos).

## Instalar

1. Bajar el APK en el teléfono y abrirlo; permitir instalar desde esa app cuando lo pida.
2. **Play Protect** avisa que la app es de un desarrollador desconocido: *Más detalles → Instalar de todas formas*. Desde la app no hay forma de evitarlo.
3. Actualizar: instalar el APK nuevo encima del anterior. Los datos se conservan si los dos están firmados con la misma clave. Un build de debug y uno de release usan claves distintas, así que pasar de uno a otro requiere desinstalar.

## Limitaciones conocidas

- **Solo ARM64.** `modernc.org/libc` usa `SYS_lstat` en `linux_amd64`, que el filtro seccomp de Android bloquea, así que un build x86_64 crashea al abrir la base. Eso descarta los emuladores x86_64. Plan B, si alguna vez hace falta: `ncruces/go-sqlite3` (SQLite en WASM, sin CGO).
- **Tamaño del APK:** unos 20 MB, casi todo la librería de Go.
- **"Abrir en Obsidian"** está oculto, como en escritorio.
- **CSS:** `appearance: base-select` y las View Transitions dependen de la versión del Android System WebView del teléfono; sin soporte la UI degrada, pero sigue andando.

## Fuera de alcance por ahora

- Google Play: cuesta USD 25, tiene revisión y casi nunca aprueba "Acceso a todos los archivos".
- iOS.
- Mezclar cambios hechos en dos dispositivos a la vez.
