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
