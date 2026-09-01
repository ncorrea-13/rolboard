# Vault de Obsidian — Indexador

## Relación entre el dashboard y el vault

El dashboard **no reemplaza** el vault de Obsidian — lo complementa. El vault sigue siendo la fuente de verdad para contenido narrativo largo (historias, lore, reglas); el dashboard indexa la **metadata estructurada** (frontmatter YAML) para dar una vista rápida, consultable y navegable que Obsidian no ofrece de fábrica (estado de NPCs, quién está dónde, qué quests están activas).

Cada entidad indexada guarda un campo `obsidian_path` que permite volver a la nota original en cualquier momento (ver `modelo-de-datos.md` y `api.md`).

## Estado real del vault (auditado)

Un audit de frontmatter (ver `decisiones.md`) sobre 166 archivos con contenido indexable arrojó:

- **97% de cobertura de frontmatter** antes de cualquier normalización.
- **0 inconsistencias críticas** de keys o valores.
- Tras dos fases de trabajo con Claude Code (normalización de keys + completado de campos deducibles desde prosa/nombre de archivo): **115 archivos modificados**, quedando **41 pendientes** de resolución manual (casos genuinamente ambiguos: NPCs sin ubicación clara por estar muertos/desaparecidos/infiltrados, sesiones sin fecha documentada).

Esto significa que el indexador puede confiar en el frontmatter como fuente primaria de datos estructurados, sin depender de parseo pesado de prosa.

## Ubicación del código

Todo el indexador vive en `server/internal/vault/`:

```
vault/
├── walker.go       -- recorre el filesystem, filtra .md
├── frontmatter.go  -- separa YAML del cuerpo, parsea a struct
├── wikilinks.go    -- extrae [[wikilinks]] del cuerpo
├── nameindex.go    -- índice nombre de archivo → entidad, detección de duplicados
├── mapper.go       -- mapea carpeta → tipo de entidad; YAML → struct Go
├── resolver.go     -- segunda pasada: resuelve wikilinks a IDs reales
└── indexer.go      -- orquesta el flujo completo
```

Es un paquete separado de `handlers`/`service` porque el indexado es un proceso batch, no un flujo de request/response típico — se dispara desde `POST /api/admin/reindex` (ver `api.md`), no responde a cada request del dashboard.

## Flujo de indexado

El proceso corre en **dos pasadas**, no una sola:

```
1. Primera pasada — lectura y staging
   Por cada .md (filtrando excluidos):
   a. Leer contenido
   b. Separar frontmatter YAML del cuerpo
   c. Parsear YAML → struct tipado según carpeta
   d. Extraer wikilinks del cuerpo con regex
   e. Guardar en staging + registrar en el índice de nombres

2. Segunda pasada — resolución de relaciones
   Ahora que TODO está indexado por nombre:
   a. Resolver cada wikilink (ej. current_location: [[Tashikk]]) a un ID real
   b. Poblar tablas puente (npc_groups, session_npcs, etc.)
   c. Poblar location.parent_location_id
```

**Por qué dos pasadas**: si se resolviera cada wikilink al vuelo durante la primera lectura, se rompería en cualquier caso donde el archivo referenciado todavía no fue procesado (ej. un NPC que aparece antes que la ubicación que referencia, según el orden de recorrido del filesystem).

## Mapeo carpeta → tipo de entidad

```go
var folderToEntityType = map[string]string{
    "NPC":        "npc",         // incluye subcarpetas Humanos, Astillas, Animales, Oyentes
    "Locaciones": "location",    // incluye Ciudades, Extras
    "Grupos":     "group",
    "Sesiones":   "session",     // incluye Arco-N/
    "Jugadores":  "player_character",
    "Arcos":      "arc",
}
```

**Caso especial — Jugadores**: la estructura real es `Jugadores/<NombreJugador>/<archivos>`, con varios archivos por carpeta (`Historia.md`, `Avances.md`, y la ficha del personaje con nombre propio). No toda la carpeta mapea 1:1 a una `player_character` — se identifica la ficha real por coincidencia entre el nombre de archivo y el wikilink declarado en el campo `personaje:` del frontmatter del jugador. El resto de los archivos de esa carpeta son contenido narrativo asociado, no entidades separadas.

## Archivos excluidos del indexado

```
CLAUDE.md
FORMAT.md
Primer Ideal.md
Método para crear NPCs.md
```

Son guías/plantillas/referencia interna, no entidades de campaña.

## Esquema de frontmatter por entidad (post-normalización)

### NPC

