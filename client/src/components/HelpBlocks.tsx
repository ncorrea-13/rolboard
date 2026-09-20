import type { ReactNode } from "react";

// The same markup the markdown renderer emits for `> [!NOTE]`, built directly so the help shows real callouts.
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
