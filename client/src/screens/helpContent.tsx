import type { ReactNode } from "react";
import {
  Author,
  Callout,
  CalloutTypes,
  Code,
  ForMode,
} from "../components/HelpBlocks";
import type { AppMode } from "../lib/appMode";
import { MarkdownText } from "../components/MarkdownText";
import type { Lang } from "../lib/i18n";

export interface HelpSection {
  id: string;
  title: string;
  body: ReactNode;
  modes?: AppMode[];
}

export interface HelpPage {
  id: string;
  title: string;
  summary: string;
  sections: HelpSection[];
}

const ES_CALLOUT = `> [!NOTE]
> Una nota informativa.

> [!WARNING] Título propio
> Algo que no hay que olvidar.`;

const EN_CALLOUT = `> [!NOTE]
> An informative note.

> [!WARNING] Custom title
> Something not to forget.`;

const ES_TABLE = `| Época | Hecho |
| --- | --- |
| Año 0 | Se enciende el faro |
| Año 120 | Desaparece el primer farero |`;

const EN_TABLE = `| Era | Event |
| --- | --- |
| Year 0 | The lighthouse is lit |
| Year 120 | The first keeper vanishes |`;

const ES_MCP_WEB = `claude mcp add --scope user rolboard \\
  -e ROLBOARD_URL=https://mi-servidor \\
  -e ROLBOARD_CAMPAIGN=3 \\
  -e ROLBOARD_CODE_FILE=$HOME/.rolboard-codigo \\
  -- /ruta/a/rolboard-mcp`;

const EN_MCP_WEB = `claude mcp add --scope user rolboard \\
  -e ROLBOARD_URL=https://my-server \\
  -e ROLBOARD_CAMPAIGN=3 \\
  -e ROLBOARD_CODE_FILE=$HOME/.rolboard-code \\
  -- /path/to/rolboard-mcp`;

