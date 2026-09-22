import type { ReactNode } from "react";
import { Callout, Code } from "../components/HelpBlocks";
import type { Lang } from "../lib/i18n";

export interface HelpSection {
  id: string;
  title: string;
  body: ReactNode;
}

const CALLOUT_EXAMPLE = `> [!NOTE]
> Una nota informativa.

> [!WARNING] Título propio
> Algo que no hay que olvidar.`;

const es: HelpSection[] = [
  {
    id: "empezar",
    title: "Primeros pasos",
    body: (
      <>
        <p>
          En la pantalla inicial elegí <em>Nueva campaña</em> (te pide la clave
          de admin de la instalación). Después, en el botón de ajustes del
          sidebar, poné un <strong>código de acceso</strong>: con ese código
          entrás a la campaña desde el selector.
        </p>
      </>
    ),
  },
  {
    id: "secciones",
    title: "Qué hay en cada sección",
    body: (
      <ul>
        <li><strong>Resumen:</strong> el arco actual, la última sesión, las quests activas y los NPCs recientes.</li>
        <li><strong>Arcos y Sesiones:</strong> la historia de la campaña, ordenada en una línea de tiempo.</li>
        <li><strong>NPCs, Jugadores, Locaciones y Facciones:</strong> tu elenco y tu mundo, con sus fichas y relaciones.</li>
        <li><strong>Quests:</strong> las misiones, con estado y prioridad.</li>
        <li><strong>Encuentros:</strong> un tracker de combate por rondas, con personajes, NPCs y enemigos genéricos.</li>
        <li><strong>Wardails:</strong> los temas sensibles de la campaña (más abajo).</li>
      </ul>
    ),
  },
  {
    id: "sesion",
    title: "Una sesión, paso a paso",
    body: (
      <ol>
        <li>
          <strong>Planificala:</strong> elegí una fecha tentativa, escribí las
          notas de preparación y marcá los NPCs y las quests que esperás usar.
        </li>
        <li>
          <strong>Jugala:</strong> abrila y tocá <em>Marcar como jugada</em>.
          Anotás la fecha real y un resumen; tus notas de preparación se
          conservan. Debajo del resumen ves los wardails para tenerlos
          presentes.
        </li>
      </ol>
    ),
  },
  {
    id: "wardails",
    title: "Wardails",
    body: (
      <p>
        Son los temas sensibles que quieren cuidar en la mesa (violencia, duelo,
        abuso…). Los escribís una vez por campaña en la sección{" "}
        <em>Wardails</em> del sidebar, con el botón <em>Editar</em>.
      </p>
    ),
  },
  {
    id: "formato",
    title: "Formato y avisos",
    body: (
      <>
        <p>
          Los campos que dicen <em>(admite Markdown)</em> aceptan texto con
          formato. Para destacar algo, usá un aviso al estilo Obsidian:
        </p>
        <Code>{CALLOUT_EXAMPLE}</Code>
        <Callout kind="note" title="Nota">
          Una nota informativa.
        </Callout>
        <Callout kind="warning" title="Título propio">
          Algo que no hay que olvidar.
        </Callout>
      </>
    ),
  },
  {
    id: "tipos-de-npc",
    title: "Tipos de NPC",
    body: (
      <p>
        Cada campaña tiene sus propios tipos (Humano, Spren, Monstruo…). Tocá{" "}
        <strong>Tipos</strong> en la lista de NPCs o en el editor para agregar,
        renombrar, cambiar el color o borrar. Un tipo que algún NPC usa no se
        puede borrar.
      </p>
    ),
  },
  {
    id: "obsidian",
    title: "Si usás Obsidian",
    body: (
      <>
        <p>
          Podés apuntar la campaña a tu vault y traer tus notas con{" "}
          <strong>Reindexar vault</strong>, en el Resumen. La app solo lee: no
          modifica tus notas. Cada nota se convierte según su carpeta y el
          nombre del archivo es el nombre de la entidad:
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
            <tr><td><code>Jugadores/</code></td><td>Personajes</td></tr>
            <tr><td><code>Arcos/</code></td><td>Arcos</td></tr>
          </tbody>
        </table>
        <p>
          Desde cada ficha podés <em>Abrir en Obsidian</em> o ver la nota
          completa con <em>Ver nota renderizada</em>. Si en un NPC escribís{" "}
          <code>tipo:</code> con un tipo nuevo, se crea solo.
        </p>
      </>
    ),
  },
];

