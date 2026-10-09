import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./Modal.css";
import { useT } from "../lib/i18n";

const openModals: symbol[] = [];

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
  const backdropRef = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);
  const [id] = useState(() => Symbol());
  const [opener] = useState(() => document.activeElement as HTMLElement | null);

  useEffect(() => {
    if (!panelRef.current?.contains(document.activeElement))
      panelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && openModals[openModals.length - 1] === id)
        close();
    }
    openModals.push(id);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      openModals.splice(openModals.indexOf(id), 1);
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [opener, id]);

  useLayoutEffect(() => {
    const node = backdropRef.current;
    return () => {
      queueMicrotask(() => {
        if (!node || node.isConnected) return;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const ghost = node.cloneNode(true) as HTMLElement;
        ghost.classList.add("modal-backdrop--closing");
        ghost.inert = true;
        document.body.appendChild(ghost);
        window.setTimeout(() => ghost.remove(), 200);
      });
    };
  }, []);

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
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
