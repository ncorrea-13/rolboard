import { marked } from "marked";

/** Render de Markdown solo para mostrar — lo que se tipea/guarda siempre es
 * texto plano. El backend real hace lo mismo con goldmark (ver notes/render);
 * esto es el equivalente JS para el mock. Confianza: app privada de un solo
 * usuario (ver docs/DECISIONS.md), no hay sanitización adicional. */
export function MarkdownText({ text, className, inline }: { text: string; className?: string; inline?: boolean }) {
  const html = inline ? marked.parseInline(text, { async: false }) : marked.parse(text, { async: false });
  const Tag = inline ? "span" : "div";
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
