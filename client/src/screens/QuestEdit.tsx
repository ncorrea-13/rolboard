import { useState } from "react";
import "./NpcEdit.css";
import { questStatusLabel, type Quest, type QuestStatus } from "../data/domain";
import { useT, useLang } from "../lib/i18n";

interface QuestEditProps {
  quest: Quest;
  onSave: (patch: Partial<Quest>) => void;
  onDiscard: () => void;
}

const questStatusOrder: QuestStatus[] = [
  "active",
  "on_hold",
  "completed",
  "failed",
];

export function QuestEdit({ quest, onSave, onDiscard }: QuestEditProps) {
  const t = useT();
  const lang = useLang();
  const statusOptions: { value: QuestStatus; label: string }[] =
    questStatusOrder.map((value) => ({
      value,
      label: questStatusLabel[lang][value],
    }));
  const priorityOptions: { value: 1 | 2 | 3; label: string }[] = [
    { value: 1, label: t("questDetail.priorityHigh") },
    { value: 2, label: t("questDetail.priorityMedium") },
    { value: 3, label: t("questDetail.priorityLow") },
  ];
  const [name, setName] = useState(quest.name);
  const [hook, setHook] = useState(quest.hook);
  const [status, setStatus] = useState<QuestStatus>(quest.status);
  const [priority, setPriority] = useState<1 | 2 | 3>(quest.priority);
  const [notes, setNotes] = useState(quest.notes);

  const dirty =
    name !== quest.name ||
    hook !== quest.hook ||
    status !== quest.status ||
    priority !== quest.priority ||
    notes !== quest.notes;

  function handleSave() {
    onSave({ name, hook, status, priority, notes });
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar">
        <div className="npc-edit__bar-left">
          <span className="status-dot" />
          <span
            style={{
              fontWeight: 500,
              fontSize: 13.5,
              color: "var(--text-primary)",
            }}
          >
            {quest.id
              ? `${t("common.editing")} · ${quest.name}`
              : t("questEdit.new")}
          </span>
          {dirty && (
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {t("common.unsavedChanges")}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onDiscard}>
            {t("common.discard")}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {t("common.save")}
          </button>
        </div>
      </div>

      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div>
            <span className="label">{t("questEdit.title")}</span>
            <input
              className="npc-edit__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <span className="label">
              {t("questEdit.hookLabel")} {t("common.supportsMarkdown")}
            </span>
            <textarea
              className="npc-edit__textarea"
              style={{ minHeight: 140 }}
              value={hook}
              onChange={(e) => setHook(e.target.value)}
            />
          </div>

          <div>
            <span className="label">
              {t("questEdit.notesLabel")} {t("common.supportsMarkdown")}
            </span>
            <textarea
              className="npc-edit__textarea"
              style={{ minHeight: 160 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="npc-edit__col">
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">{t("common.status")}</span>
              <select
                className="npc-edit__select npc-edit__select--native"
                value={status}
                onChange={(e) => setStatus(e.target.value as QuestStatus)}
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">{t("questDetail.priority")}</span>
              <select
                className="npc-edit__select npc-edit__select--native"
                value={priority}
                onChange={(e) =>
                  setPriority(Number(e.target.value) as 1 | 2 | 3)
                }
              >
                {priorityOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
