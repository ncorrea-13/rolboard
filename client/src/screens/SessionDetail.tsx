import "./SessionDetail.css";
import {
  formatDate,
  isPlayed,
  sessionCode,
  type Arc,
  type Session,
} from "../data/domain";
import { Crack } from "../components/Crack";
import { MarkdownText } from "../components/MarkdownText";
import { Link } from "../components/Link";
import { RenderedNoteButton } from "../components/RenderedNoteButton";
import { useSessionExpectations } from "../hooks/useSessionExpectations";
import { useT } from "../lib/i18n";

interface SessionDetailProps {
  arc?: Arc;
  campaignId: string;
  session: Session;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPlayed: () => void;
}

export function SessionDetail({
  arc,
  campaignId,
  session,
  onBack,
  onEdit,
  onDelete,
  onMarkPlayed,
}: SessionDetailProps) {
  const t = useT();
  const sessionPrefix = t(
    session.sessionType === "oneshot"
      ? "sessionEdit.oneshotPrefix"
      : "sessionEdit.sessionPrefix",
  );
  const played = isPlayed(session);
  const { npcs, quests } = useSessionExpectations(session.id);
  const code = `${sessionPrefix} ${sessionCode(session)}`;
  const mainText = session.summary;
  const prepNotes = played ? session.prepNotes || "" : "";

  return (
    <div className="session-detail">
      <header className="session-detail__head">
        <div className="session-detail__titles">
          <div className="session-detail__over">
            {arc ? (
              <>
                <Link
                  className="link-inline"
                  route={{ name: "entity-detail", kind: "arc", id: arc.id }}
                >
                  {arc.label}
                </Link>
                {` · ${code}`}
              </>
            ) : (
              code
            )}
          </div>
          <div className="display page-title" role="heading" aria-level={1}>
            {session.title || code}
          </div>
          <div className="session-detail__meta">
            <span
              className={`session-detail__state session-detail__state--${played ? "played" : "planned"}`}
            >
              <span className="status-dot" />
              {t(
                session.sessionType === "oneshot"
                  ? played
                    ? "sessionEdit.playedSuffixMasc"
                    : "sessionEdit.plannedSuffixMasc"
                  : played
                    ? "sessionEdit.playedSuffix"
                    : "sessionEdit.plannedSuffix",
              ).replace(/^·\s*/, "")}
            </span>
            <span>
              {session.date
                ? formatDate(session.date)
                : t("sessionEdit.notSet")}
            </span>
          </div>
        </div>
        <div className="session-detail__actions">
          <button className="btn btn-danger-outline" onClick={onDelete}>
            {t("entityDetail.deactivate")}
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            {t("common.back")}
          </button>
          <RenderedNoteButton
            campaignId={campaignId}
            path={session.obsidianPath}
            title={code}
            fallback={session.summary}
          />
          <button className="btn btn-primary" onClick={onEdit}>
            {t("common.edit")}
          </button>
        </div>
      </header>

      <Crack />

      <div className="session-detail__body">
        <section className="session-detail__main">
          <h2 className="label">
            {played ? t("sessionEdit.history") : t("sessionEdit.planned")}
          </h2>
          {mainText ? (
            <MarkdownText className="npc-detail__desc" text={mainText} />
          ) : (
            <p className="session-detail__empty">
              {t("entityDetail.noContent")}
            </p>
          )}
        </section>

        <aside className="session-detail__side">
          {prepNotes && (
            <div>
              <h2 className="label">{t("sessionEdit.prepNotesOnly")}</h2>
              <MarkdownText className="npc-detail__desc" text={prepNotes} />
            </div>
          )}
          {npcs.length > 0 && (
            <div>
              <h2 className="label">{t("planSession.expectedNpcs")}</h2>
              <div className="session-detail__chips">
                {npcs.map((n) => (
                  <Link
                    key={n.npc_id}
                    className="link-inline session-detail__chip"
                    route={{ name: "npc-detail", npcId: String(n.npc_id) }}
                  >
                    {n.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {quests.length > 0 && (
            <div>
              <h2 className="label">{t("planSession.expectedQuests")}</h2>
              <div className="session-detail__chips">
                {quests.map((q) => (
                  <Link
                    key={q.quest_id}
                    className="link-inline session-detail__chip"
                    route={{
                      name: "entity-detail",
                      kind: "quest",
                      id: String(q.quest_id),
                    }}
                  >
                    {q.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {!played && (
            <button className="btn btn-primary" onClick={onMarkPlayed}>
              {t("sessionEdit.markAsPlayed")}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
