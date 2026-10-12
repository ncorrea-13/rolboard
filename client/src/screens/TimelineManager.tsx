import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import "./NpcEdit.css";
import "../components/NpcTypesManager.css";
import { Modal } from "../components/Modal";
import { MarkdownField } from "../components/MarkdownField";
import type { Timeline } from "../data/domain";
import type { TimelineValues } from "../hooks/useTimeline";
import { useT } from "../lib/i18n";

const PALETTE = [
  "#5fa8d3",
  "#d08a3c",
  "#7fb58c",
  "#9b7bea",
  "#d46a9f",
  "#4fb5a3",
  "#c2665c",
  "#a3c255",
];

interface TimelineManagerProps {
  timelines: Timeline[];
  onCreate: (values: TimelineValues) => Promise<Timeline | null>;
  onUpdate: (id: string, values: TimelineValues) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onClose: () => void;
}

const blank = (index: number): TimelineValues => ({
  name: "",
  description: "",
  color: PALETTE[index % PALETTE.length],
  startLabel: "",
  endLabel: "",
});

export function TimelineManager({
  timelines,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
}: TimelineManagerProps) {
  const t = useT();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<TimelineValues>(blank(timelines.length));

  function startNew() {
    setDraft(blank(timelines.length));
    setEditingId("new");
  }

  function startEdit(timeline: Timeline) {
    setDraft({
      name: timeline.name,
      description: timeline.description,
      color: timeline.color,
      startLabel: timeline.startLabel,
      endLabel: timeline.endLabel,
    });
    setEditingId(timeline.id);
  }

  async function save() {
    if (!draft.name.trim()) return;
    const ok =
      editingId === "new"
        ? (await onCreate(draft)) !== null
        : await onUpdate(editingId as string, draft);
    if (ok) setEditingId(null);
  }

  return (
    <Modal title={t("timeline.manage")} onClose={onClose}>
      <p className="npc-types__hint">{t("timeline.manageHint")}</p>
      <div className="npc-types__rows">
        {timelines.map((tl) => (
          <div key={tl.id} className="npc-types__row">
            <span
              className="npc-types__color"
              style={{ background: tl.color, borderRadius: 4 }}
            />
            <span style={{ flex: 1, minWidth: 0 }}>{tl.name}</span>
            <button
              type="button"
              className="npc-types__delete"
              onClick={() => startEdit(tl)}
              aria-label={t("common.edit")}
              title={t("common.edit")}
            >
              <Pencil size={15} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="npc-types__delete"
              onClick={() => void onDelete(tl.id)}
              aria-label={t("entityDetail.deactivate")}
              title={t("entityDetail.deactivate")}
            >
              <Trash2 size={15} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>

      {editingId === null ? (
        <button className="btn btn-primary" onClick={startNew}>
          {t("timeline.newTimeline")}
        </button>
      ) : (
        <div className="npc-edit__col">
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">{t("timeline.timelineName")}</span>
              <input
                aria-label={t("timeline.timelineName")}
                className="npc-edit__input"
                value={draft.name}
                maxLength={60}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <span className="label">{t("npcTypes.color")}</span>
              <div className="npc-edit__type-row" style={{ marginTop: 6 }}>
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setDraft({ ...draft, color: c })}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: c,
                      border:
                        draft.color === c
                          ? "2px solid var(--text-primary)"
                          : "2px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">{t("timeline.startLabel")}</span>
              <input
                aria-label={t("timeline.startLabel")}
                className="npc-edit__input"
                value={draft.startLabel}
                onChange={(e) =>
                  setDraft({ ...draft, startLabel: e.target.value })
                }
              />
            </div>
            <div>
              <span className="label">{t("timeline.endLabel")}</span>
              <input
                aria-label={t("timeline.endLabel")}
                className="npc-edit__input"
                value={draft.endLabel}
                onChange={(e) =>
                  setDraft({ ...draft, endLabel: e.target.value })
                }
              />
            </div>
          </div>
          <MarkdownField
            label={`${t("common.description")} ${t("common.supportsMarkdown")}`}
            minHeight={100}
            value={draft.description}
            onChange={(v) => setDraft({ ...draft, description: v })}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="btn btn-secondary"
              onClick={() => setEditingId(null)}
            >
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => void save()}
              disabled={!draft.name.trim()}
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