const es: HelpPage[] = [
  {
    id: "inicio",
    title: "Primeros pasos",
    summary: "Qué es Rolboard, cómo empezar y cómo se juega una sesión.",
    sections: [
      {
        id: "que-es",
        title: "Qué es Rolboard",
        body: (
          <>
            <p>
              Rolboard es un tablero para dirigir campañas de rol de mesa:
              sesiones, arcos, jugadores, NPCs, locaciones, facciones, quests y
              un tracker de combate, todo en un mismo lugar. Funciona en el
              navegador, como app de escritorio y en Android.
            </p>
            <p>
              Está pensado por y para la narrativa: no reemplaza a un VTT ni a
              una ficha de personaje, no trae reglas cargadas ni resuelve
              tiradas. El tracker de combate solo ordena los turnos y lleva la
              vida de cada uno.
            </p>
            <p>
              Es una herramienta para quien dirige. Nació para salir de Obsidian
              y manejar la campaña más rápido, pero convive con tu vault: lee
              sus notas y te deja volver a ellas desde cada ficha.
            </p>
            <Callout kind="note" title="Tu versión">
              <ForMode
                web={
                  <>
                    Estás usando la <strong>versión de servidor</strong>: la
                    campaña vive en un servidor y se entra desde el navegador
                    con un código de acceso.
                  </>
                }
                desktop={
                  <>
                    Estás usando la <strong>app de escritorio</strong>: todo
                    corre en tu computadora, sin servidor, sin cuenta y sin
                    internet.
                  </>
                }
                android={
                  <>
                    Estás usando la <strong>app de Android</strong>: todo corre
                    en tu teléfono o tablet, sin servidor, sin cuenta y sin
                    internet.
                  </>
                }
              />
            </Callout>
          </>
        ),
      },
      {
        id: "empezar",
        title: "Cómo empezar",
        body: (
          <>
            <ForMode
              web={
                <>
                  <p>
                    En la pantalla inicial elige <em>Nueva campaña</em> (te pide
                    la clave de admin de la instalación). Después, en el botón
                    de ajustes del sidebar, pon un{" "}
                    <strong>código de acceso</strong>: con ese código entras a
                    la campaña desde el selector (más en{" "}
                    <em>Acceso y seguridad</em>).
                  </p>
                </>
              }
              desktop={
                <>
                  <p>
                    En la pantalla inicial elige <em>Nueva campaña</em>. Todo
                    queda guardado en tu computadora y no hace falta clave ni
                    código de acceso.
                  </p>
                  <p>
                    Si usas Obsidian, mira la página <em>Obsidian</em>. Para
                    usar las mismas campañas en otro dispositivo, mira{" "}
                    <em>Tus datos</em>.
                  </p>
                </>
              }
              android={
                <>
                  <p>
                    En la pantalla inicial elige <em>Nueva campaña</em>. Todo
                    queda guardado en el teléfono y no hace falta clave ni
                    código de acceso.
                  </p>
                  <p>
                    Si usas Obsidian, mira la página <em>Obsidian</em>. Para
                    llevar las campañas a otro dispositivo, mira{" "}
                    <em>Tus datos</em>.
                  </p>
                </>
              }
            />
            <p>
              Después de crear la campaña, lo más corto es: cargar el primer
              arco, sumar a los jugadores y planificar la primera sesión. El
              resto se va llenando sobre la marcha.
            </p>
          </>
        ),
      },
      {
        id: "recorrido",
        title: "Recorrido por la pantalla",
        body: (
          <>
            <p>
              A la izquierda está el sidebar con todas las secciones. Arriba
              tiene la lupa de búsqueda, el botón para volver al selector de
              campañas y el acceso a esta ayuda (el ícono).{" "}
              <ForMode
                web="Abajo, los ajustes de la campaña, el idioma y, si entraste como admin, el botón para cerrar sesión."
                desktop="Abajo, los ajustes de la campaña y el idioma."
              />
            </p>
            <p>
              El <strong>Resumen</strong> es la portada de la campaña:
            </p>
            <ul>
              <li>
                El <strong>arco actual</strong>, con su progreso (subarcos
                cerrados o sesiones jugadas).
              </li>
              <li>
                La <strong>última sesión</strong> y cuánto hace que se jugó.
              </li>
              <li>
                Las <strong>quests activas</strong>, el <strong>grupo</strong>{" "}
                con su HP, las <strong>notas pendientes</strong>, el lore
                reciente y los oneshots.
              </li>
              <li>
                Los contadores de cada sección, que llevan a su lista al tocar.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "sesion",
        title: "Una sesión, paso a paso",
        body: (
          <ol>
            <li>
              <strong>Planifícala:</strong> desde el Resumen o desde{" "}
              <em>Sesiones</em>, elige una fecha tentativa, escribe las notas de
              preparación y marca los NPCs y las quests que esperas usar.
            </li>
            <li>
              <strong>Juégala:</strong> ábrela, toca <em>Jugar</em> y confirma
              con <em>Confirmar como jugada</em>. Anotas la fecha real y un
              resumen; tus notas de preparación se conservan. Debajo del resumen
              ves los temas sensibles para tenerlos presentes.
            </li>
            <li>
              <strong>Consúltala después:</strong> la sesión queda en la línea
              de tiempo de su arco y aparece en la ficha de cada NPC y quest que
              usaste.
            </li>
          </ol>
        ),
      },
    ],
  },
  {
    id: "campana",
    title: "La campaña",
    summary: "Qué guarda cada sección y para qué sirve.",
    sections: [
      {
        id: "arcos-sesiones",
        title: "Arcos y sesiones",
        body: (
          <>
            <p>
              Un <strong>arco</strong> agrupa sesiones y tiene estado
              (planificado, en curso o cerrado). Los subarcos comparten el
              número del arco y el Resumen los cuenta como progreso. Cerrar un
              arco no borra sus sesiones.
            </p>
            <p>
              <strong>Sesiones</strong> muestra cada arco con su línea de
              tiempo. La pestaña <em>Oneshots</em> reúne las aventuras sueltas,
              que no pertenecen a la cronología principal y llevan su propia
              numeración.
            </p>
          </>
        ),
      },
      {
        id: "elenco",
        title: "NPCs y jugadores",
        body: (
          <>
            <p>
              Los <strong>NPCs</strong> se ven como una galería de figuras, con
              filtros por tipo y estado (vivo, muerto, desaparecido, pausado).
              Cada ficha guarda descripción, locación, inventario, atributos y
              relaciones con otros NPCs.
            </p>
            <p>
              Los <strong>jugadores</strong> tienen ficha con HP, atributos y
              habilidades. El HP se mantiene sincronizado con el tracker de
              combate.
            </p>
            <Callout kind="tip" title="Aparece en">
              Al final de cada ficha ves en qué sesiones, quests y entradas de
              lore figura ese personaje.
            </Callout>
          </>
        ),
      },
      {
        id: "mundo",
        title: "Locaciones, facciones y mundo",
        body: (
          <ul>
            <li>
              <strong>Locaciones:</strong> forman un árbol (región, ciudad,
              sitio). Una locación puede tener una tienda con precios propios.
            </li>
            <li>
              <strong>Facciones:</strong> agrupan NPCs y personajes de
              jugadores, con su alineación, su líder y su descripción.
            </li>
            <li>
              <strong>Mundo:</strong> el <em>Lore</em> se ordena en categorías
              propias de la campaña y la <em>Línea de tiempo</em> admite varias
              líneas con fechas libres, como <code>Año 205</code>.
            </li>
          </ul>
        ),
      },
      {
        id: "misiones",
        title: "Quests",
        body: (
          <p>
            Cada quest tiene gancho narrativo, notas privadas del DM, estado
            (activa, en pausa, completada o fallida) y prioridad de P1 a P3. La
            lista las agrupa por estado y puedes vincularles NPCs con un rol.
          </p>
        ),
      },
      {
        id: "objetos",
        title: "Objetos y monedas",
        body: (
          <>
            <p>
              El catálogo guarda categoría, rareza, peso y efecto de cada
              objeto. Un objeto puede tener precio en varias monedas, y una de
              ellas es la <strong>base</strong>: las demás se expresan en su
              valor.
            </p>
            <p>
              Los inventarios de NPCs y jugadores y las tiendas de las
              locaciones usan ese mismo catálogo. Si una tienda no define un
              precio, rige el del catálogo.
            </p>
          </>
        ),
      },
      {
        id: "secretos",
        title: "Secretos",
        body: (
          <p>
            Un secreto está <strong>oculto</strong> o <strong>revelado</strong>,
            apunta a un NPC, una locación o una entrada de lore, y registra qué
            NPCs lo conocen.
          </p>
        ),
      },
      {
        id: "notas",
        title: "Notas sueltas",
        body: (
          <p>
            Para ideas que aparecen a mitad de partida. Marca una nota como{" "}
            <em>Pendiente de ubicar</em> para que no se pierda: el filtro del
            mismo nombre las reúne y el Resumen cuenta cuántas hay. Cuando la
            pases a su lugar, toca <em>Marcar como ubicada</em>.
          </p>
        ),
      },
      {
        id: "tipos-de-npc",
        title: "Tipos de NPC y categorías de lore",
        body: (
          <p>
            Cada campaña tiene sus propios tipos de NPC (Humano, Spren,
            Monstruo…) y sus categorías de lore. Toca <strong>Tipos</strong> o{" "}
            <strong>Categorías</strong> en la lista correspondiente para
            agregar, renombrar, cambiar el color o borrar. Uno que alguna ficha
            usa no se puede borrar.
          </p>
        ),
      },
      {
        id: "wardails",
        title: "Temas sensibles",
        body: (
          <p>
            Son los temas que quieren cuidar en la mesa (violencia, duelo,
            abuso…). Los escribes una vez por campaña en la sección{" "}
            <em>Temas sensibles</em> del sidebar, con el botón <em>Editar</em>,
            y se muestran en cada sesión jugada para tenerlos presentes.
          </p>
        ),
      },
      {
        id: "papelera",
        title: "Papelera",
        body: (
          <p>
            Lo que das de baja no se borra para siempre: va a la{" "}
            <strong>Papelera</strong> del sidebar, agrupado por tipo, con un
            botón <strong>Restaurar</strong>. Un arco con sesiones, una locación
            con NPCs o sub-locaciones y un NPC que es el spren de un personaje
            no se pueden borrar hasta mover lo que depende de ellos. Para
            restaurar una sesión, su número tiene que estar libre y su arco no
            puede estar borrado.
          </p>
        ),
      },
    ],
  },
  {
    id: "combate",
    title: "Combate",
    summary: "Cómo se arma y se conduce un encuentro.",
    sections: [
      {
        id: "tracker",
        title: "El tracker, paso a paso",
        body: (
          <>
            <ol>
              <li>
                <strong>Crea el encuentro</strong> con un nombre y, si quieres,
                la sesión a la que pertenece.
              </li>
              <li>
                <strong>Suma combatientes:</strong> personajes, NPCs o enemigos
                genéricos, con su HP e iniciativa.
              </li>
              <li>
                <strong>Asigna la fase</strong> de cada uno, <em>rápido</em> o{" "}
                <em>lento</em>. El tablero los separa en jugadores y NPCs, y los
                ordena por iniciativa.
              </li>
              <li>
                <strong>Inicia el combate.</strong> El borde violeta y el rombo
                marcan a quién le toca; tilda el círculo cuando actuó.
              </li>
              <li>
                <strong>Aplica daño o curación</strong> escribiendo un valor y
                usando los botones <code>−</code> y <code>+</code>. La barra
                cambia de color y, con HP 0 o menos, la ficha queda como caída.
              </li>
              <li>
                Avanza con <strong>+1 ronda</strong> y cierra con{" "}
                <strong>Cerrar combate</strong> cuando termina. Un combate
                cerrado se puede reabrir.
              </li>
            </ol>
            <Callout kind="note" title="Fichas">
              Con <em>Ver ficha</em> abres la hoja completa del personaje o NPC
              sin salir del encuentro. En los enemigos genéricos puedes anotar
              atributos y habilidades en el momento.
            </Callout>
          </>
        ),
      },
      {
        id: "combate-consejos",
        title: "Consejos",
        body: (
          <ul>
            <li>
              El HP de un personaje o NPC enlazado se sincroniza con su ficha:
              lo que pierde en el combate lo ves después en su página.
            </li>
            <li>
              Los combatientes sin fase quedan arriba, en su propia lista, hasta
              que los asignes.
            </li>
            <li>
              Un encuentro planificado sirve para dejar todo armado antes de la
              sesión.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "herramientas",
    title: "Herramientas",
    summary: "Búsqueda, imágenes y formato de texto.",
    sections: [
      {
        id: "buscar",
        title: "Búsqueda y atajos",
        body: (
          <>
            <p>
              La lupa del sidebar abre la búsqueda en toda la campaña: NPCs,
              jugadores, locaciones, facciones, arcos, quests, sesiones,
              encuentros, lore, secretos, notas, objetos, monedas y eventos de
              la línea de tiempo. Desde cualquier pantalla también la abres con{" "}
              <kbd>Ctrl</kbd> + <kbd>K</kbd>.
            </p>
            <p>
              Escribe, muévete entre los resultados con las flechas y confirma
              con <kbd>Enter</kbd> para ir directo a la ficha.
            </p>
          </>
        ),
      },
      {
        id: "imagenes",
        title: "Imágenes",
        body: (
          <>
            <p>
              NPCs, jugadores, locaciones, facciones, objetos, arcos, lore y
              quests admiten una imagen. Súbela desde el editor con{" "}
              <em>Subir imagen</em>: en un alta se guarda al crear la entidad.
            </p>
            <ul>
              <li>Formatos PNG y JPEG, hasta 5 MiB.</li>
              <li>Las muy grandes se reducen a 1600 px antes de subir.</li>
              <li>
                Sin imagen se muestran las iniciales con el color del tipo.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "markdown",
        title: "Markdown en cinco minutos",
        body: (
          <>
            <p>
              Markdown es texto con unos pocos símbolos que le dan formato. Esta
              es la referencia rápida de lo que más vas a usar:
            </p>
            <table>
              <thead>
                <tr>
                  <th>Escribes</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>## Título</code>
                  </td>
                  <td>
                    <strong>Un encabezado</strong> (más <code>#</code>, más
                    chico)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>**texto**</code>
                  </td>
                  <td>
                    <strong>negrita</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>*texto*</code>
                  </td>
                  <td>
                    <em>cursiva</em>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>- elemento</code>
                  </td>
                  <td>lista con viñetas</td>
                </tr>
                <tr>
                  <td>
                    <code>1. paso</code>
                  </td>
                  <td>lista numerada</td>
                </tr>
                <tr>
                  <td>
                    <code>[texto](https://…)</code>
                  </td>
                  <td>un enlace</td>
                </tr>
                <tr>
                  <td>
                    <code>&gt; cita</code>
                  </td>
                  <td>un bloque de cita</td>
                </tr>
                <tr>
                  <td>
                    <code>`código`</code>
                  </td>
                  <td>
                    <code>texto en monoespaciado</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>---</code>
                  </td>
                  <td>una línea separadora</td>
                </tr>
              </tbody>
            </table>
            <p>
              Deja una línea en blanco entre párrafos. Más abajo están los
              avisos y las tablas.
            </p>
          </>
        ),
      },
      {
        id: "formato",
        title: "Avisos",
        body: (
          <>
            <p>
              Los campos que dicen <em>(admite Markdown)</em> aceptan texto con
              formato. Para destacar algo, usa un aviso al estilo Obsidian:
            </p>
            <Code>{ES_CALLOUT}</Code>
            <Callout kind="note" title="Nota">
              Una nota informativa.
            </Callout>
            <Callout kind="warning" title="Título propio">
              Algo que no hay que olvidar.
            </Callout>
            <p>
              Tipos disponibles (los mismos de Obsidian, sin distinguir
              mayúsculas):
            </p>
            <CalloutTypes aliasLabel="alias" />
          </>
        ),
      },
      {
        id: "tablas",
        title: "Tablas",
        body: (
          <>
            <p>
              Los campos con Markdown aceptan tablas. La segunda fila separa el
              encabezado del cuerpo:
            </p>
            <Code>{ES_TABLE}</Code>
            <p>Se ve así:</p>
            <MarkdownText text={ES_TABLE} />
          </>
        ),
      },
    ],
  },
  {
    id: "obsidian",
    title: "Obsidian",
    summary: "Cómo traer las notas de tu vault.",
    sections: [
      {
        id: "obsidian",
        title: "Si usas Obsidian",
        body: (
          <>
            <p>
              Puedes apuntar la campaña a tu vault y traer tus notas con{" "}
              <strong>Reindexar vault</strong>, en el Resumen. La app solo lee:
              no modifica tus notas. Cada nota se convierte según su carpeta y
              el nombre del archivo es el nombre de la entidad:
            </p>
            <ForMode
              web={
                <p>
                  La carpeta del vault se elige en los ajustes de la campaña,
                  entre las subcarpetas que el servidor tiene montadas (en solo
                  lectura).
                </p>
              }
              desktop={
                <p>
                  Primero elige la carpeta donde están tus vaults en{" "}
                  <em>Ajustes de la app</em> (el engranaje de la pantalla de
                  campañas). Después, cada campaña elige su vault entre las
                  subcarpetas de esa carpeta.
                </p>
              }
              android={
                <p>
                  Primero elige la carpeta donde están tus vaults en{" "}
                  <em>Ajustes de la app</em>. Android pide el permiso{" "}
                  <em>Acceso a todos los archivos</em> la primera vez; después
                  de concederlo, vuelve a elegir la carpeta. Si tu vault ya se
                  sincroniza con el teléfono, Rolboard lo ve actualizado.
                </p>
              }
            />
            <table>
              <thead>
                <tr>
                  <th>Carpeta</th>
                  <th>Se convierte en</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>NPC/</code>
                  </td>
                  <td>NPCs</td>
                </tr>
                <tr>
                  <td>
                    <code>Locaciones/</code>
                  </td>
                  <td>Locaciones</td>
                </tr>
                <tr>
                  <td>
                    <code>Grupos/</code>
                  </td>
                  <td>Facciones</td>
                </tr>
                <tr>
                  <td>
                    <code>Sesiones/</code>
                  </td>
                  <td>Sesiones</td>
                </tr>
                <tr>
                  <td>
                    <code>Jugadores/</code>
                  </td>
                  <td>Personajes</td>
                </tr>
                <tr>
                  <td>
                    <code>Arcos/</code>
                  </td>
                  <td>Arcos</td>
                </tr>
              </tbody>
            </table>
            <p>
              Desde cada ficha puedes{" "}
              <ForMode
                web={
                  <>
                    <em>Abrir en Obsidian</em> o{" "}
                  </>
                }
                desktop={null}
              />
              ver la nota completa con <em>Ver nota renderizada</em>. Si en un
              NPC escribes <code>tipo:</code> con un tipo nuevo, se crea solo.
            </p>
          </>
        ),
      },
      {
        id: "reindexar",
        title: "Qué pasa al reindexar",
        body: (
          <ul>
            <li>
              Las notas nuevas crean entidades y las modificadas las actualizan.
              Si una nota no cambió, no se vuelve a leer, así que lo que
              editaste en el tablero no se pisa.
            </li>
            <li>
              Los <code>[[enlaces]]</code> entre notas se resuelven como
              relaciones: la locación de un NPC, sus facciones, el líder de una
              facción.
            </li>
            <li>
              Si borras una nota del vault, la entidad pasa a la papelera en el
              próximo reindexado.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "datos",
    title: "Tus datos",
    summary: "Dónde se guarda todo y cómo hacer copias.",
    sections: [
      {
        id: "donde",
        title: "Dónde se guardan",
        body: (
          <ForMode
            web={
              <>
                <p>
                  Todo vive en el servidor: una base SQLite (<code>.db</code>) y
                  una carpeta <code>uploads/</code> con las imágenes. Tu vault
                  de Obsidian se monta aparte y solo en lectura.
                </p>
                <p>
                  Para hacer una copia, resguarda el archivo de la base y la
                  carpeta de imágenes.
                </p>
              </>
            }
            desktop={
              <>
                <p>
                  Todo queda en tu computadora, en la carpeta de datos de la
                  app: <code>config.json</code>, <code>rolboard.db</code> y{" "}
                  <code>uploads/</code>. En Linux es{" "}
                  <code>~/.config/rolboard</code> y en Windows{" "}
                  <code>%AppData%\rolboard</code>.
                </p>
                <p>
                  Para hacer una copia, resguarda el <code>.db</code> y la
                  carpeta de imágenes. Para pasar una instalación de servidor,
                  copia su base y su carpeta de imágenes acá.
                </p>
              </>
            }
            android={
              <>
                <p>
                  Todo queda en el almacenamiento privado de la app, dentro del
                  teléfono. Android no deja ver esa carpeta desde afuera.
                </p>
                <p>
                  La forma de tener una copia es la{" "}
                  <strong>carpeta de sincronización</strong>: mientras esté
                  configurada, las campañas quedan guardadas ahí.
                </p>
              </>
            }
          />
        ),
      },
      {
        id: "exportar",
        title: "Exportar la campaña",
        body: (
          <p>
            En los ajustes de la campaña, <em>Exportar campaña</em> guarda todas
            las entidades como notas Markdown, con la estructura que lee el
            indexer, y sus imágenes en <code>Imagenes/</code>. No incluye lo que
            está en la papelera.
          </p>
        ),
      },
      {
        id: "acceso",
        title: "Acceso y seguridad",
        modes: ["web"],
        body: (
          <>
            <p>
              Hay dos niveles. La <strong>clave de admin</strong> de la
              instalación crea y administra campañas. El{" "}
              <strong>código de acceso</strong> de cada campaña es el que usas
              para entrar a ella desde el selector.
            </p>
            <p>
              Quien conozca el código ve y edita la campaña entera, así que
              guárdalo como una contraseña.
            </p>
          </>
        ),
      },
      {
        id: "sync",
        title: "Sincronizar dispositivos",
        modes: ["desktop", "android"],
        body: (
          <>
            <p>
              Elige una <em>Carpeta de sincronización</em> en{" "}
              <em>Ajustes de la app</em> en cada dispositivo y mantenla
              sincronizada con la herramienta que prefieras (Syncthing, una nube
              o a mano). La app deja ahí una copia de las campañas y la recupera
              al volver a abrirse.
            </p>
            <Callout kind="warning" title="Un dispositivo por vez">
              No está pensado para editar en dos dispositivos a la vez: gana la
              última copia guardada.
            </Callout>
          </>
        ),
      },
      {
        id: "actualizar",
        title: "Actualizaciones",
        body: (
          <ForMode
            web={
              <p>
                Para actualizar, descarga las imágenes nuevas y reinicia los
                contenedores. La base y las imágenes viven en un volumen, así
                que se conservan.
              </p>
            }
            desktop={
              <p>
                El selector de campañas te avisa cuando hay una versión nueva.
                Descarga el instalador o el AppImage más reciente y úsalo en
                lugar del anterior: tus campañas se conservan.
              </p>
            }
            android={
              <p>
                El selector de campañas te avisa cuando hay una versión nueva.
                Descarga el APK más reciente e instálalo encima del anterior:
                tus campañas se conservan.
              </p>
            }
          />
        ),
      },
    ],
  },
  {
    id: "agentes",
    title: "Agentes de IA",
    summary: "Conecta Claude, OpenCode, Codex o Antigravity a tu campaña.",
    sections: [
      {
        id: "agentes-que-es",
        title: "Qué permite",
        modes: ["web", "desktop"],
        body: (
          <>
            <p>
              Rolboard puede hablar con asistentes de IA que soportan MCP:
              Claude (Desktop y Code), OpenCode, Codex y Antigravity. Con eso
              les puedes pedir que busquen en tu campaña, resuman una sesión o
              te ayuden a preparar la siguiente.
            </p>
            <p>
              Leen casi todo, secretos incluidos. Escriben poco: crean notas
              sueltas, NPCs, quests y entradas de lore, y editan la preparación
              de una sesión. No borran nada.
            </p>
            <Callout
              kind="warning"
              title="Lo que el asistente ve, lo ve su proveedor"
            >
              Lo que el asistente lee de tu campaña viaja al servicio de IA que
              uses. Si no quieres que un secreto salga de tu máquina, no
              conectes ese cliente.
            </Callout>
          </>
        ),
      },
      {
        id: "agentes-escritorio",
        title: "Desde la app de escritorio",
        modes: ["desktop"],
        body: (
          <>
            <ol>
              <li>
                Abre <em>Ajustes de la app</em> y busca la sección{" "}
                <em>Agentes de IA</em>.
              </li>
              <li>
                Activa <em>Permitir que agentes de IA se conecten</em>.
              </li>
              <li>
                Pulsa <em>Conectar</em> en el cliente que uses; los que no
                tienes figuran como <em>No instalado</em>.
              </li>
              <li>Reinicia el cliente para que lea la configuración nueva.</li>
            </ol>
            <p>
              La app tiene que estar abierta mientras el asistente trabaja: la
              conexión pasa por un socket local de tu usuario, sin red y sin
              claves.
            </p>
            <Callout
              kind="warning"
              title="Cierra Claude Code antes de conectar"
            >
              Claude Code reescribe su archivo de configuración mientras corre,
              y podría pisar el cambio. Si tu configuración de OpenCode tiene
              comentarios, la app no la toca y te lo avisa.
            </Callout>
            <p>
              Si mueves o actualizas la app y cambia su ubicación, pulsa{" "}
              <em>Reconectar</em>.
            </p>
          </>
        ),
      },
      {
        id: "agentes-web",
        title: "Desde un servidor (web)",
        modes: ["web"],
        body: (
          <>
            <p>
              El asistente corre en tu computadora y se conecta al servidor con
              un programa chico, <code>rolboard-mcp</code>. Descárgalo de la
              página de <em>Releases</em> del repositorio en GitHub y
              necesitarás tres datos:
            </p>
            <ul>
              <li>
                <code>ROLBOARD_URL</code>: la dirección del servidor, la misma
                que usas en el navegador.
              </li>
              <li>
                <code>ROLBOARD_CAMPAIGN</code>: el número de la campaña. Es el
                que aparece en la dirección tras <code>/c/</code>.
              </li>
              <li>
                <code>ROLBOARD_CODE_FILE</code>: un archivo de texto con el
                código de acceso de esa campaña, y nada más.
              </li>
            </ul>
            <p>Ejemplo con Claude Code:</p>
            <Code>{ES_MCP_WEB}</Code>
            <p>
              Cada campaña tiene su propio código, así que una conexión da
              acceso a una sola campaña. Para otra, repite el comando con su
              número y su archivo.
            </p>
            <Callout kind="warning" title="Protege el archivo del código">
              Quien lo lea puede entrar a la campaña. Déjalo solo para tu
              usuario (<code>chmod 600</code>).
            </Callout>
          </>
        ),
      },
    ],
  },
  {
    id: "acerca",
    title: "Acerca de",
    summary: "Autoría y licencia.",
    sections: [
      {
        id: "creditos",
        title: "Créditos y licencia",
        body: (
          <>
            <p>
              Desarrollado por <Author />. Logos e íconos diseñados por{" "}
              <strong>Mateo Guareschi</strong>.
            </p>
            <p>
              Rolboard es software de código abierto distribuido bajo la
              licencia MIT. Los logos e íconos no están incluidos en esa
              licencia: son propiedad de su autor y se usan con su permiso.
            </p>
          </>
        ),
      },
    ],
  },
];

const en: HelpPage[] = [
  {
    id: "start",
    title: "Getting started",
    summary: "What Rolboard is, how to begin and how a session plays out.",
    sections: [
      {
        id: "what-is",
        title: "What Rolboard is",
        body: (
          <>
            <p>
              Rolboard is a dashboard for running tabletop RPG campaigns:
              sessions, arcs, players, NPCs, locations, factions, quests and a
              combat tracker, all in one place. It runs in the browser, as a
              desktop app and on Android.
            </p>
            <p>
              It's built by and for the narrative: it doesn't replace a VTT or a
              character sheet, ships no rules and doesn't resolve rolls. The
              combat tracker only orders turns and keeps everyone's HP.
            </p>
            <p>
              It's a tool for whoever runs the game. It started as a way out of
              Obsidian to manage the campaign faster, but it lives alongside
              your vault: it reads its notes and lets you jump back to them from
              each sheet.
            </p>
            <Callout kind="note" title="Your version">
              <ForMode
                web={
                  <>
                    You're using the <strong>server version</strong>: the
                    campaign lives on a server and you get in from the browser
                    with an access code.
                  </>
                }
                desktop={
                  <>
                    You're using the <strong>desktop app</strong>: everything
                    runs on your computer, with no server, no account and no
                    internet.
                  </>
                }
                android={
                  <>
                    You're using the <strong>Android app</strong>: everything
                    runs on your phone or tablet, with no server, no account and
                    no internet.
                  </>
                }
              />
            </Callout>
          </>
        ),
      },
      {
        id: "start",
        title: "How to begin",
        body: (
          <>
            <ForMode
              web={
                <>
                  <p>
                    On the first screen pick <em>New campaign</em> (it asks for
                    the installation's admin key). Then, in the sidebar's
                    settings button, set an <strong>access code</strong>: that
                    code is how you enter the campaign from the selector (more
                    in <em>Access and security</em>).
                  </p>
                </>
              }
              desktop={
                <>
                  <p>
                    On the first screen pick <em>New campaign</em>. Everything
                    is saved on your computer and no key or access code is
                    needed.
                  </p>
                  <p>
                    If you use Obsidian, see the <em>Obsidian</em> page. To use
                    the same campaigns on another device, see <em>Your data</em>
                    .
                  </p>
                </>
              }
              android={
                <>
                  <p>
                    On the first screen pick <em>New campaign</em>. Everything
                    is saved on the phone and no key or access code is needed.
                  </p>
                  <p>
                    If you use Obsidian, see the <em>Obsidian</em> page. To take
                    the campaigns to another device, see <em>Your data</em>.
                  </p>
                </>
              }
            />
            <p>
              Once the campaign exists, the shortest path is: add the first arc,
              add the players and plan the first session. The rest fills in as
              you go.
            </p>
          </>
        ),
      },
      {
        id: "tour",
        title: "A tour of the screen",
        body: (
          <>
            <p>
              On the left is the sidebar with every section. At the top it has
              the search magnifier, the button back to the campaign selector and
              the entry to this help (the icon).{" "}
              <ForMode
                web="At the bottom, the campaign settings, the language and, if you signed in as admin, the sign-out button."
                desktop="At the bottom, the campaign settings and the language."
              />
            </p>
            <p>
              The <strong>Summary</strong> is the campaign's front page:
            </p>
            <ul>
              <li>
                The <strong>current arc</strong>, with its progress (closed
                sub-arcs or sessions played).
              </li>
              <li>
                The <strong>last session</strong> and how long ago it was
                played.
              </li>
              <li>
                Active <strong>quests</strong>, the <strong>party</strong> with
                its HP, <strong>pending notes</strong>, recent lore and
                oneshots.
              </li>
              <li>
                A counter per section, which takes you to its list when you tap
                it.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "session",
        title: "A session, step by step",
        body: (
          <ol>
            <li>
              <strong>Plan it:</strong> from the Summary or from{" "}
              <em>Sessions</em>, pick a tentative date, write the prep notes and
              tick the NPCs and quests you expect to use.
            </li>
            <li>
              <strong>Play it:</strong> open it, press <em>Play</em> and confirm
              with <em>Confirm as played</em>. You add the real date and a
              recap; your prep notes are kept. Below the recap you see the
              sensitive topics, to keep them in mind.
            </li>
            <li>
              <strong>Look it up later:</strong> the session stays on its arc's
              timeline and shows up on the sheet of every NPC and quest you
              used.
            </li>
          </ol>
        ),
      },
    ],
  },
  {
    id: "campaign",
    title: "The campaign",
    summary: "What each section stores and what it's for.",
    sections: [
      {
        id: "arcs-sessions",
        title: "Arcs and sessions",
        body: (
          <>
            <p>
              An <strong>arc</strong> groups sessions and has a status (planned,
              in progress or closed). Sub-arcs share the arc's number and the
              Summary counts them as progress. Closing an arc doesn't delete its
              sessions.
            </p>
            <p>
              <strong>Sessions</strong> shows each arc on its own timeline. The{" "}
              <em>Oneshots</em> tab gathers standalone adventures that sit
              outside the main chronology and have their own numbering.
            </p>
          </>
        ),
      },
      {
        id: "cast",
        title: "NPCs and players",
        body: (
          <>
            <p>
              <strong>NPCs</strong> appear as a gallery of figures, with filters
              by type and status (alive, dead, missing, paused). Each sheet
              keeps a description, location, inventory, attributes and relations
              to other NPCs.
            </p>
            <p>
              <strong>Players</strong> have a sheet with HP, attributes and
              skills. HP stays in sync with the combat tracker.
            </p>
            <Callout kind="tip" title="Appears in">
              At the bottom of each sheet you see the sessions, quests and lore
              entries where that character shows up.
            </Callout>
          </>
        ),
      },
      {
        id: "world",
        title: "Locations, factions and world",
        body: (
          <ul>
            <li>
              <strong>Locations:</strong> they form a tree (region, city, site).
              A location can have a shop with its own prices.
            </li>
            <li>
              <strong>Factions:</strong> they group NPCs and player characters,
              with an alignment, a leader and a description.
            </li>
            <li>
              <strong>World:</strong> <em>Lore</em> is organised in per-campaign
              categories and the <em>Timeline</em> supports several lines with
              free-form dates such as <code>Year 205</code>.
            </li>
          </ul>
        ),
      },
      {
        id: "quests-guide",
        title: "Quests",
        body: (
          <p>
            Each quest has a narrative hook, private GM notes, a status (active,
            on hold, completed or failed) and a priority from P1 to P3. The list
            groups them by status and you can link NPCs to them with a role.
          </p>
        ),
      },
      {
        id: "items-guide",
        title: "Items and currencies",
        body: (
          <>
            <p>
              The catalog stores each item's category, rarity, weight and
              effect. An item can be priced in several currencies, and one of
              them is the <strong>base</strong>: the others are expressed
              against it.
            </p>
            <p>
              NPC and player inventories and location shops use that same
              catalog. If a shop doesn't set a price, the catalog price applies.
            </p>
          </>
        ),
      },
      {
        id: "secrets-guide",
        title: "Secrets",
        body: (
          <p>
            A secret is <strong>hidden</strong> or <strong>revealed</strong>,
            points to an NPC, a location or a lore entry, and records which NPCs
            know it.
          </p>
        ),
      },
      {
        id: "notes-guide",
        title: "Loose notes",
        body: (
          <p>
            For ideas that pop up mid-game. Mark a note <em>To be filed</em> so
            it doesn't get lost: the filter of the same name gathers them and
            the Summary counts how many there are. Once it has a home, press{" "}
            <em>Mark as filed</em>.
          </p>
        ),
      },
      {
        id: "npc-types",
        title: "NPC types and lore categories",
        body: (
          <p>
            Each campaign has its own NPC types (Human, Spren, Monster…) and its
            own lore categories. Tap <strong>Types</strong> or{" "}
            <strong>Categories</strong> in the matching list to add, rename,
            recolour or delete. One that a sheet uses can't be deleted.
          </p>
        ),
      },
      {
        id: "wardails",
        title: "Sensitive topics",
        body: (
          <p>
            These are the topics you want to be careful with at the table
            (violence, grief, abuse…). You write them once per campaign in the{" "}
            <em>Sensitive topics</em> section of the sidebar, with the{" "}
            <em>Edit</em> button, and they show on every played session to keep
            them in mind.
          </p>
        ),
      },
      {
        id: "trash",
        title: "Trash",
        body: (
          <p>
            What you deactivate isn't deleted for good: it goes to the sidebar's{" "}
            <strong>Trash</strong>, grouped by type, with a{" "}
            <strong>Restore</strong> button. An arc with sessions, a location
            with NPCs or sub-locations and an NPC that is a character's spren
            can't be deleted until what depends on them is moved. To restore a
            session, its number has to be free and its arc can't be deleted.
          </p>
        ),
      },
    ],
  },
  {
    id: "combat",
    title: "Combat",
    summary: "How an encounter is set up and run.",
    sections: [
      {
        id: "tracker",
        title: "The tracker, step by step",
        body: (
          <>
            <ol>
              <li>
                <strong>Create the encounter</strong> with a name and,
                optionally, the session it belongs to.
              </li>
              <li>
                <strong>Add combatants:</strong> characters, NPCs or generic
                enemies, with their HP and initiative.
              </li>
              <li>
                <strong>Assign each one's phase,</strong> <em>fast</em> or{" "}
                <em>slow</em>. The board splits them into players and NPCs and
                orders them by initiative.
              </li>
              <li>
                <strong>Start the combat.</strong> The violet border and the
                diamond mark whose turn it is; tick the circle once they've
                acted.
              </li>
              <li>
                <strong>Apply damage or healing</strong> by typing a value and
                using the <code>−</code> and <code>+</code> buttons. The bar
                changes colour and, at 0 HP or less, the card is marked as down.
              </li>
              <li>
                Move on with <strong>+1 round</strong> and finish with{" "}
                <strong>Close combat</strong> when it's over. A closed combat
                can be reopened.
              </li>
            </ol>
            <Callout kind="note" title="Sheets">
              With <em>View sheet</em> you open the character's or NPC's full
              sheet without leaving the encounter. For generic enemies you can
              jot down attributes and skills on the spot.
            </Callout>
          </>
        ),
      },
      {
        id: "combat-tips",
        title: "Tips",
        body: (
          <ul>
            <li>
              A linked character's or NPC's HP syncs with its sheet: what they
              lose in combat shows up later on their page.
            </li>
            <li>
              Combatants without a phase sit on top, in their own list, until
              you assign them.
            </li>
            <li>
              A planned encounter lets you set everything up before the session.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    summary: "Search, images and text formatting.",
    sections: [
      {
        id: "search",
        title: "Search and shortcuts",
        body: (
          <>
            <p>
              The magnifier in the sidebar opens a search across the whole
              campaign: NPCs, players, locations, factions, arcs, quests,
              sessions, encounters, lore, secrets, notes, items, currencies and
              timeline events. From any screen you can also open it with{" "}
              <kbd>Ctrl</kbd> + <kbd>K</kbd>.
            </p>
            <p>
              Type, move through the results with the arrow keys and press{" "}
              <kbd>Enter</kbd> to jump straight to the sheet.
            </p>
          </>
        ),
      },
      {
        id: "images",
        title: "Images",
        body: (
          <>
            <p>
              NPCs, players, locations, factions, items, arcs, lore and quests
              support one image. Upload it from the editor with{" "}
              <em>Upload image</em>: on a new entity it's saved when you create
              it.
            </p>
            <ul>
              <li>PNG and JPEG, up to 5 MiB.</li>
              <li>
                Very large ones are downscaled to 1600 px before uploading.
              </li>
              <li>
                Without an image you see the initials in the type's colour.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "markdown",
        title: "Markdown in five minutes",
        body: (
          <>
            <p>
              Markdown is plain text with a few symbols that give it formatting.
              Here is a quick reference for what you'll use most:
            </p>
            <table>
              <thead>
                <tr>
                  <th>You type</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>## Title</code>
                  </td>
                  <td>
                    <strong>A heading</strong> (more <code>#</code>, smaller)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>**text**</code>
                  </td>
                  <td>
                    <strong>bold</strong>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>*text*</code>
                  </td>
                  <td>
                    <em>italic</em>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>- item</code>
                  </td>
                  <td>bulleted list</td>
                </tr>
                <tr>
                  <td>
                    <code>1. step</code>
                  </td>
                  <td>numbered list</td>
                </tr>
                <tr>
                  <td>
                    <code>[text](https://…)</code>
                  </td>
                  <td>a link</td>
                </tr>
                <tr>
                  <td>
                    <code>&gt; quote</code>
                  </td>
                  <td>a quote block</td>
                </tr>
                <tr>
                  <td>
                    <code>`code`</code>
                  </td>
                  <td>
                    <code>monospaced text</code>
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>---</code>
                  </td>
                  <td>a divider line</td>
                </tr>
              </tbody>
            </table>
            <p>
              Leave a blank line between paragraphs. Notices and tables are
              covered below.
            </p>
          </>
        ),
      },
      {
        id: "formatting",
        title: "Notices",
        body: (
          <>
            <p>
              Fields that say <em>(supports Markdown)</em> accept formatted
              text. To highlight something, use an Obsidian-style notice:
            </p>
            <Code>{EN_CALLOUT}</Code>
            <Callout kind="note" title="Note">
              An informative note.
            </Callout>
            <Callout kind="warning" title="Custom title">
              Something not to forget.
            </Callout>
            <p>Available types (same as Obsidian, case-insensitive):</p>
            <CalloutTypes aliasLabel="aliases" />
          </>
        ),
      },
      {
        id: "tables",
        title: "Tables",
        body: (
          <>
            <p>
              Markdown fields accept tables. The second row separates the header
              from the body:
            </p>
            <Code>{EN_TABLE}</Code>
            <p>It looks like this:</p>
            <MarkdownText text={EN_TABLE} />
          </>
        ),
      },
    ],
  },
  {
    id: "obsidian",
    title: "Obsidian",
    summary: "How to bring in your vault's notes.",
    sections: [
      {
        id: "obsidian",
        title: "If you use Obsidian",
        body: (
          <>
            <p>
              You can point the campaign at your vault and bring in your notes
              with <strong>Reindex vault</strong>, on the Summary. The app only
              reads: it never modifies your notes. Each note is converted by its
              folder and the file name is the entity's name:
            </p>
            <ForMode
              web={
                <p>
                  The vault folder is picked in the campaign settings, among the
                  subfolders the server has mounted (read-only).
                </p>
              }
              desktop={
                <p>
                  First pick the folder where your vaults live in{" "}
                  <em>App settings</em> (the gear on the campaigns screen). Then
                  each campaign picks its vault among that folder's subfolders.
                </p>
              }
              android={
                <p>
                  First pick the folder where your vaults live in{" "}
                  <em>App settings</em>. Android asks for the{" "}
                  <em>All files access</em> permission the first time; after
                  granting it, pick the folder again. If your vault already
                  syncs to the phone, Rolboard sees it up to date.
                </p>
              }
            />
            <table>
              <thead>
                <tr>
                  <th>Folder</th>
                  <th>Becomes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>NPC/</code>
                  </td>
                  <td>NPCs</td>
                </tr>
                <tr>
                  <td>
                    <code>Locaciones/</code>
                  </td>
                  <td>Locations</td>
                </tr>
                <tr>
                  <td>
                    <code>Grupos/</code>
                  </td>
                  <td>Factions</td>
                </tr>
                <tr>
                  <td>
                    <code>Sesiones/</code>
                  </td>
                  <td>Sessions</td>
                </tr>
                <tr>
                  <td>
                    <code>Jugadores/</code>
                  </td>
                  <td>Characters</td>
                </tr>
                <tr>
                  <td>
                    <code>Arcos/</code>
                  </td>
                  <td>Arcs</td>
                </tr>
              </tbody>
            </table>
            <p>
              From each sheet you can{" "}
              <ForMode
                web={
                  <>
                    <em>Open in Obsidian</em> or{" "}
                  </>
                }
                desktop={null}
              />
              see the full note with <em>View rendered note</em>. If you write a
              new <code>tipo:</code> on an NPC, the type is created for you.
            </p>
          </>
        ),
      },
      {
        id: "reindex",
        title: "What happens when you reindex",
        body: (
          <ul>
            <li>
              New notes create entities and changed ones update them. A note
              that didn't change isn't read again, so what you edited on the
              board isn't overwritten.
            </li>
            <li>
              <code>[[Wikilinks]]</code> between notes are resolved as
              relations: an NPC's location, its factions, a faction's leader.
            </li>
            <li>
              If you delete a note from the vault, its entity goes to the trash
              on the next reindex.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "data",
    title: "Your data",
    summary: "Where everything is stored and how to back it up.",
    sections: [
      {
        id: "where",
        title: "Where it's stored",
        body: (
          <ForMode
            web={
              <>
                <p>
                  Everything lives on the server: a SQLite database (
                  <code>.db</code>) and an <code>uploads/</code> folder with the
                  images. Your Obsidian vault is mounted separately and
                  read-only.
                </p>
                <p>To back up, keep the database file and the images folder.</p>
              </>
            }
            desktop={
              <>
                <p>
                  Everything stays on your computer, in the app's data folder:{" "}
                  <code>config.json</code>, <code>rolboard.db</code> and{" "}
                  <code>uploads/</code>. On Linux it's{" "}
                  <code>~/.config/rolboard</code> and on Windows{" "}
                  <code>%AppData%\rolboard</code>.
                </p>
                <p>
                  To back up, keep the <code>.db</code> and the images folder.
                  To move over a server installation, copy its database and its
                  images folder here.
                </p>
              </>
            }
            android={
              <>
                <p>
                  Everything stays in the app's private storage, inside the
                  phone. Android doesn't let you browse that folder from
                  outside.
                </p>
                <p>
                  The way to have a copy is the <strong>sync folder</strong>:
                  while it's configured, the campaigns are saved there.
                </p>
              </>
            }
          />
        ),
      },
      {
        id: "export",
        title: "Exporting the campaign",
        body: (
          <p>
            In the campaign settings, <em>Export campaign</em> saves every
            entity as Markdown notes, with the structure the indexer reads, and
            their images in <code>Imagenes/</code>. It leaves out whatever is in
            the trash.
          </p>
        ),
      },
      {
        id: "access",
        title: "Access and security",
        modes: ["web"],
        body: (
          <>
            <p>
              There are two levels. The installation's{" "}
              <strong>admin key</strong> creates and manages campaigns. Each
              campaign's <strong>access code</strong> is what you use to enter
              it from the selector.
            </p>
            <p>
              Anyone who knows the code sees and edits the whole campaign, so
              keep it like a password.
            </p>
          </>
        ),
      },
      {
        id: "sync",
        title: "Syncing devices",
        modes: ["desktop", "android"],
        body: (
          <>
            <p>
              Pick a <em>Sync folder</em> in <em>App settings</em> on each
              device and keep it in sync with whatever tool you prefer
              (Syncthing, a cloud drive or by hand). The app leaves a copy of
              the campaigns there and picks it up when it opens again.
            </p>
            <Callout kind="warning" title="One device at a time">
              It's not meant for editing on two devices at once: the last saved
              copy wins.
            </Callout>
          </>
        ),
      },
      {
        id: "updates",
        title: "Updates",
        body: (
          <ForMode
            web={
              <p>
                To update, pull the new images and restart the containers. The
                database and the images live in a volume, so they're kept.
              </p>
            }
            desktop={
              <p>
                The campaign selector tells you when there's a new version.
                Download the latest installer or AppImage and use it in place of
                the old one: your campaigns are kept.
              </p>
            }
            android={
              <p>
                The campaign selector tells you when there's a new version.
                Download the latest APK and install it over the previous one:
                your campaigns are kept.
              </p>
            }
          />
        ),
      },
    ],
  },
  {
    id: "agents",
    title: "AI agents",
    summary: "Connect Claude, OpenCode, Codex or Antigravity to your campaign.",
    sections: [
      {
        id: "agents-what",
        title: "What it allows",
        modes: ["web", "desktop"],
        body: (
          <>
            <p>
              Rolboard can talk to AI assistants that support MCP: Claude
              (Desktop and Code), OpenCode, Codex and Antigravity. You can ask
              them to search your campaign, summarise a session or help you
              prepare the next one.
            </p>
            <p>
              They read almost everything, secrets included. They write little:
              they create loose notes, NPCs, quests and lore entries, and edit a
              session's prep. They never delete anything.
            </p>
            <Callout
              kind="warning"
              title="What the assistant sees, its provider sees"
            >
              Whatever the assistant reads from your campaign travels to the AI
              service you use. If you don't want a secret to leave your machine,
              don't connect that client.
            </Callout>
          </>
        ),
      },
      {
        id: "agents-desktop",
        title: "From the desktop app",
        modes: ["desktop"],
        body: (
          <>
            <ol>
              <li>
                Open <em>App settings</em> and find the <em>AI agents</em>{" "}
                section.
              </li>
              <li>
                Turn on <em>Let AI agents connect</em>.
              </li>
              <li>
                Press <em>Connect</em> on the client you use; the ones you don't
                have show as <em>Not installed</em>.
              </li>
              <li>Restart the client so it reads the new configuration.</li>
            </ol>
            <p>
              The app has to be open while the assistant works: the connection
              goes through a local socket owned by your user, with no network
              and no keys.
            </p>
            <Callout kind="warning" title="Close Claude Code before connecting">
              Claude Code rewrites its configuration file while it runs and
              could overwrite the change. If your OpenCode configuration has
              comments, the app leaves it alone and tells you.
            </Callout>
            <p>
              If you move or update the app and its location changes, press{" "}
              <em>Reconnect</em>.
            </p>
          </>
        ),
      },
      {
        id: "agents-web",
        title: "From a server (web)",
        modes: ["web"],
        body: (
          <>
            <p>
              The assistant runs on your computer and reaches the server through
              a small program, <code>rolboard-mcp</code>. Download it from the
              repository's <em>Releases</em> page on GitHub. You'll need three
              values:
            </p>
            <ul>
              <li>
                <code>ROLBOARD_URL</code>: the server address, the same one you
                use in the browser.
              </li>
              <li>
                <code>ROLBOARD_CAMPAIGN</code>: the campaign number. It's the
                one in the address after <code>/c/</code>.
              </li>
              <li>
                <code>ROLBOARD_CODE_FILE</code>: a text file with that
                campaign's access code and nothing else.
              </li>
            </ul>
            <p>Example with Claude Code:</p>
            <Code>{EN_MCP_WEB}</Code>
            <p>
              Each campaign has its own code, so one connection reaches a single
              campaign. For another one, repeat the command with its number and
              its file.
            </p>
            <Callout kind="warning" title="Protect the code file">
              Anyone who can read it can enter the campaign. Keep it readable
              only by your user (<code>chmod 600</code>).
            </Callout>
          </>
        ),
      },
    ],
  },
  {
    id: "about",
    title: "About",
    summary: "Authorship and licence.",
    sections: [
      {
        id: "credits",
        title: "Credits and licence",
        body: (
          <>
            <p>
              Developed by <Author />. Logos and icons designed by{" "}
              <strong>Mateo Guareschi</strong>.
            </p>
            <p>
              Rolboard is open-source software released under the MIT licence.
              The logos and icons aren't covered by that licence: they belong to
              their author and are used with permission.
            </p>
          </>
        ),
      },
    ],
  },
];

export const helpContent: Record<Lang, HelpPage[]> = { es, en };
