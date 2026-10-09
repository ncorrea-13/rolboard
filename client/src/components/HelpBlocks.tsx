import type { ReactNode } from "react";
import { PORTFOLIO_URL } from "./SiteFooter";
import { isLocalMode, openExternal } from "../lib/api";

export function Callout({
  kind,
  title,
  children,
}: {
  kind: "note" | "warning" | "tip" | "quote";
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={`callout callout-${kind}`}>
      <p className="callout-title">{title}</p>
      <p>{children}</p>
    </div>
  );
}

export function Code({ children }: { children: string }) {
  return (
    <pre>
      <code>{children}</code>
    </pre>
  );
}

export function ForMode({
  web,
  desktop,
}: {
  web: ReactNode;
  desktop: ReactNode;
}) {
  return <>{isLocalMode() ? desktop : web}</>;
}

export function Author() {
  return (
    <a
      href={PORTFOLIO_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={openExternal}
    >
      <strong>Nicolás Correa</strong>
    </a>
  );
}

const CALLOUT_TYPES: [string, string[]][] = [
  ["NOTE", []],
  ["ABSTRACT", ["SUMMARY", "TLDR"]],
  ["INFO", []],
  ["TODO", []],
  ["TIP", ["HINT", "IMPORTANT"]],
  ["SUCCESS", ["CHECK", "DONE"]],
  ["QUESTION", ["HELP", "FAQ"]],
  ["WARNING", ["CAUTION", "ATTENTION"]],
  ["FAILURE", ["FAIL", "MISSING"]],
  ["DANGER", ["ERROR"]],
  ["BUG", []],
  ["EXAMPLE", []],
  ["QUOTE", ["CITE"]],
];

export function CalloutTypes({ aliasLabel }: { aliasLabel: string }) {
  return (
    <ul>
      {CALLOUT_TYPES.map(([kind, aliases]) => (
        <li key={kind}>
          <code>[!{kind}]</code>
          {aliases.length > 0 && (
            <>
              {` — ${aliasLabel}: `}
              {aliases.map((a, i) => (
                <span key={a}>
                  {i > 0 && ", "}
                  <code>{a}</code>
                </span>
              ))}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
