import "./CampaignDashboard.css";
import {
  crystalColor,
  sessionCode,
  type Npc,
  type Campaign,
  type Arc,
  type Quest,
  type Session,
} from "../data/domain";
import { StatusPill, ArcStatusPill, QuestStatusPill } from "../components/StatusPill";
import { EntityIdentity } from "../components/EntityIdentity";
import { MarkdownText } from "../components/MarkdownText";
import { openInObsidian } from "../lib/obsidian";

export type DashboardSection =
  | "resumen"
  | "npcs"
  | "sesiones"
  | "arcos"
  | "locaciones"
  | "facciones"
  | "quests"
  | "jugadores";

interface CampaignDashboardProps {
  campaign: Campaign;
  arcs: Arc[];
  npcs: Npc[];
  quests: Quest[];
  sessions: Session[];
  onNavigate: (section: DashboardSection) => void;
  onSelectNpc: (npcId: string) => void;
  onStartSession: () => void;
  onReindex: () => void;
  reindexing: boolean;
}

export function CampaignDashboard({
  campaign,
  arcs,
  npcs,
  quests,
  sessions,
  onNavigate,
  onSelectNpc,
  onStartSession,
  onReindex,
  reindexing,
}: CampaignDashboardProps) {
  const recentNpcs = npcs.slice(0, 4);
  const activeQuests = quests.filter((q) => q.status === "active");
  const currentArc =
    arcs.find((a) => a.status === "en_curso") ?? arcs[arcs.length - 1];
  const totalSessions = sessions.length;
  const lastSession = sessions
    .filter((s) => s.arcId === currentArc?.id)
    .reduce<Session | undefined>(
      (best, s) =>
        !best || s.sessionNumber > best.sessionNumber || (s.sessionNumber === best.sessionNumber && s.subNumber > best.subNumber)
          ? s
          : best,
      undefined,
    );
  const arcProgressMatch = currentArc?.meta.match(/(\d+)\s*(?:de|\/)\s*(\d+)/);
  const arcProgressPct = arcProgressMatch
    ? Math.round(
        (Number(arcProgressMatch[1]) / Number(arcProgressMatch[2])) * 100,
      )
    : currentArc?.status === "en_curso"
      ? 0
      : 100;

  return (
    <div className="campaign-dashboard">
      <header className="campaign-dashboard__header">
        <div>
          <div className="display" style={{ fontSize: 27 }}>
            {campaign.name}
          </div>
          <div className="campaign-dashboard__meta">
            {campaign.system}
            {currentArc ? ` · ${currentArc.label} · ${currentArc.meta}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {currentArc?.obsidianPath && (
            <button
              className="btn btn-secondary"
              onClick={() => openInObsidian(currentArc.obsidianPath)}
            >
              Abrir en Obsidian
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={onReindex}
            disabled={reindexing}
          >
            {reindexing ? "Reindexando…" : "Reindexar vault"}
          </button>
          <button className="btn btn-primary" onClick={onStartSession}>
            Jugar sesión {totalSessions + 1}
          </button>
        </div>
      </header>

      {currentArc && (
        <div className="campaign-dashboard__row">
          <div className="card campaign-dashboard__panel">
            <div className="campaign-dashboard__panel-top">
              <span className="label">Arco actual</span>
              <ArcStatusPill status={currentArc.status} />
            </div>
            <div className="display" style={{ fontSize: 21, marginTop: 9 }}>
              {currentArc.label}
            </div>
            <p className="campaign-dashboard__desc">{currentArc.summary}</p>
            <div className="campaign-dashboard__progress">
              <div className="campaign-dashboard__progress-track">
                <div
                  className="campaign-dashboard__progress-fill"
                  style={{ width: `${arcProgressPct}%` }}
                />
              </div>
              <span className="campaign-dashboard__progress-label">
                {currentArc.meta}
              </span>
            </div>
          </div>

          {lastSession && (
            <div className="card campaign-dashboard__panel">
              <span className="label">Última sesión</span>
              <div className="campaign-dashboard__session-title">
                <span className="campaign-dashboard__session-n">
                  {sessionCode(lastSession)}
                </span>
                <span className="campaign-dashboard__session-date">
                  {lastSession.date}
                </span>
              </div>
              <MarkdownText className="campaign-dashboard__desc" text={lastSession.summary} />
            </div>
          )}
        </div>
      )}

      <div className="campaign-dashboard__row">
        <div className="card campaign-dashboard__list">
          <div className="campaign-dashboard__list-header">
            <span
              style={{
                fontWeight: 500,
                fontSize: 14.5,
                color: "var(--text-primary)",
              }}
            >
              Quests activas
            </span>
            <button
              className="campaign-dashboard__list-action"
              onClick={() => onNavigate("quests")}
            >
              Ver todas
            </button>
          </div>
          {activeQuests.map((q) => (
            <div key={q.id} className="campaign-dashboard__list-row">
              <div style={{ flex: 1 }}>
                <span className="title-underline">
                  <span
                    style={{
                      fontWeight: 500,
                      fontSize: 14.5,
                      color: "var(--text-body-strong)",
                    }}
                  >
                    {q.name}
                  </span>
                  <span
                    className="title-underline__bar"
                    style={{ background: crystalColor[q.crystal] }}
                  />
                </span>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    marginTop: 5,
                  }}
                >
                  {q.hook}
                </div>
              </div>
              <QuestStatusPill status={q.status} />
            </div>
          ))}
        </div>

        <div className="card campaign-dashboard__list">
          <div className="campaign-dashboard__list-header">
            <span
              style={{
                fontWeight: 500,
                fontSize: 14.5,
                color: "var(--text-primary)",
              }}
            >
              NPCs recientes
            </span>
            <button
              className="campaign-dashboard__list-action"
              onClick={() => onNavigate("npcs")}
            >
              Ver todos
            </button>
          </div>
          {recentNpcs.map((n) => (
            <div
              key={n.id}
              className="campaign-dashboard__list-row campaign-dashboard__list-row--clickable"
              onClick={() => onSelectNpc(n.id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <EntityIdentity
                  initials={n.initials}
                  name={n.name}
                  role={n.statusNote ?? n.role}
                  color={crystalColor[n.crystal]}
                />
              </div>
              <StatusPill status={n.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