const enCalloutExample = `> [!NOTE]
> An informative note.

> [!WARNING] Custom title
> Something not to forget.`;

const en: HelpSection[] = [
  {
    id: "start",
    title: "Getting started",
    body: (
      <p>
        On the first screen pick <em>New campaign</em> (it asks for the
        installation's admin key). Then, in the sidebar's settings button, set
        an <strong>access code</strong>: that code is how you enter the campaign
        from the selector.
      </p>
    ),
  },
  {
    id: "sections",
    title: "What each section is for",
    body: (
      <ul>
        <li><strong>Overview:</strong> the current arc, the last session, active quests and recent NPCs.</li>
        <li><strong>Arcs and Sessions:</strong> the campaign's story, laid out on a timeline.</li>
        <li><strong>NPCs, Players, Locations and Factions:</strong> your cast and your world, with their sheets and relations.</li>
        <li><strong>Quests:</strong> the missions, with status and priority.</li>
        <li><strong>Encounters:</strong> a round-by-round combat tracker, with characters, NPCs and generic enemies.</li>
        <li><strong>Wardails:</strong> the campaign's sensitive topics (below).</li>
      </ul>
    ),
  },
  {
    id: "session",
    title: "A session, step by step",
    body: (
      <ol>
        <li>
          <strong>Plan it:</strong> pick a tentative date, write the prep notes
          and tick the NPCs and quests you expect to use.
        </li>
        <li>
          <strong>Play it:</strong> open it and press <em>Mark as played</em>.
          You add the real date and a recap; your prep notes are kept. Below the
          recap you see the wardails, to keep them in mind.
        </li>
      </ol>
    ),
  },
  {
    id: "wardails",
    title: "Wardails",
    body: (
      <p>
        These are the sensitive topics you want to be careful with at the table
        (violence, grief, abuse…). You write them once per campaign in the{" "}
        <em>Wardails</em> section of the sidebar, with the <em>Edit</em> button.
      </p>
    ),
  },
  {
    id: "formatting",
    title: "Formatting and notices",
    body: (
      <>
        <p>
          Fields that say <em>(supports Markdown)</em> accept formatted text. To
          highlight something, use an Obsidian-style notice:
        </p>
        <Code>{enCalloutExample}</Code>
        <Callout kind="note" title="Note">
          An informative note.
        </Callout>
        <Callout kind="warning" title="Custom title">
          Something not to forget.
        </Callout>
      </>
    ),
  },
  {
    id: "npc-types",
    title: "NPC types",
    body: (
      <p>
        Each campaign has its own types (Human, Spren, Monster…). Press{" "}
        <strong>Types</strong> on the NPC list or in the editor to add, rename,
        recolor or delete. A type that any NPC uses can't be deleted.
      </p>
    ),
  },
  {
    id: "obsidian",
    title: "If you use Obsidian",
    body: (
      <>
        <p>
          You can point the campaign at your vault and bring in your notes with{" "}
          <strong>Reindex vault</strong>, on the Overview. The app only reads: it
          never changes your notes. Each note becomes something according to its
          folder, and the file name is the entity's name:
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
            <tr><td><code>Jugadores/</code></td><td>Characters</td></tr>
            <tr><td><code>Arcos/</code></td><td>Arcs</td></tr>
          </tbody>
        </table>
        <p>
          From each sheet you can <em>Open in Obsidian</em> or see the full note
          with <em>View rendered note</em>. If an NPC's <code>tipo:</code> is a
          new type, it is created on its own.
        </p>
      </>
    ),
  },
];

export const helpContent: Record<Lang, HelpSection[]> = { es, en };
