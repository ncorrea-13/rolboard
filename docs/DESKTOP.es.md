# App de escritorio

[English](DESKTOP.md)

Build nativo de Rolboard para una sola computadora, junto al despliegue con Docker. Mismo repositorio, servicios, handlers e indexador del vault; solo cambia el entrypoint. El porqué de cada decisión está en [`DECISIONS.es.md`](DECISIONS.es.md#app-de-escritorio).

Estado: probado en Linux; Windows compila (cross-compile) pero todavía no se ejecutó en una máquina real; macOS no se distribuye.

---

## Docker vs escritorio

| | Docker | Escritorio |
|---|---|---|
| Destino | DM con servidor propio, varios dispositivos | Una sola máquina |
| Entrypoint | `server/cmd/server` | `server/cmd/desktop` |
| Config | env vars | `config.json` que escribe la app |
| Red | Caddy + HTTP en `:8080` | ninguna: el webview habla con el router dentro del proceso |
| Auth | token de admin + códigos por campaña | desactivada (modo local) |
| Distribución | imágenes en GHCR | GitHub Release: `.exe` y AppImage |

## Cómo funciona

```
Ventana de Wails (WebKitGTK / WebView2)
  └── AssetServer
        ├── frontend embebido (client/dist)       archivos estáticos
        ├── /api/desktop/*                         cmd/desktop
        ├── /api/*                                 router de app.New (LocalMode: true)
        └── cualquier otra ruta                    index.html (rutas de la SPA)
```

- `cmd/server` y `cmd/desktop` arman la app con `internal/app.New`. Solo `cmd/desktop` activa `LocalMode`: todo request es admin y `GET /api/admin/session` devuelve `{"localMode": true}`. El cliente lo usa para ocultar códigos de acceso, logout y "Abrir en Obsidian".
- Los datos viven en `os.UserConfigDir()/rolboard/` (`~/.config/rolboard` en Linux, `%AppData%\rolboard` en Windows): `config.json`, `rolboard.db`, `uploads/`.
- `config.json` solo guarda la carpeta de vaults y es opcional. Sin él, la app arranca sin carpeta de vaults y las campañas funcionan solo como dashboard.

### Endpoints solo de escritorio

Los atiende `cmd/desktop` antes del router; en Docker no existen.

```
GET  /api/desktop/vaults-root   {"vaultsRoot": "..."}  ("" si no hay)
POST /api/desktop/vaults-root   abre el diálogo nativo de carpetas; 200 {"vaultsRoot": "..."} o 204 si se cancela
POST /api/desktop/open          {"url": "https://..."}  la abre en el browser predeterminado; solo https
```

Cambiar la carpeta de vaults guarda `config.json` y reconstruye la app en caliente (nuevo `app.New`, cambio de handler, se cierra la DB anterior): no hace falta reiniciar.

## Estructura

```
server/cmd/desktop/
├── main.go             setup de Wails, arranque, endpoints de escritorio
├── main_test.go        /api/desktop/open rechaza URLs que no son https
├── wails.json          comandos de install/build del frontend
├── frontend/           client/dist se copia acá al compilar (ignorado en git, solo .gitkeep)
└── build/
    ├── appicon.png     ícono de la app (ventana en Linux, AppImage)
    └── windows/        icon.ico, manifest e info de versión del .exe
```

`server/internal/desktop/` lee y guarda `config.json` y arma las rutas de datos.

## Compilar desde el código

Requisitos: Go 1.27, Node + pnpm, el CLI de Wails y, en Linux, `gcc`, `libgtk-3-dev` y `libwebkit2gtk-4.1-dev`.

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.14.0
cd server/cmd/desktop

# Linux (CGO, WebKitGTK 4.1)
wails build -tags webkit2_41 -skipbindings

# Windows, compilado desde Linux (sin CGO)
wails build -platform windows/amd64 -skipbindings
```

Los binarios quedan en `build/bin/`. `wails build` instala y compila el cliente solo. `-tags webkit2_41` es obligatorio: Wails v2 usa `webkit2gtk-4.0` por defecto, que Debian 13 y Ubuntu 24.04 ya no traen. El build de Docker sigue sin CGO y no compila `cmd/desktop`.

El AppImage se arma con `appimagetool` 1.9.1; los pasos están en [`.github/workflows/release.yml`](../.github/workflows/release.yml). Usa la `libwebkit2gtk-4.1` del sistema en vez de empaquetarla.

## Release

`.github/workflows/release.yml`, un solo job en `ubuntu-latest`:

- **Tag `v*`:** compila los dos targets y crea un GitHub Release **en borrador** con `rolboard-windows-amd64-vX.Y.Z.exe` y `rolboard-linux-x86_64-vX.Y.Z.AppImage`. Las notas se revisan y se publica a mano.
- **Ejecución manual:** compila los dos y los sube como artifact del workflow, sin release.

La versión también se escribe en `wails.json` (`info.productVersion`), así que el `.exe` la muestra en sus propiedades; las ejecuciones manuales usan `dev-<sha>` en los nombres y `0.0.0` como versión de producto. La versión del CLI de Wails se lee de `go.mod`, así que los bumps de Dependabot la mantienen al día. El README enlaza a la página del último release y la landing lee las URLs de los assets desde la API de GitHub, así que hay que mantener las partes `windows-amd64` / `linux-x86_64` de los nombres. Las acciones de terceros están fijadas por SHA y `appimagetool` se verifica contra su SHA-256.

## Limitaciones conocidas

- **WebKitGTK (Linux):** las subidas de imágenes mandan el multipart ya serializado a bytes, porque Wails crashea al leer un body que referencia un `File`. Los selects usan `appearance: base-select` para que el desplegable sea HTML y no un menú de GTK.
- **"Abrir en Obsidian"** está oculto: el webview no puede delegar `obsidian://` al sistema.
- **Sin firmar:** SmartScreen avisa en Windows.
- **macOS:** en principio compila, pero no se distribuye ni se probó; sin menú de app, los atajos de copiar y pegar no funcionarían.

## Fuera de alcance por ahora

- Pasar datos de una instalación de Docker: copiar el `.db` y la carpeta de uploads a mano.
- Auto-update.
- Firma de código (certificado de Windows, notarización de Apple).
