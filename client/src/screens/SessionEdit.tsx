import { useEffect, useState } from "react";
import { Cross } from "lucide-react";
import "./NpcEdit.css";
import { sessionCode, type Arc, type Session } from "../data/domain";
import { MarkdownText } from "../components/MarkdownText";
import { RenderedNoteButton } from "../components/RenderedNoteButton";
import { useSessionExpectations } from "../hooks/useSessionExpectations";
import { apiFetch } from "../lib/api";
import { useT } from "../lib/i18n";

interface SessionEditProps {
  arc?: Arc;
  arcs: Arc[];
  session: Session;
  campaignId: string;
  onSave: (patch: Partial<Session>) => void;
  onBack: () => void;
  onDelete: () => void;
  autoConfirm?: boolean;
}

export function SessionEdit({
  arc,
  arcs,
  session,
  campaignId,
  onSave,
  onBack,
  onDelete,
  autoConfirm,
}: SessionEditProps) {
  const t = useT();
  const played = session.sessionType !== "planning";
  const [date, setDate] = useState(session.date);
  const [text, setText] = useState(session.summary);
  const [arcId, setArcId] = useState(session.arcId ?? "");
  const [confirmingPlay, setConfirmingPlay] = useState(
    !played && Boolean(autoConfirm),
  );
  const [playDate, setPlayDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [recap, setRecap] = useState("");

  const { npcs: expectedNpcs, quests: expectedQuests } = useSessionExpectations(
    session.id,
  );

  const [wardails, setWardails] = useState("");

  useEffect(() => {
    if (!confirmingPlay) return;
    apiFetch<{ wardails: string }>(`/campaigns/${campaignId}`)
      .then((c) => setWardails(c.wardails ?? ""))
      .catch((err) => console.error("Error cargando wardails:", err));
  }, [campaignId, confirmingPlay]);

  function handleSave() {
    onSave({ date, summary: text, arcId: arcId || undefined });
  }

  function handleConfirmPlayed() {
    onSave({
      date: playDate,
      summary: recap.trim() || t("newSessionForm.defaultSummary"),
      prepNotes: session.prepNotes || session.summary,
      sessionType: "session",
    });
  }

  const noteTitle = `${t("sessionEdit.sessionPrefix")} ${sessionCode(session)}`;
  const noteButton = (
    <RenderedNoteButton
      campaignId={campaignId}
      path={session.obsidianPath}
      title={noteTitle}
      fallback={session.summary}
    />
  );

  if (confirmingPlay) {
    return (
      <div className="card npc-edit">
        <div className="npc-edit__bar npc-edit__bar--played">
          <div className="npc-edit__bar-left">
            <span className="status-dot" />
            <span
              style={{
                fontWeight: 500,
                fontSize: 13.5,
                color: "var(--text-primary)",
              }}
            >
              {t("sessionEdit.confirmingPlay")} ·{" "}
              {t("sessionEdit.sessionPrefix")} {sessionCode(session)}{" "}
              {arc ? `· ${arc.label}` : ""}
            </span>
          </div>
          <div className="npc-edit__bar-actions">
            <button
              className="btn btn-secondary"
              onClick={() =>
                autoConfirm ? onBack() : setConfirmingPlay(false)
              }
            >
              {t("common.cancel")}
            </button>
            {noteButton}
            <button className="btn btn-primary" onClick={handleConfirmPlayed}>
              {t("sessionEdit.confirmPlayed")}
            </button>
          </div>
        </div>

        <div className="npc-edit__body npc-edit__body--even">
          <div className="npc-edit__col">
            <span className="label">{t("sessionEdit.planned")}</span>
            <div className="npc-edit__grid-2" style={{ marginTop: 10 }}>
              <div>
                <span className="label">{t("newSessionForm.session")}</span>
                <div className="npc-edit__input">{sessionCode(session)}</div>
              </div>
              <div>
                <span className="label">
                  {t("sessionEdit.tentativeDateLabel")}
                </span>
                <div className="npc-edit__input">
                  {session.date || t("sessionEdit.notSet")}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <span className="label">{t("planSession.prepNotesLabel")}</span>
              <MarkdownText
                className="npc-detail__desc"
                text={session.summary}
              />
            </div>

            {expectedNpcs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="label">{t("planSession.expectedNpcs")}</span>
                <div
                  className="npc-edit__type-row"
                  style={{ flexWrap: "wrap" }}
                >
                  {expectedNpcs.map((n) => (
                    <span key={n.npc_id} className="npc-edit__type-chip">
                      {n.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {expectedQuests.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="label">{t("planSession.expectedQuests")}</span>
                <div
                  className="npc-edit__type-row"
                  style={{ flexWrap: "wrap" }}
                >
                  {expectedQuests.map((q) => (
                    <span key={q.quest_id} className="npc-edit__type-chip">
                      {q.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="npc-edit__col">
            <span className="label">{t("sessionEdit.whatHappened")}</span>
            <div className="npc-edit__grid-2" style={{ marginTop: 10 }}>
              <div>
                <span className="label">{t("sessionEdit.realDate")}</span>
                <input
                  type="date"
                  className="npc-edit__input"
                  value={playDate}
                  onChange={(e) => setPlayDate(e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <span className="label">{t("sessionEdit.recapLabel")}</span>
              <textarea
                className="npc-edit__textarea"
                style={{ minHeight: 220 }}
                placeholder={t("sessionEdit.recapPlaceholder")}
                value={recap}
                onChange={(e) => setRecap(e.target.value)}
              />
            </div>
            {wardails.trim() && (
              <div style={{ marginTop: 16 }}>
                <span
                  className="label"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--accent-wardail)",
                  }}
                >
                  <Cross size={12} strokeWidth={2} />
                  {t("wardails.title")}
                </span>
                <MarkdownText className="npc-detail__desc" text={wardails} />
              </div>
            )}
            <div className="npc-edit__note">
              {t("sessionEdit.prepNotesKeptSeparate")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const codeField = (
    <div>
      <span className="label">{t("newSessionForm.session")}</span>
      <div className="npc-edit__input">{sessionCode(session)}</div>
    </div>
  );
  const dateField = (
    <div>
      <span className="label">
        {played ? t("sessionEdit.realDate") : t("newSessionForm.date")}
      </span>
      <input
        type="date"
        className="npc-edit__input"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
    </div>
  );
  const arcField = (
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
  );
  const summaryField = (
    <div>
      <span className="label">
        {played ? t("sessionEdit.history") : t("sessionEdit.prepNotesOnly")}{" "}
        {t("common.supportsMarkdown")}
      </span>
      <textarea
        className="npc-edit__textarea"
        style={{ minHeight: played ? 260 : 160 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
  const expectedBlock = (
    <>
      {expectedNpcs.length > 0 && (
        <div>
          <span className="label">{t("planSession.expectedNpcs")}</span>
          <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
            {expectedNpcs.map((n) => (
              <span key={n.npc_id} className="npc-edit__type-chip">
                {n.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {expectedQuests.length > 0 && (
        <div>
          <span className="label">{t("planSession.expectedQuests")}</span>
          <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
            {expectedQuests.map((q) => (
              <span key={q.quest_id} className="npc-edit__type-chip">
                {q.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="card npc-edit">
      <div
        className={`npc-edit__bar ${played ? "npc-edit__bar--played" : "npc-edit__bar--planned"}`}
      >
        <div className="npc-edit__bar-left">
          <span className="status-dot" />
          <span
            style={{
              fontWeight: 500,
              fontSize: 13.5,
              color: "var(--text-primary)",
            }}
          >
            {t("sessionEdit.sessionPrefix")} {sessionCode(session)}{" "}
            {arc ? `· ${arc.label}` : ""}{" "}
            {played
              ? t("sessionEdit.playedSuffix")
              : t("sessionEdit.plannedSuffix")}
          </span>
        </div>
        <div className="npc-edit__bar-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            {t("common.back")}
          </button>
          {noteButton}
          <button className="btn btn-secondary" onClick={onDelete}>
            {t("sessionEdit.deleteSession")}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {t("common.save")}
          </button>
        </div>
      </div>

      {played ? (
        <div className="npc-edit__body npc-edit__body--even">
          <div className="npc-edit__col">
            <span className="label">{t("sessionEdit.planned")}</span>
            <div className="npc-edit__grid-2">
              {codeField}
              {arcField}
            </div>
            {session.prepNotes && (
              <div>
                <span className="label">
                  {t("sessionEdit.originalPrepNotes")}
                </span>
                <MarkdownText
                  className="npc-detail__desc"
                  text={session.prepNotes}
                />
              </div>
            )}
            {expectedBlock}
          </div>
          <div className="npc-edit__col">
            <span className="label">{t("sessionEdit.whatHappened")}</span>
            {dateField}
            {summaryField}
          </div>
        </div>
      ) : (
        <div className="npc-edit__body">
          <div className="npc-edit__col">
            <div className="npc-edit__grid-2">
              {codeField}
              {dateField}
            </div>
            {arcField}
            {summaryField}
          </div>
          <div className="npc-edit__col">
            {expectedBlock}
            <button
              className="btn btn-primary"
              onClick={() => setConfirmingPlay(true)}
            >
              {t("sessionEdit.markAsPlayed")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
