import { marked } from "marked";
import DOMPurify from "dompurify";
import { useLang, type Lang } from "../lib/i18n";

const calloutLabel: Record<Lang, Record<string, string>> = {
  es: {
    note: "Nota",
    abstract: "Resumen",
    info: "Info",
    todo: "Pendiente",
    tip: "Tip",
    success: "Hecho",
    question: "Pregunta",
    warning: "Advertencia",
    failure: "Fallo",
    danger: "Peligro",
    bug: "Bug",
    example: "Ejemplo",
    quote: "Cita",
  },
  en: {
    note: "Note",
    abstract: "Abstract",
    info: "Info",
    todo: "Todo",
    tip: "Tip",
    success: "Success",
    question: "Question",
    warning: "Warning",
    failure: "Failure",
    danger: "Danger",
    bug: "Bug",
    example: "Example",
    quote: "Quote",
  },
};

const calloutAlias: Record<string, string> = {
  summary: "abstract",
  tldr: "abstract",
  hint: "tip",
  important: "tip",
  check: "success",
  done: "success",
  help: "question",
  faq: "question",
  caution: "warning",
  attention: "warning",
  fail: "failure",
  missing: "failure",
  error: "danger",
  cite: "quote",
};

const calloutRe = /<blockquote>\s*<p>\[!(\w+)\][ \t]*([^\n<]*)\n?/g;

function renderCallouts(html: string, lang: Lang) {
  return html.replace(
    calloutRe,
    (_match, rawKind: string, rawTitle: string) => {
      const kind = calloutAlias[rawKind.toLowerCase()] ?? rawKind.toLowerCase();
      const title =
        rawTitle.trim() ||
        calloutLabel[lang][kind] ||
        kind[0].toUpperCase() + kind.slice(1);
      return `<blockquote class="callout callout-${kind}" data-callout="${kind}"><p class="callout-title">${title}</p><p>`;
    },
  );
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
