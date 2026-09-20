import { useRef, useState } from "react";
import { Tags, Trash2 } from "lucide-react";
import "./NpcTypesManager.css";
import "../screens/NpcEdit.css";
import { Modal } from "./Modal";
import type { NpcType } from "../data/domain";
import { useT } from "../lib/i18n";

export interface NpcTypesApi {
  types: NpcType[];
  onCreate: (label: string, color: string) => Promise<boolean>;
  onUpdate: (id: string, label: string, color: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const PALETTE = [
  "#c79a55",
  "#6fa98c",
  "#a87c9b",
  "#5fa8d3",
  "#d46a9f",
  "#d08a3c",
  "#7fb58c",
  "#9b7bea",
  "#4fb5a3",
  "#c2665c",
];

function TypeRow({ type, api }: { type: NpcType; api: NpcTypesApi }) {
  const t = useT();
  const [label, setLabel] = useState(type.label);
  const [color, setColor] = useState(type.color);
  const colorTimer = useRef<number>(undefined);

  function commitLabel() {
    const next = label.trim();
    if (!next) return setLabel(type.label);
    if (next !== type.label) void api.onUpdate(type.id, next, color);
  }

  function changeColor(next: string) {
    setColor(next);
    window.clearTimeout(colorTimer.current);
    colorTimer.current = window.setTimeout(
      () => void api.onUpdate(type.id, label.trim() || type.label, next),
      400,
    );
  }

  function remove() {
    if (window.confirm(t("npcTypes.confirmDelete"))) void api.onDelete(type.id);
  }

  return (
    <div className="npc-types__row">
      <input
        type="color"
        className="npc-types__color"
        value={color}
        aria-label={t("npcTypes.color")}
        onChange={(e) => changeColor(e.target.value)}
      />
      <input
        className="npc-edit__input"
        value={label}
        maxLength={40}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      <span className="npc-types__key">{type.key}</span>
      <button
        type="button"
        className="npc-types__delete"
        onClick={remove}
        title={t("npcTypes.delete")}
        aria-label={t("npcTypes.delete")}
      >
        <Trash2 size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function AddRow({ api }: { api: NpcTypesApi }) {
  const t = useT();
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(
    PALETTE[api.types.length % PALETTE.length],
  );

  async function add() {
    const next = label.trim();
    if (!next) return;
    if (await api.onCreate(next, color)) {
      setLabel("");
      setColor(PALETTE[(api.types.length + 1) % PALETTE.length]);
    }
  }

  return (
    <div className="npc-types__row npc-types__add">
      <input
        type="color"
        className="npc-types__color"
        value={color}
        aria-label={t("npcTypes.color")}
        onChange={(e) => setColor(e.target.value)}
      />
      <input
        className="npc-edit__input"
        value={label}
        maxLength={40}
        placeholder={t("npcTypes.newPlaceholder")}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void add()}
      />
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void add()}
        disabled={!label.trim()}
      >
        {t("npcTypes.add")}
      </button>
    </div>
  );
}

export function NpcTypesButton({ api }: { api: NpcTypesApi }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen(true)}
      >
        <Tags
          size={13}
          strokeWidth={1.75}
          style={{ verticalAlign: "-2px", marginRight: 6 }}
        />
        {t("npcTypes.manage")}
      </button>
      {open && (
        <Modal title={t("npcTypes.title")} onClose={() => setOpen(false)}>
          <p className="npc-types__hint">{t("npcTypes.hint")}</p>
          <div className="npc-types__rows">
            {api.types.map((type) => (
              <TypeRow key={type.id} type={type} api={api} />
            ))}
            <AddRow api={api} />
          </div>
        </Modal>
      )}
    </>
  );
}
