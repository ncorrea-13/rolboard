import type { ReactNode } from "react";
import "./Modal.css";

export function Modal({
  title,
  onClose,
  children,
  size,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "large";
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`card modal-panel${size === "large" ? " modal-panel--large" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-panel__header">
          <span className="display" style={{ fontSize: 18 }}>
            {title}
          </span>
          <button
            className="modal-panel__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="modal-panel__body">{children}</div>
      </div>
    </div>
  );
}