```yaml
tipo: npc | spren | entidad-cognitiva | referencia
status: vivo | muerto | desaparecido | activo | consolidado
etnia: string, opcional
rol: string, opcional
faccion: string, opcional        -- alimenta npc_groups en la resolución
vinculo_con: string, opcional     -- relevante para spren
tipo_spren: string, opcional
current_location: [[Wikilink]], opcional
tags: [...]
```

### Locations

```yaml
tipo: ciudad | región | planeta | estructura | shadesmar
relevancia: string
region: string, opcional
facciones_presentes: [[Wikilink], ...], opcional
parent: [[Wikilink]], opcional     -- jerarquía; inferible desde prosa en varios casos
tags: [...]
```

### Groups

```yaml
tipo: faccion | grupo | ...
alineacion: string                -- ojo: renombrado desde "alineamiento" (typo original)
alcance: string, opcional
astilla: string, opcional
investidura: string, opcional
lider: [[Wikilink]], opcional
tags: [...]
```

> `miembros_conocidos` **no se usa como fuente** — se calcula programáticamente desde `npc_groups` en la resolución (ver `modelo-de-datos.md`).

### Sessions

```yaml
tipo: sesion
numero: integer                   -- admite 0
arco: [[Wikilink]], opcional      -- sesiones de planificación pueden no tenerlo
date: YYYY-MM-DD (ISO 8601)
estado: string
titulo: string, opcional
pov: string, opcional
```

### Jugadores (Player Characters)

```yaml
tipo: jugador
jugador: string                   -- nombre real del jugador IRL
personaje: [[Wikilink]]           -- a la ficha del PJ
spren: [[Wikilink]], opcional     -- renombrado desde "spren_futuro"
origen: [[Wikilink]], opcional
estado: string, opcional
```

## Resolución de wikilinks

```go
var wikilinkRe = regexp.MustCompile(`\[\[([^\]|]+)(?:\|[^\]]+)?\]\]`)
```

Contempla el alias de Obsidian (`[[Nombre Real|Alias mostrado]]`).

Obsidian resuelve links por **nombre de archivo**, no por ruta completa — el índice de nombres (`nameindex.go`) usa esa misma convención:

```go
type IndexEntry struct {
    ID      int64
    Name    string // nombre sin extensión, ej. "Tashikk"
    Type    string // "npc", "location", "group", etc.
    RawPath string
}
```

### Problema conocido: nombres duplicados

El vault tiene casos de archivos con el mismo nombre en carpetas distintas (ej. `Luz de plata.md` existe tanto en `Grupos/Planetas/` como en `Locaciones/Extras/`). Un índice plano por nombre colisiona en estos casos.

**Estrategia de resolución** (a implementar en `resolver.go`): desambiguar por el tipo de entidad esperado según el campo que contiene el wikilink (ej. si el campo es `current_location`, buscar solo entre entidades tipo `location`); si aun así hay ambigüedad, marcar como conflicto en el reporte de resultado del reindexado, para revisión manual — nunca resolver a ciegas.

## Render de notas individuales

Ver `GET /api/notes/render` en `api.md`. Usa `goldmark` para convertir Markdown a HTML. Fuera del MVP de este endpoint: manejo completo de wikilinks y embeds de Obsidian dentro del render (`[[link]]` y `![[embed]]` no son Markdown estándar) — se deja como mejora incremental; el contenido se lee igual aunque esos elementos queden como texto plano por ahora.

## Link de apertura directa en Obsidian

```
obsidian://open?vault=<nombre-del-vault>&file=<ruta-relativa>
```

- El **nombre del vault** es config del servidor (variable de entorno, ej. `OBSIDIAN_VAULT_NAME`), no un campo de la base — es constante para toda la instalación.
- Confirmado como funcionalidad de primera clase (no solo fallback): el usuario tiene Obsidian instalado en todos sus dispositivos con el vault sincronizado vía Syncthing, por lo que el deep link funciona de forma consistente sin importar desde qué máquina se abra el dashboard.

## Sincronización del vault con el servidor

- El vault vive en una carpeta sincronizada por **Syncthing**.
- El servidor (ThinkCentre) debe estar incluido como uno de los destinos de esa sincronización.
- El contenedor del dashboard monta esa carpeta como **volumen read-only** — el indexador nunca escribe sobre el vault.
- `.git/` de esa misma carpeta (si el vault también es un repo de Codeberg) debe estar **excluido vía `.stignore`** de Syncthing, para evitar que Syncthing intente sincronizar a nivel de bytes los objetos internos de Git, lo cual puede generar corrupción si hay commits hechos desde distintos dispositivos.
