import type { ReactNode } from "react";
import { Callout, Code } from "../components/HelpBlocks";
import type { Lang } from "../lib/i18n";

export interface HelpSection {
  id: string;
  title: string;
  body: ReactNode;
}

const YAML_EXAMPLE = `---
tipo: npc
status: vivo
current_location: "[[Urithiru]]"
faccion:
  - "[[Puente Cuatro]]"
---`;

const CALLOUT_EXAMPLE = `> [!NOTE]
> ...

> [!WARNING] ...`;

const es: HelpSection[] = [
  {
    id: "que-es",
    title: "Qué es Rolboard",
    body: (
      <>
        <p>
          Un tablero para el <strong>DM</strong>: sesiones, arcos, NPCs,
          jugadores, locaciones, facciones, quests y un tracker de combate.
          Sirve para cualquier sistema (Cosmere RPG, D&amp;D 5e…); las fichas
          son libres.
        </p>
        <p>
          Puede convivir con un <strong>vault de Obsidian</strong>: la app lee
          el frontmatter de tus notas y las convierte en entidades, pero el
          texto largo sigue viviendo en Obsidian. Si no usás Obsidian, también
          funciona solo con el dashboard.
        </p>
        <Callout kind="note" title="Una sola persona">
          Es una herramienta para el DM. No hay vistas para jugadores ni estado
          compartido en vivo.
        </Callout>
      </>
    ),
  },
  {
    id: "primeros-pasos",
    title: "Primeros pasos",
    body: (
      <>
        <ol>
          <li>
            <strong>Crear una campaña.</strong> En el selector,{" "}
            <em>Nueva campaña</em>. Pide la clave de admin (el token de la
            instancia), el nombre, el sistema y, opcionalmente, la carpeta del
            vault.
          </li>
          <li>
            <strong>Poner un código de acceso.</strong> Dentro de la campaña, el
            botón de ajustes del sidebar → <em>Nuevo código de acceso</em>{" "}
            (mínimo 8 caracteres).
          </li>
          <li>
            <strong>Entrar.</strong> Desde el selector, elegí la campaña e
            ingresá ese código. Cada campaña tiene sus propios datos y su
            propio código.
          </li>
        </ol>
        <p>
          El botón de ajustes también cambia el nombre, el sistema y el estado
          (activa, pausada, finalizada).
        </p>
      </>
    ),
  },
  {
    id: "vault",
    title: "Vault de Obsidian",
    body: (
      <>
        <p>
          Cada campaña apunta a una subcarpeta de <code>VAULTS_ROOT</code>. La
          app <strong>nunca escribe</strong> en el vault: solo lo lee.
        </p>
        <p>
          Para importar, tocá <strong>Reindexar vault</strong> en el Resumen.
          Solo cuenta la carpeta de primer nivel:
        </p>
        <table>
          <thead>
            <tr>
              <th>Carpeta</th>
              <th>Se convierte en</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>NPC/</code></td><td>NPCs</td></tr>
            <tr><td><code>Locaciones/</code></td><td>Locaciones</td></tr>
            <tr><td><code>Grupos/</code></td><td>Facciones</td></tr>
            <tr><td><code>Sesiones/</code></td><td>Sesiones</td></tr>
            <tr><td><code>Jugadores/</code></td><td>Personajes de jugador</td></tr>
            <tr><td><code>Arcos/</code></td><td>Arcos</td></tr>
          </tbody>
        </table>
        <p>
          Cualquier otra carpeta se ignora. El <strong>nombre</strong> de la
          entidad es el del archivo sin <code>.md</code>. Los enlaces entre
          notas van entre comillas en el YAML:
        </p>
        <Code>{YAML_EXAMPLE}</Code>
        <ul>
          <li>
            <strong>Reindexar es incremental.</strong> Si una nota no cambió, no
            se pisa lo que editaste en la app.
          </li>
          <li>
            <strong>Si una nota falla</strong>, el resto se indexa igual y el
            error se informa al final.
          </li>
          <li>
            <strong>Si borrás una nota</strong> del vault, la entidad se da de
            baja en el próximo reindex.
          </li>
          <li>
            En cada entidad hay <strong>Abrir en Obsidian</strong> (vía{" "}
            <code>obsidian://</code>) y <strong>Ver nota renderizada</strong>{" "}
            (la nota completa, con wikilinks y callouts).
          </li>
        </ul>
        <p>
          Hay un ejemplo de estructura en <code>vault-template/</code>, y el
          detalle de cada campo está en <code>docs/VAULT_INDEXER.md</code>.
        </p>
      </>
    ),
  },
  {
    id: "tipos-de-npc",
    title: "Tipos de NPC",
    body: (
      <>
        <p>
          Cada campaña define <strong>sus propios tipos</strong> de NPC
          (Humano, Spren, Monstruo…). Se gestionan con el botón{" "}
          <strong>Tipos</strong>, en la lista de NPCs y en el editor de NPC:
        </p>
        <ul>
          <li>
            <strong>Añadir:</strong> escribí el nombre, elegí un color y tocá{" "}
            <em>Añadir</em>.
          </li>
          <li>
            <strong>Renombrar o recolorear:</strong> editá directo en la fila;
            se guarda solo.
          </li>
          <li>
            <strong>Borrar:</strong> con el ícono de basura. No se puede borrar
            un tipo que algún NPC esté usando.
          </li>
        </ul>
        <p>
          Cada tipo tiene una <strong>clave</strong> que se deriva del nombre (
          <code>Monstruo Élite</code> → <code>monstruo-elite</code>) y no
          cambia nunca. Es lo que va en <code>tipo:</code> en el vault.
        </p>
        <Callout kind="tip" title="Tipos desde el vault">
          Si una nota dice <code>tipo: monstruo</code> y la campaña no tiene ese
          tipo, el reindex <strong>lo crea solo</strong>, con el color siguiente
          libre. Un error de tipeo también crea un tipo: se corrige o borra
          desde <em>Tipos</em>.
        </Callout>
        <p>
          <code>referencia</code> es un valor reservado para notas que solo
          sirven de destino de enlaces; no aparece como tipo.
        </p>
      </>
    ),
  },
  {
    id: "sesiones",
    title: "Sesiones",
    body: (
      <>
        <ol>
          <li>
            <strong>Planificar.</strong> Elegí una fecha tentativa, escribí las
            notas de preparación (admiten Markdown) y marcá los NPCs y las
            quests que esperás usar. La sesión queda como <em>planificada</em>.
          </li>
          <li>
            <strong>Jugar.</strong> Abrila y tocá{" "}
            <strong>Marcar como jugada</strong>: ponés la fecha real y el
            resumen de lo que pasó. Las notas de preparación se guardan aparte
            y no se pisan.
          </li>
          <li>
            <strong>Durante el juego</strong>, debajo del resumen aparecen los{" "}
            <strong>wardails</strong> de la campaña, si los definiste.
          </li>
        </ol>
        <p>Las sesiones se agrupan por arco en la línea de tiempo.</p>
      </>
    ),
  },
  {
    id: "markdown",
    title: "Markdown y callouts",
    body: (
      <>
        <p>
          Todos los campos marcados con <em>(admite Markdown)</em>{" "}
          (descripciones, resúmenes, ganchos y notas de quests, trasfondos,
          notas de preparación, wardails) se muestran con formato. Los callouts
          al estilo Obsidian funcionan igual que en el vault:
        </p>
        <Code>{CALLOUT_EXAMPLE}</Code>
        <Callout kind="note" title="Nota">
          Una nota informativa.
        </Callout>
        <Callout kind="warning" title="Título propio">
          Algo que conviene no olvidar.
        </Callout>
        <Callout kind="tip" title="Tip">
          También existen <code>TIP</code> y <code>QUOTE</code>.
        </Callout>
      </>
    ),
  },
  {
    id: "wardails",
    title: "Wardails",
    body: (
      <>
        <p>
          Los <strong>wardails</strong> son los temas sensibles de la campaña
          (por ejemplo, violencia, duelo, abuso…): un texto libre en Markdown
          que definís una vez por campaña.
        </p>
        <ul>
          <li>
            <strong>Dónde:</strong> en el sidebar, debajo de{" "}
            <em>Encuentros</em>, con la cruz rosa.
          </li>
          <li>
            <strong>Editar:</strong> botón <em>Editar</em>, escribí y{" "}
            <em>Guardar</em>. Usá <code>&gt; [!WARNING]</code> para resaltar lo
            más delicado.
          </li>
          <li>
            <strong>Cuándo se ven:</strong> al marcar una sesión como jugada,
            debajo del resumen, para tenerlos presentes en la mesa.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "encuentros",
    title: "Encuentros",
    body: (
      <>
        <p>
          Un tracker de combate pensado para el DM, sin mapa. Cada encuentro
          tiene rondas (<em>+1 ronda</em>) y se abre y cierra con{" "}
          <em>Iniciar combate</em> / <em>Cerrar combate</em>.
        </p>
        <ul>
          <li>
            <strong>Participantes:</strong> un personaje, un NPC o un{" "}
            <em>enemigo genérico</em> (por ejemplo «Bandido 3»), que lleva su
            propia ficha.
          </li>
          <li>
            <strong>Orden:</strong> turnos <em>rápidos</em> y <em>lentos</em>{" "}
            (Cosmere RPG) o iniciativa numérica (D&amp;D).
          </li>
          <li>
            <strong>Vida:</strong> la de los personajes se guarda en su ficha y
            se sincroniza desde el tracker.
          </li>
          <li>
            <strong>Ficha completa:</strong> atributos y habilidades de cada
            participante, sin salir del encuentro.
          </li>
        </ul>
      </>
    ),
  },
];

const en: HelpSection[] = [
  {
    id: "what-is",
    title: "What is Rolboard",
    body: (
      <>
        <p>
          A board for the <strong>DM</strong>: sessions, arcs, NPCs, players,
          locations, factions, quests and a combat tracker. It works for any
          system (Cosmere RPG, D&amp;D 5e…); character sheets are free-form.
        </p>
        <p>
          It can live alongside an <strong>Obsidian vault</strong>: the app
          reads your notes' frontmatter and turns them into entities, while the
          long prose stays in Obsidian. If you don't use Obsidian it also works
          dashboard-only.
        </p>
        <Callout kind="note" title="One person">
          This is a tool for the DM. There are no player views and no live
          shared state.
        </Callout>
      </>
    ),
  },
  {
    id: "getting-started",
    title: "Getting started",
    body: (
      <>
        <ol>
          <li>
            <strong>Create a campaign.</strong> In the selector,{" "}
            <em>New campaign</em>. It asks for the admin key (the instance
            token), a name, the system and, optionally, the vault folder.
          </li>
          <li>
            <strong>Set an access code.</strong> Inside the campaign, the
            settings button in the sidebar → <em>New access code</em> (at least
            8 characters).
          </li>
          <li>
            <strong>Log in.</strong> From the selector, pick the campaign and
            enter that code. Each campaign has its own data and its own code.
          </li>
        </ol>
        <p>
          The settings button also changes the name, the system and the status
          (active, paused, finished).
        </p>
      </>
    ),
  },
  {
    id: "vault",
    title: "Obsidian vault",
    body: (
      <>
        <p>
          Each campaign points to a subfolder of <code>VAULTS_ROOT</code>. The
          app <strong>never writes</strong> to the vault: it only reads it.
        </p>
        <p>
          To import, press <strong>Reindex vault</strong> on the Overview. Only
          the top-level folder matters:
        </p>
        <table>
          <thead>
            <tr>
              <th>Folder</th>
              <th>Becomes</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>NPC/</code></td><td>NPCs</td></tr>
            <tr><td><code>Locaciones/</code></td><td>Locations</td></tr>
            <tr><td><code>Grupos/</code></td><td>Factions</td></tr>
            <tr><td><code>Sesiones/</code></td><td>Sessions</td></tr>
            <tr><td><code>Jugadores/</code></td><td>Player characters</td></tr>
            <tr><td><code>Arcos/</code></td><td>Arcs</td></tr>
          </tbody>
        </table>
        <p>
          Any other folder is ignored. The entity's <strong>name</strong> is the
          file name without <code>.md</code>. Links between notes go in quotes
          in the YAML:
        </p>
        <Code>{YAML_EXAMPLE}</Code>
        <ul>
          <li>
            <strong>Reindexing is incremental.</strong> If a note hasn't
            changed, what you edited in the app isn't overwritten.
          </li>
          <li>
            <strong>If a note fails</strong>, the rest is still indexed and the
            error is reported at the end.
          </li>
          <li>
            <strong>If you delete a note</strong> from the vault, its entity is
            removed on the next reindex.
          </li>
          <li>
            Each entity has <strong>Open in Obsidian</strong> (via{" "}
            <code>obsidian://</code>) and <strong>View rendered note</strong>{" "}
            (the full note, with wikilinks and callouts).
          </li>
        </ul>
        <p>
          There is a sample layout in <code>vault-template/</code>, and every
          field is detailed in <code>docs/VAULT_INDEXER.md</code>.
        </p>
      </>
    ),
  },
  {
    id: "npc-types",
    title: "NPC types",
    body: (
      <>
        <p>
          Each campaign defines <strong>its own</strong> NPC types (Human,
          Spren, Monster…). Manage them with the <strong>Types</strong> button,
          on the NPC list and in the NPC editor:
        </p>
        <ul>
          <li>
            <strong>Add:</strong> type a name, pick a color and press{" "}
            <em>Add</em>.
          </li>
          <li>
            <strong>Rename or recolor:</strong> edit right in the row; it saves
            on its own.
          </li>
          <li>
            <strong>Delete:</strong> with the trash icon. A type that any NPC
            uses can't be deleted.
          </li>
        </ul>
        <p>
          Each type has a <strong>key</strong> derived from its name (
          <code>Monstruo Élite</code> → <code>monstruo-elite</code>) that never
          changes. It is what goes in <code>tipo:</code> in the vault.
        </p>
        <Callout kind="tip" title="Types from the vault">
          If a note says <code>tipo: monstruo</code> and the campaign has no
          such type, the reindex <strong>creates it</strong>, with the next free
          color. A typo also creates a type: fix or delete it from{" "}
          <em>Types</em>.
        </Callout>
        <p>
          <code>referencia</code> is a reserved value for notes that only serve
          as link targets; it doesn't show up as a type.
        </p>
      </>
    ),
  },
  {
    id: "sessions",
    title: "Sessions",
    body: (
      <>
        <ol>
          <li>
            <strong>Plan.</strong> Pick a tentative date, write the prep notes
            (Markdown supported) and tick the NPCs and quests you expect to use.
            The session stays <em>planned</em>.
          </li>
          <li>
            <strong>Play.</strong> Open it and press{" "}
            <strong>Mark as played</strong>: set the real date and a recap of
            what happened. The prep notes are kept separately and never
            overwritten.
          </li>
          <li>
            <strong>While playing</strong>, the campaign's{" "}
            <strong>wardails</strong> show up below the recap, if you defined
            any.
          </li>
        </ol>
        <p>Sessions are grouped by arc in the timeline.</p>
      </>
    ),
  },
  {
    id: "markdown",
    title: "Markdown and callouts",
    body: (
      <>
        <p>
          Every field marked <em>(supports Markdown)</em> (descriptions,
          summaries, quest hooks and notes, backstories, prep notes, wardails)
          is shown formatted. Obsidian-style callouts work just like in the
          vault:
        </p>
        <Code>{CALLOUT_EXAMPLE}</Code>
        <Callout kind="note" title="Note">
          An informative note.
        </Callout>
        <Callout kind="warning" title="Custom title">
          Something worth not forgetting.
        </Callout>
        <Callout kind="tip" title="Tip">
          <code>TIP</code> and <code>QUOTE</code> exist too.
        </Callout>
      </>
    ),
  },
  {
    id: "wardails",
    title: "Wardails",
    body: (
      <>
        <p>
          <strong>Wardails</strong> are the campaign's sensitive topics (for
          example violence, grief, abuse…): a free-form Markdown text you define
          once per campaign.
        </p>
        <ul>
          <li>
            <strong>Where:</strong> in the sidebar, below <em>Encounters</em>,
            with the pink cross.
          </li>
          <li>
            <strong>Edit:</strong> <em>Edit</em> button, write and <em>Save</em>
            . Use <code>&gt; [!WARNING]</code> to highlight the most delicate
            ones.
          </li>
          <li>
            <strong>When they show:</strong> when marking a session as played,
            below the recap, so you keep them in mind at the table.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "encounters",
    title: "Encounters",
    body: (
      <>
        <p>
          A combat tracker built for the DM, with no map. Each encounter has
          rounds (<em>+1 round</em>) and is opened and closed with{" "}
          <em>Start combat</em> / <em>Close combat</em>.
        </p>
        <ul>
          <li>
            <strong>Participants:</strong> a character, an NPC or a{" "}
            <em>generic enemy</em> (e.g. “Bandit 3”), which carries its own
            sheet.
          </li>
          <li>
            <strong>Order:</strong> <em>fast</em> and <em>slow</em> turns
            (Cosmere RPG) or numeric initiative (D&amp;D).
          </li>
          <li>
            <strong>Health:</strong> characters' is stored on their sheet and
            synced from the tracker.
          </li>
          <li>
            <strong>Full sheet:</strong> each participant's attributes and
            skills, without leaving the encounter.
          </li>
        </ul>
      </>
    ),
  },
];

export const helpContent: Record<Lang, HelpSection[]> = { es, en };
