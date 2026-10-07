import { FolderOpen } from "lucide-react";
import "./FolderField.css";
import { useT } from "../lib/i18n";

export function FolderField({
  label,
  hint,
  value,
  busy,
  onPick,
}: {
  label: string;
  hint?: string;
  value: string;
  busy: boolean;
  onPick: () => void;
}) {
  const t = useT();
  return (
    <div style={{ minWidth: 0 }}>
      <span className="label">{label}</span>
      <div className="folder-field">
        <FolderOpen
          className="folder-field__icon"
          size={15}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span
          className={`folder-field__path${value ? "" : " folder-field__path--empty"}`}
          title={value || undefined}
        >
          {value || t("vaultsRoot.none")}
        </span>
        <button
          className="btn btn-secondary folder-field__btn"
          onClick={onPick}
          disabled={busy}
          type="button"
        >
          {t(value ? "vaultsRoot.change" : "vaultsRoot.pick")}
        </button>
      </div>
      {hint && <div className="npc-edit__hint">{hint}</div>}
    </div>
  );
}
