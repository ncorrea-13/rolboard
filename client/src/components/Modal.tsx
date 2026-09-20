import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import "./Modal.css";
import { useT } from "../lib/i18n";

export function Modal({
  title,
  onClose,
  children,
  size,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "large" | "sheet";
}) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);
  // read during the first render, before any child autoFocus moves focus into the dialog
  const [opener] = useState(() => document.activeElement as HTMLElement | null);

  // Escape closes; focus moves into the dialog and returns to the opener on unmount.
  useEffect(() => {
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [opener]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`card modal-panel${size ? ` modal-panel--${size}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-panel__header">
          <span className="display" style={{ fontSize: 18 }}>
            {title}
          </span>
          <button
            className="modal-panel__close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>
        <div className="modal-panel__body">{children}</div>
      </div>
    </div>
  );
}
