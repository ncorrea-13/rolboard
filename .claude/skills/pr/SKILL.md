---
name: pr
description: Arma el título y la descripción de un pull request de rolboard a partir de la rama actual, usando .github/pull_request_template.md. Usar cuando el usuario pida "armar el PR", "descripción del PR" o /pr.
---

# Armar un PR

1. **Base.** Si la rama actual es `dev`, la base es `main`; en cualquier otro caso, `dev`. Confirmá con `git branch --show-current`.
2. **Contexto.** Corré `git log <base>..HEAD --format='%h %s'` y `git diff <base>...HEAD --stat`. Leé los archivos clave del diff si el porqué no sale de los commits.
3. **Plantilla.** Leé `.github/pull_request_template.md` y completá cada sección en español, sin dejar los comentarios `<!-- -->`.
   - *Qué cambia*: viñetas por comportamiento, no por archivo.
   - *Por qué*: el motivo real; si no lo sabés, preguntalo en vez de inventarlo.
   - *Cómo se probó*: marcá `[x]` solo lo que corriste en esta sesión y pegá el resultado real (pasó/falló). Si no lo corriste, dejalo sin marcar.
   - *Notas*: migraciones nuevas, cambios de API o docs, y lo que quedó fuera.
4. **Título.** Una línea al estilo Conventional Commits en español (`fix: ...`, `feat: ...`, `perf: ...`), igual que los commits del repo.
5. **Entrega.** Mostrá título y cuerpo al usuario. No hagas push ni `gh pr create` sin que lo pida explícitamente; si lo pide: `gh pr create --base <base> --title "..." --body-file <archivo>`.
