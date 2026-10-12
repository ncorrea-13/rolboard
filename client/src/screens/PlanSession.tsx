import { useState } from "react";
import "./NpcEdit.css";
import type { Arc, Npc, Quest } from "../data/domain";
import { useT } from "../lib/i18n";
import { MarkdownField } from "../components/MarkdownField";

interface PlanSessionProps {
  nextNumber: number;
  oneshot?: boolean;
  currentArc?: Arc;
  arcs: Arc[];
  npcs: Npc[];
  quests: Quest[];
  onConfirm: (values: {
    date: string;
    summary: string;
    title?: string;
    oneshot?: boolean;
    arcId?: string;
    expectedNpcIds: string[];
    expectedQuestIds: string[];
  }) => void;
  onCancel: () => void;
}

export function PlanSession({
  nextNumber,
  oneshot,
  currentArc,
  arcs,
  npcs,
  quests,
  onConfirm,
  onCancel,
}: PlanSessionProps) {
  const t = useT();
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [arcId, setArcId] = useState(oneshot ? "" : (currentArc?.id ?? ""));
  const [expectedNpcIds, setExpectedNpcIds] = useState<Set<string>>(new Set());
  const [expectedQuestIds, setExpectedQuestIds] = useState<Set<string>>(
    new Set(),
  );

  const sessionCode = `${oneshot ? "O" : "S"}${String(nextNumber).padStart(2, "0")}`;

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
      title: oneshot ? title.trim() : undefined,
      oneshot,
      arcId: arcId || undefined,
      expectedNpcIds: [...expectedNpcIds],
      expectedQuestIds: [...expectedQuestIds],
    });
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar npc-edit__bar--planned">
        <div className="npc-edit__bar-left">
          <span className="status-dot" />
          <span
            style={{
              fontWeight: 500,
              fontSize: 13.5,
              color: "var(--text-primary)",
            }}
          >
            {t(
              oneshot ? "planSession.planningOneshot" : "planSession.planning",
            )}{" "}
            · {sessionCode}
            {!oneshot && currentArc ? ` · ${currentArc.label}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            {t(
              oneshot
                ? "sessionsTimeline.planOneshot"
                : "sessionsTimeline.plan",
            )}
          </button>
        </div>
      </div>

      <div className="npc-edit__body">
        <div className="npc-edit__col">
          {oneshot && (
            <div>
              <span className="label">{t("sessionEdit.titleLabel")}</span>
              <input
                className="npc-edit__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          )}
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">
                {t(
                  oneshot
                    ? "sessionEdit.oneshotPrefix"
                    : "newSessionForm.session",
                )}
              </span>
              <div className="npc-edit__input">{sessionCode}</div>
            </div>
            <div>
              <span className="label">{t("planSession.tentativeDate")}</span>
              <input
                type="date"
                className="npc-edit__input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span className="label">{t("sessionEdit.arc")}</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              value={arcId}
              onChange={(e) => setArcId(e.target.value)}
            >
              <option value="">{t("sessionsTimeline.noArc")}</option>
              {arcs.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <MarkdownField
            label={t("planSession.prepNotesLabel")}
            minHeight={160}
            placeholder={t("planSession.prepPlaceholder")}
            value={text}
            onChange={setText}
          />
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
              <div className="npc-edit__hint">
                {t("planSession.noQuestsYet")}
              </div>
            )}
          </div>

          <div className="npc-edit__note">{t("planSession.note")}</div>
        </div>
      </div>
    </div>
  );
}
