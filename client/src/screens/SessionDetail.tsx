import "./NpcEdit.css";
import { sessionCode, type Arc, type Session } from "../data/domain";
import { MarkdownText } from "../components/MarkdownText";
import { RenderedNoteButton } from "../components/RenderedNoteButton";
import { useSessionExpectations } from "../hooks/useSessionExpectations";
import { useT } from "../lib/i18n";

interface SessionDetailProps {
  arc?: Arc;
  campaignId: string;
  session: Session;
  onBack: () => void;
  onEdit: () => void;
  onMarkPlayed: () => void;
}

export function SessionDetail({
  arc,
  campaignId,
  session,
  onBack,
  onEdit,
  onMarkPlayed,
}: SessionDetailProps) {
  const t = useT();
  const played = session.sessionType !== "planning";
  const { npcs, quests } = useSessionExpectations(session.id);

  const planned = (
    <div className="npc-edit__col">
      <span className="label">{t("sessionEdit.planned")}</span>
      <div>
        <span className="label">{t("sessionEdit.prepNotesOnly")}</span>
        <MarkdownText
          className="npc-detail__desc"
          text={played ? session.prepNotes || "" : session.summary}
        />
      </div>
      {npcs.length > 0 && (
        <div>
          <span className="label">{t("planSession.expectedNpcs")}</span>
          <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
            {npcs.map((n) => (
              <span key={n.npc_id} className="npc-edit__type-chip">
                {n.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {quests.length > 0 && (
        <div>
          <span className="label">{t("planSession.expectedQuests")}</span>
          <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
            {quests.map((q) => (
              <span key={q.quest_id} className="npc-edit__type-chip">
                {q.title}
              </span>
            ))}
          </div>
        </div>
      )}
      {!played && (
        <button className="btn btn-primary" onClick={onMarkPlayed}>
          {t("sessionEdit.markAsPlayed")}
        </button>
      )}
    </div>
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
          <RenderedNoteButton
            campaignId={campaignId}
            path={session.obsidianPath}
            title={`${t("sessionEdit.sessionPrefix")} ${sessionCode(session)}`}
            fallback={session.summary}
          />
          <button className="btn btn-primary" onClick={onEdit}>
            {t("common.edit")}
          </button>
        </div>
      </div>

      <div className={`npc-edit__body ${played ? "npc-edit__body--even" : ""}`}>
        {planned}
        {played && (
          <div className="npc-edit__col">
            <span className="label">{t("sessionEdit.whatHappened")}</span>
            <div>
              <span className="label">{t("sessionEdit.realDate")}</span>
              <div className="npc-edit__input">
                {session.date || t("sessionEdit.notSet")}
              </div>
            </div>
            <div>
              <span className="label">{t("sessionEdit.history")}</span>
              <MarkdownText
                className="npc-detail__desc"
                text={session.summary}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
