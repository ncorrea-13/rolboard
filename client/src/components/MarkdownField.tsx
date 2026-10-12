import { useState, type CSSProperties } from "react";
import { Maximize2 } from "lucide-react";
import "./MarkdownField.css";
import { Modal } from "./Modal";
import { useT } from "../lib/i18n";

export function MarkdownField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  minHeight,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  minHeight?: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const style: CSSProperties | undefined = minHeight
    ? { minHeight }
    : undefined;

  return (
    <div>
      <div className="md-field__head">
        <span className="label">{label}</span>
        <button
          type="button"
          className="md-field__expand"
          onClick={() => setOpen(true)}
          aria-label={t("common.expand")}
          title={t("common.expand")}
        >
          <Maximize2 size={14} />
        </button>
      </div>
      <textarea
        aria-label={label}
        className="npc-edit__textarea"
        style={style}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {open && (
        <Modal title={label} size="full" onClose={() => setOpen(false)}>
          <textarea
            aria-label={label}
            className="npc-edit__textarea md-field__full"
            placeholder={placeholder}
            maxLength={maxLength}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        </Modal>
      )}
    </div>
  );
}
