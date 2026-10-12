import { useState } from "react";
import "./SessionsTimeline.css";
import {
  arcStatusColor,
  formatDate,
  isPlayed,
  sessionCode,
  type Arc,
  type Session,
} from "../data/domain";
import { MarkdownText } from "../components/MarkdownText";
import { Tabs } from "../components/Tabs";
import { useT } from "../lib/i18n";
import { Link } from "../components/Link";

type TimelineTab = "sessions" | "oneshots";
const TAB_STORAGE_KEY = "rolboard.sessionsTimelineTab";

function readStoredTab(): TimelineTab {
  try {
    return localStorage.getItem(TAB_STORAGE_KEY) === "oneshots"
      ? "oneshots"
      : "sessions";
  } catch {
    return "sessions";
  }
}

interface SessionsTimelineProps {
  arcs: Arc[];
  sessions: Session[];
  nextSessionNumber: number;
  hasPlannedSession: boolean;
  onPlanSession: () => void;
  onPlaySession: () => void;
  onPlanOneshot: () => void;
}

function SessionRow({ session, arc }: { session: Session; arc?: Arc }) {
  const t = useT();
  return (
    <Link
      className={`card sessions-timeline__item${isPlayed(session) ? "" : " sessions-timeline__item--planned"}`}
      style={{ cursor: "pointer" }}
      route={{ name: "session-detail", sessionId: session.id }}
    >
      <div className="sessions-timeline__item-n">
        <div className="sessions-timeline__item-code">
          {sessionCode(session)}
        </div>
        <div className="sessions-timeline__item-date">
          {session.date
            ? formatDate(session.date)
            : t("sessionsTimeline.noDate")}
        </div>
      </div>
      <div className="sessions-timeline__item-body">
        {(!isPlayed(session) || arc) && (
          <div className="sessions-timeline__item-chips">
            {!isPlayed(session) && (
              <span className="npc-detail__appearance-chip">
                {t("sessionsTimeline.planned")}
              </span>
            )}
            {arc && (
              <span className="npc-detail__appearance-chip">{arc.label}</span>
            )}
          </div>
        )}
        {session.title && (
          <div className="display sessions-timeline__item-title">
            {session.title}
          </div>
        )}
        <div className="sessions-timeline__item-text sessions-timeline__item-text--clamp">
          <MarkdownText inline text={session.summary} />
        </div>
      </div>
    </Link>
  );
}

export function SessionsTimeline({
  arcs,
  sessions: allSessions,
  nextSessionNumber,
  hasPlannedSession,
  onPlanSession,
  onPlaySession,
  onPlanOneshot,
}: SessionsTimelineProps) {
  const t = useT();
  const [tab, setTab] = useState<TimelineTab>(readStoredTab);

  const sessions = allSessions.filter((s) => s.sessionType !== "oneshot");
  const oneshots = allSessions
    .filter((s) => s.sessionType === "oneshot")
    .sort((a, b) => a.sessionNumber - b.sessionNumber);
  const unassigned = sessions.filter((s) => !s.arcId);
  const groups: { arc?: Arc; sessions: Session[] }[] = [
    ...(unassigned.length ? [{ arc: undefined, sessions: unassigned }] : []),
    ...arcs.map((arc) => ({
      arc,
      sessions: sessions.filter((s) => s.arcId === arc.id),
    })),
  ];

  function selectTab(next: TimelineTab) {
    setTab(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      return;
    }
  }

  return (
    <div className="card sessions-timeline">
      <header className="sessions-timeline__header">
        <div>
          <div className="display page-title" role="heading" aria-level={1}>
            {t("sessionsTimeline.title")}
          </div>
          <div className="sessions-timeline__subtitle">
            {tab === "sessions"
              ? `${sessions.length} ${t("sessionsTimeline.sessionsWord")} ${t("sessionsTimeline.in")} ${arcs.length} ${t("arcsList.count")}`
              : `${oneshots.length} ${t("sessionsTimeline.oneshotsWord")}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "sessions" ? (
            <>
              <button className="btn btn-secondary" onClick={onPlanSession}>
                {t(
                  hasPlannedSession
                    ? "sessionsTimeline.editPlan"
                    : "sessionsTimeline.plan",
                )}
              </button>
              {hasPlannedSession && (
                <button className="btn btn-primary" onClick={onPlaySession}>
                  {t("sessionsTimeline.play")} {nextSessionNumber}
                </button>
              )}
            </>
          ) : (
            <button className="btn btn-primary" onClick={onPlanOneshot}>
              {t("sessionsTimeline.planOneshot")}
            </button>
          )}
        </div>
      </header>

      <Tabs
        tabs={[
          {
            key: "sessions",
            label: `${t("sessionsTimeline.tabSessions")} (${sessions.length})`,
          },
          {
            key: "oneshots",
            label: `${t("sessionsTimeline.tabOneshots")} (${oneshots.length})`,
          },
        ]}
        active={tab}
        onChange={selectTab}
      />

      {tab === "sessions" ? (
        <div className="sessions-timeline__arcs">
          {groups.map(({ arc, sessions: groupSessions }) => (
            <div key={arc?.id ?? "sin-arco"}>
              <div className="sessions-timeline__arc-head">
                <span
                  className="status-dot"
                  style={{
                    background: arc
                      ? arcStatusColor[arc.status]
                      : "var(--text-secondary)",
                  }}
                />
                <span className="display" style={{ fontSize: 17.5 }}>
                  {arc?.label ?? t("sessionsTimeline.noArc")}
                </span>
                <span className="sessions-timeline__arc-rule" />
              </div>
              <div className="sessions-timeline__list">
                {groupSessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="oneshot-grid">
          {oneshots.length === 0 && (
            <span style={{ color: "var(--text-secondary)" }}>
              {t("sessionsTimeline.noOneshots")}
            </span>
          )}
          {oneshots.map((o) => {
            const arc = arcs.find((x) => x.id === o.arcId);
            return (
              <Link
                key={o.id}
                className="oneshot-card"
                route={{ name: "session-detail", sessionId: o.id }}
              >
                <span className="oneshot-card__code">{sessionCode(o)}</span>
                <span className="display oneshot-card__title">
                  {o.title || sessionCode(o)}
                </span>
                {o.summary && (
                  <span className="oneshot-card__summary">
                    <MarkdownText inline text={o.summary} />
                  </span>
                )}
                <span className="oneshot-card__foot">
                  <span>
                    {o.date ? formatDate(o.date) : t("sessionsTimeline.noDate")}
                  </span>
                  {arc && <span>{arc.label}</span>}
                  {!isPlayed(o) && (
                    <span className="npc-detail__appearance-chip">
                      {t("sessionsTimeline.plannedMasc")}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
