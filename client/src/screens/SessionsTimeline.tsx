import "./SessionsTimeline.css";
import { arcStatusColor, type Arc } from "../data/mock";
import { MarkdownText } from "../components/MarkdownText";

interface SessionsTimelineProps {
  arcs: Arc[];
  onPlanSession: () => void;
  onPlaySession: () => void;
  onOpenSession: (arcId: string, sessionN: string) => void;
}

export function SessionsTimeline({ arcs, onPlanSession, onPlaySession, onOpenSession }: SessionsTimelineProps) {
  const totalSessions = arcs.reduce((acc, a) => acc + a.sessions.length, 0);

  return (
    <div className="card sessions-timeline">
      <header className="sessions-timeline__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>Sesiones</div>
          <div className="sessions-timeline__subtitle">{totalSessions} sesiones en {arcs.length} arcos</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onPlanSession}>Planificar sesión</button>
          <button className="btn btn-primary" onClick={onPlaySession}>Jugar sesión</button>
        </div>
      </header>

      <div className="sessions-timeline__arcs">
        {arcs.map((arc) => (
          <div key={arc.id}>
            <div className="sessions-timeline__arc-head">
              <span className="status-dot" style={{ background: arcStatusColor[arc.status] }} />
              <span className="display" style={{ fontSize: 17.5 }}>{arc.label}</span>
              <span className="sessions-timeline__arc-meta">{arc.meta}</span>
              <span className="sessions-timeline__arc-rule" />
            </div>
            <div className="sessions-timeline__list">
              {arc.sessions.map((s) => (
                <div key={s.n} className="card sessions-timeline__item">
                  <div className="sessions-timeline__item-n">
                    <div className="sessions-timeline__item-code">{s.n}</div>
                    <div className="sessions-timeline__item-date">{s.date || "sin fecha"}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="sessions-timeline__item-text">
                      {!s.played && <span className="npc-detail__appearance-chip" style={{ marginRight: 8 }}>Planificada</span>}
                      <MarkdownText inline text={s.text} />
                    </div>
                    {s.tags && <div className="sessions-timeline__item-tags">{s.tags}</div>}
                  </div>
                  <span
                    className="sessions-timeline__item-open"
                    style={{ cursor: "pointer" }}
                    onClick={() => onOpenSession(arc.id, s.n)}
                  >
                    Abrir
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
