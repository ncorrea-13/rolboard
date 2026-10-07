# App de escritorio

[English](DESKTOP.md)

Build nativo de Rolboard para una sola computadora, junto al despliegue con Docker. Mismo repositorio, servicios, handlers e indexador del vault; solo cambia el entrypoint. La app de Android comparte el mismo runtime: [`ANDROID.es.md`](ANDROID.es.md). El porqué de cada decisión está en [`DECISIONS.es.md`](DECISIONS.es.md#app-de-escritorio).

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
- `config.json` guarda la carpeta de vaults y la de sincronización, las dos opcionales. Sin carpeta de vaults, las campañas funcionan solo como dashboard.
- Las dos carpetas se eligen desde **Ajustes de la app** (el engranaje del selector de campañas), que solo aparece en modo local.
- **Aviso de actualización:** el selector de campañas consulta el último release de GitHub como mucho una vez por día y lo enlaza si es más nuevo que la versión instalada. No descarga nada. La versión se incluye en el cliente al compilar (`VITE_APP_VERSION`, que define el workflow de release en los tags); los builds locales no la tienen y no consultan. En Docker lo ve cualquiera que abra el selector de campañas; CI incluye el último tag que contiene la imagen.
- `cmd/desktop` es una capa fina de Wails sobre `internal/desktop.Runtime`, que maneja la config, la instancia de la app y la sincronización. `server/mobile` envuelve el mismo runtime para Android.

### Endpoints solo de escritorio

Los atiende `cmd/desktop` antes del router; en Docker no existen.

```
GET  /api/desktop/settings      {"vaultsRoot": "...", "syncDir": "..."}  ("" si no hay)
POST /api/desktop/vaults-root   abre el diálogo nativo de carpetas; 200 con los ajustes o 204 si se cancela
POST /api/desktop/sync-dir      lo mismo, para la carpeta de sincronización
POST /api/desktop/open          {"url": "https://..."}  la abre en el browser predeterminado; solo https
```

Cambiar una carpeta guarda `config.json` y reconstruye la app en caliente (nuevo `app.New`, cambio de handler, se cierra la DB anterior): no hace falta reiniciar.

## Sincronización entre dispositivos

Opcional. Se elige una **carpeta de sincronización** que alguna herramienta externa mantenga sincronizada (Syncthing, una nube o copiar archivos a mano). Rolboard nunca abre una base dentro de esa carpeta: solo escribe y lee una copia.

```
<carpeta de sincronización>/
├── rolboard.db            última copia exportada
├── rolboard.conflict.db   la copia del otro dispositivo, guardada si cambiaron los dos
└── uploads/               imágenes (reemplaza al uploads/ local mientras haya sincronización)
```

- **Exportar:** `VACUUM INTO` a un temporal, fsync y rename. La herramienta de sincronización solo ve archivos completos.
- **Importar:** si el SHA-256 de la copia difiere del último que vio este dispositivo. Antes se valida el esquema contra las migraciones embebidas (una copia de una versión más nueva se rechaza) y la base local queda como `rolboard.db.bak`.
- **Cuándo:** el escritorio importa al arrancar y exporta 30 s después del último cambio y al cerrar. Android importa cuando la app vuelve al frente y exporta cuando pasa a segundo plano.
- **Solo después de cambios:** un dispositivo que solo leyó datos no exporta, así que no puede pisar una copia más nueva.
- **Conflictos:** gana la última copia guardada. Si la copia cambió desde la última sincronización y este dispositivo también tiene cambios, la otra se guarda como `rolboard.conflict.db` antes de pisarla.
- **Al elegir la carpeta:** si ya tiene una copia, se importa. Si está vacía, este dispositivo exporta. Las imágenes existentes se copian a `uploads/`.
- `config.json` no se sincroniza: tiene rutas propias de cada máquina.

Pensado para usar un dispositivo por vez; mezclar cambios hechos en dos dispositivos a la vez queda fuera de alcance.

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

- `server/internal/desktop/`: `config.json`, rutas de datos y `Runtime` (ciclo de vida de la app, ajustes, sincronización).
- `server/internal/snapshot/`: exportar, importar, copia de conflicto y copia de imágenes para la carpeta de sincronización.

## Compilar desde el código

Requisitos: Go 1.27, Node + pnpm, el CLI de Wails y, en Linux, `gcc`, `libgtk-3-dev` y `libwebkit2gtk-4.1-dev`.

```bash
cd server
go install "github.com/wailsapp/wails/v2/cmd/wails@$(go list -m -f '{{.Version}}' github.com/wailsapp/wails/v2)"
cd cmd/desktop

# Linux (CGO, WebKitGTK 4.1)
wails build -tags webkit2_41 -skipbindings

# Windows, compilado desde Linux (sin CGO)
wails build -platform windows/amd64 -skipbindings
```

Los binarios quedan en `build/bin/`. `wails build` instala y compila el cliente solo. `-tags webkit2_41` es obligatorio: Wails v2 usa `webkit2gtk-4.0` por defecto, que Debian 13 y Ubuntu 24.04 ya no traen. El build de Docker sigue sin CGO y no compila `cmd/desktop`.

El AppImage se arma con `appimagetool` 1.9.1; los pasos están en [`.github/workflows/release.yml`](../.github/workflows/release.yml). Usa la `libwebkit2gtk-4.1` del sistema en vez de empaquetarla.

## Release

`.github/workflows/release.yml`, job `desktop` en `ubuntu-latest` (el job `android` corre después, ver [`ANDROID.es.md`](ANDROID.es.md#release)):

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
- Mezclar cambios hechos en dos dispositivos a la vez.
- Auto-update (solo hay un aviso).
- Firma de código (certificado de Windows, notarización de Apple).
