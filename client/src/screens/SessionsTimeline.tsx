import "./SessionsTimeline.css";
import { arcStatusColor, formatDate, sessionCode, type Arc, type Session } from "../data/domain";
import { MarkdownText } from "../components/MarkdownText";
import { useT } from "../lib/i18n";

interface SessionsTimelineProps {
  arcs: Arc[];
  sessions: Session[];
  nextSessionNumber: number;
  onPlanSession: () => void;
  onPlaySession: () => void;
  onOpenSession: (sessionId: string) => void;
}

export function SessionsTimeline({ arcs, sessions, nextSessionNumber, onPlanSession, onPlaySession, onOpenSession }: SessionsTimelineProps) {
  const t = useT();
  const unassigned = sessions.filter((s) => !s.arcId);
  const groups: { arc?: Arc; sessions: Session[] }[] = [
    ...(unassigned.length ? [{ arc: undefined, sessions: unassigned }] : []),
    ...arcs.map((arc) => ({ arc, sessions: sessions.filter((s) => s.arcId === arc.id) })),
  ];

  return (
    <div className="card sessions-timeline">
      <header className="sessions-timeline__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>{t("sessionsTimeline.title")}</div>
          <div className="sessions-timeline__subtitle">{sessions.length} {t("sessionsTimeline.sessionsWord")} {t("sessionsTimeline.in")} {arcs.length} {t("arcsList.count")}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onPlanSession}>{t("sessionsTimeline.plan")}</button>
          <button className="btn btn-primary" onClick={onPlaySession}>{t("sessionsTimeline.play")} {nextSessionNumber}</button>
        </div>
      </header>

      <div className="sessions-timeline__arcs">
        {groups.map(({ arc, sessions: groupSessions }) => (
          <div key={arc?.id ?? "sin-arco"}>
            <div className="sessions-timeline__arc-head">
              <span className="status-dot" style={{ background: arc ? arcStatusColor[arc.status] : "var(--text-secondary)" }} />
              <span className="display" style={{ fontSize: 17.5 }}>{arc?.label ?? t("sessionsTimeline.noArc")}</span>
              <span className="sessions-timeline__arc-rule" />
            </div>
            <div className="sessions-timeline__list">
              {groupSessions.map((s) => (
                <div
                  key={s.id}
                  className="card sessions-timeline__item"
                  style={{ cursor: "pointer" }}
                  onClick={() => onOpenSession(s.id)}
                >
                  <div className="sessions-timeline__item-n">
                    <div className="sessions-timeline__item-code">{sessionCode(s)}</div>
                    <div className="sessions-timeline__item-date">{s.date ? formatDate(s.date) : t("sessionsTimeline.noDate")}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sessions-timeline__item-text sessions-timeline__item-text--clamp">
                      {s.sessionType === "planning" && <span className="npc-detail__appearance-chip" style={{ marginRight: 8 }}>{t("sessionsTimeline.planned")}</span>}
                      <MarkdownText inline text={s.summary} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
