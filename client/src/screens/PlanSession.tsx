import { useState } from "react";
import "./NpcEdit.css";
import type { Arc, Npc, Quest } from "../data/domain";
import { useT } from "../lib/i18n";

interface PlanSessionProps {
  nextNumber: number;
  currentArc?: Arc;
  npcs: Npc[];
  quests: Quest[];
  onConfirm: (values: {
    date: string;
    summary: string;
    expectedNpcIds: string[];
    expectedQuestIds: string[];
  }) => void;
  onCancel: () => void;
}

export function PlanSession({ nextNumber, currentArc, npcs, quests, onConfirm, onCancel }: PlanSessionProps) {
  const t = useT();
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [expectedNpcIds, setExpectedNpcIds] = useState<Set<string>>(new Set());
  const [expectedQuestIds, setExpectedQuestIds] = useState<Set<string>>(new Set());

  const sessionCode = `S${String(nextNumber).padStart(2, "0")}`;

  function toggleNpc(id: string) {
    setExpectedNpcIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleQuest(id: string) {
    setExpectedQuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm({
      date,
      summary: text.trim() || t("planSession.defaultSummary"),
      expectedNpcIds: [...expectedNpcIds],
      expectedQuestIds: [...expectedQuestIds],
    });
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--accent-sky)" }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: "var(--accent-sky)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            {t("planSession.planning")} · {sessionCode}{currentArc ? ` · ${currentArc.label}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}>{t("common.cancel")}</button>
          <button className="btn btn-primary" onClick={handleConfirm}>{t("sessionsTimeline.plan")}</button>
        </div>
      </div>

      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">{t("newSessionForm.session")}</span>
              <div className="npc-edit__input">{sessionCode}</div>
            </div>
            <div>
              <span className="label">{t("planSession.tentativeDate")}</span>
              <input type="date" className="npc-edit__input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <span className="label">{t("planSession.prepNotesLabel")}</span>
            <textarea
              className="npc-edit__textarea"
              style={{ minHeight: 160 }}
              placeholder={t("planSession.prepPlaceholder")}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>

        <div className="npc-edit__col">
          <div>
            <span className="label">{t("planSession.expectedNpcs")}</span>
            {npcs.length > 0 ? (
              <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                {npcs.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`npc-edit__type-chip${expectedNpcIds.has(n.id) ? " npc-edit__type-chip--active" : ""}`}
                    onClick={() => toggleNpc(n.id)}
                  >
                    {n.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="npc-edit__hint">{t("planSession.noNpcsYet")}</div>
            )}
          </div>

          <div>
            <span className="label">{t("planSession.expectedQuests")}</span>
            {quests.length > 0 ? (
              <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                {quests.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className={`npc-edit__type-chip${expectedQuestIds.has(q.id) ? " npc-edit__type-chip--active" : ""}`}
                    onClick={() => toggleQuest(q.id)}
                  >
                    {q.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="npc-edit__hint">{t("planSession.noQuestsYet")}</div>
            )}
          </div>

          <div className="npc-edit__note">
            {t("planSession.note")}
          </div>
        </div>
      </div>
    </div>
  );
}
