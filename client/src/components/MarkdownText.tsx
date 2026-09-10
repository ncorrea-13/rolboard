import { marked } from "marked";

/** Render de Markdown client-side para texto tipeado en el dashboard (resúmenes
 * de sesión, notas de prep) — no reemplaza a `notes/render` (goldmark, backend),
 * que es solo para notas reales del vault de Obsidian. Confianza: app privada
 * de un solo usuario (ver docs/DECISIONS.md), no hay sanitización adicional. */
export function MarkdownText({ text, className, inline }: { text: string; className?: string; inline?: boolean }) {
  const html = inline ? marked.parseInline(text, { async: false }) : marked.parse(text, { async: false });
  const Tag = inline ? "span" : "div";
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
