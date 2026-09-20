import { marked } from "marked";
import DOMPurify from "dompurify";
import { useLang, type Lang } from "../lib/i18n";

const calloutLabel: Record<Lang, Record<string, string>> = {
  es: { note: "Nota", warning: "Advertencia", tip: "Tip", quote: "Cita" },
  en: { note: "Note", warning: "Warning", tip: "Tip", quote: "Quote" },
};

// Same markup the server renderer emits for vault notes: blockquote.callout.callout-<kind>.
// The title is already escaped by marked, so it is not escaped again.
const calloutRe = /<blockquote>\s*<p>\[!(\w+)\][ \t]*([^\n<]*)\n?/g;

function renderCallouts(html: string, lang: Lang) {
  return html.replace(calloutRe, (_match, rawKind: string, rawTitle: string) => {
    const kind = rawKind.toLowerCase();
    const title =
      rawTitle.trim() ||
      calloutLabel[lang][kind] ||
      kind[0].toUpperCase() + kind.slice(1);
    return `<blockquote class="callout callout-${kind}" data-callout="${kind}"><p class="callout-title">${title}</p><p>`;
  });
}

export function MarkdownText({
  text,
  className,
  inline,
}: {
  text: string;
  className?: string;
  inline?: boolean;
}) {
  const lang = useLang();
  const raw = inline
    ? marked.parseInline(text, { async: false })
    : renderCallouts(marked.parse(text, { async: false }), lang);
  const html = DOMPurify.sanitize(raw);
  const Tag = inline ? "span" : "div";
  return (
    <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
