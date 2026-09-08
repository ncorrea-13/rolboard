# PLAN.md — CI/CD y empaquetado

Estado de avance de CI y la decisión pendiente de cómo servir el frontend en producción. Este archivo es de trabajo (no versionar como documentación final) — cuando el tema se cierre, lo relevante pasa a `docs/ARCHITECTURE.md` y `docs/DECISIONS.md`.

## Hecho

### CI (`.github/workflows/ci.yml`)

- Job `server` (ya existía, sin cambios): build, lint (`golangci-lint`), vet, test sobre `server/`.
- Job `client` (nuevo): setup pnpm 12 + Node 22, `pnpm install --frozen-lockfile`, `pnpm lint` (oxlint), `pnpm build` en `client/`.
- Job `docker` (nuevo): en push a cualquier rama (no en PR), build + push de `server/Dockerfile` a `ghcr.io/<owner>/rolboard-server`, tags por rama y por sha corto (`docker/metadata-action`). Requiere `permissions.packages: write` (ya seteado a nivel workflow).

### Favicon

- `client/public/favicon.svg` reemplazado: D20 (icosaedro) relleno en violeta de marca (`#9b7bea`/`#7457c9`/`#a892f0`), fondo transparente, sin sombreado oscuro inferior.

## Pendiente — decisión: cómo servir el frontend

`docs/ARCHITECTURE.md` línea 57 dejaba esto abierto ("a definir en la fase de despliegue"). Se resolvió en esta sesión:

**Decisión: embeber `client/dist` en el binario Go vía `//go:embed`.** Un solo contenedor, un solo Quadlet unit, sin proceso Caddy aparte.

Razón (KISS, ver perfil del usuario): deploy es single-user, solo accesible por Tailscale, Podman rootless con Quadlet — el mismo patrón simple que ya usa el resto del homelab. Caddy aparte solo aportaría valor si hiciera falta TLS público, caching, o servir el front desde otro dominio, ninguno de los cuales aplica acá. Menos contenedores = menos unidades systemd que mantener.

Actualizar `docs/ARCHITECTURE.md` (sección Despliegue) y `docs/DECISIONS.md` con esta decisión una vez implementada.

## Próximos pasos (implementación, guiada paso a paso — ver `AGENTS.md`)

1. **Elegir dónde vive el `embed.FS`**: nuevo paquete, ej. `server/internal/webui/webui.go`, con `//go:embed all:dist` apuntando a una copia de `client/dist` dentro del módulo Go (el directorio tiene que existir en compile-time, git-ignorado, poblado por el build).
2. **Wiring en el router**: agregar un handler catch-all (después de las rutas `/api/...`) que sirva desde ese `embed.FS` con `http.FileServer(http.FS(...))` — atención al fallback de SPA (rutas de React Router, si las hay, deben caer a `index.html`, no 404).
3. **Multi-stage en `server/Dockerfile`**: agregar un stage previo `node:22-alpine` con corepack/pnpm que corra `pnpm install && pnpm build` en `client/`, copiando el resultado (`client/dist`) al path que espera el `//go:embed` del paso 1, antes del stage `golang:1.27-alpine` que compila el binario.
4. **CI**: una vez el Dockerfile embeba el frontend, el job `docker` de `ci.yml` pasa a ser la única build de imagen real (el job `client` sigue existiendo aparte para catch rápido de errores de lint/build sin esperar la imagen completa).
5. **Actualizar docs**: `docs/ARCHITECTURE.md` (Despliegue) y `docs/DECISIONS.md` con la decisión y su razón, sacar la nota "a definir".

## Notas

- No se tocó `docs/DATA_MODEL.md`, `docs/API.md`, ni el indexador — nada de esto tiene relación con CI/despliegue.
- El job `docker` corre `needs: server` (espera que pase el build/test de Go) pero no depende de `client` — si se quiere bloquear el push de imagen hasta que el frontend esté embebido y buildeando bien, agregar `needs: [server, client]` en el paso 4 de arriba.
