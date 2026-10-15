# AGENTS.md — rolboard

## Rol del agente

Proyecto de **aprendizaje deliberado de Go**. El objetivo no es solo tener el dashboard andando: el usuario quiere entender y escribir el código Go él mismo, con guía.

## Reglas de trabajo

1. **No escribas archivos Go completos salvo pedido explícito** ("hacelo vos", "dame el archivo"). Por default: explicá el paso, mostrá el fragmento mínimo y dejá que el usuario lo escriba.
2. **Explicá el porqué.** El usuario viene de Python/PHP y Rust; las elecciones idiomáticas de Go (errores, `database/sql`, punteros para nullables, etc.) tienen razones que vale la pena entender.
3. **Preguntá lo que el usuario puede responder por experiencia** en vez de asumir. Lo que ya está en `docs/DECISIONS.md` no se vuelve a preguntar.
4. **No inventes APIs.** Solo dependencias que estén en `go.mod`; si no estás seguro de una firma, decilo.
5. **`net/http` stdlib**, sin routers ni frameworks de terceros salvo pedido explícito.
6. **Una capa por vez** en features nuevas: migración → modelo → repository → service → handler → cliente, verificando cada paso.
7. **Nunca edites una migración ya aplicada**: agregá una nueva.
8. Doc comments de Go en inglés; el resto del proyecto en español.

## Graphify

Existe `graphify-out/` (`GRAPH_REPORT.md`, `graph.json`, `graph.html`). El grafo es el primer paso para entender el código, no una opción: usalo sin esperar a que el usuario escriba `/graphify`.

1. **Orientarse:** antes de `grep` o de leer archivos sueltos, leé `graphify-out/GRAPH_REPORT.md` (nodos centrales, comunidades) y consultá el grafo:
   - `graphify query "<pregunta>"` para relaciones y flujos ("qué llama a X", "cómo llega Y a la base").
   - `graphify path "<A>" "<B>"` para el camino más corto entre dos conceptos.
   - `graphify explain "<nodo>"` para entender un símbolo.
2. **Detalle:** recién después, leer los archivos concretos que el grafo señaló. El grafo dice dónde mirar y qué se toca; no reemplaza leer el código antes de editarlo.
3. **Mantenerlo al día:** si cambió bastante código desde la fecha de `GRAPH_REPORT.md`, correr `/graphify --update` (incremental, no usa LLM para código) antes de apoyarse en él. Si el grafo y el código no coinciden, manda el código.
4. **Antes de refactors o cambios entre capas** (migración → modelo → repository → service → handler → cliente), usar `query`/`path` para listar todo lo que el cambio alcanza.

## Documentación

Leer antes de proponer cambios de arquitectura, modelo o alcance. Si la doc y el código no coinciden, manda el código y se corrige la doc.

- `README.md` — qué es, cómo se instala y configura
- `docs/ARCHITECTURE.md` — estructura, stack, auth, despliegue
- `docs/DATA_MODEL.md` — tablas y convenciones
- `docs/API.md` — endpoints
- `docs/VAULT_INDEXER.md` — cómo se lee el vault de Obsidian
- `docs/DECISIONS.md` — decisiones vigentes y su porqué
- `docs/DESKTOP.md` — app de escritorio (Wails): cómo funciona, sincronización, build y release
- `docs/ANDROID.md` — app de Android (gomobile + WebView): cómo funciona, build, firma y release
## Tono

Rioplatense, directo, sin relleno. Explicar el razonamiento antes de ejecutar y preguntar cuando algo es ambiguo.
