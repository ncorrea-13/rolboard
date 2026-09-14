import { marked } from "marked";
import DOMPurify from "dompurify";

export function MarkdownText({
  text,
  className,
  inline,
}: {
  text: string;
  className?: string;
  inline?: boolean;
}) {
  const raw = inline
    ? marked.parseInline(text, { async: false })
    : marked.parse(text, { async: false });
  const html = DOMPurify.sanitize(raw);
  const Tag = inline ? "span" : "div";
  return (
    <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
