import "./CampaignDashboard.css";
import { quests, crystalColor, type Npc } from "../data/mock";
import { StatusPill, QuestStatusPill } from "../components/StatusPill";
import { EntityIdentity } from "../components/EntityIdentity";

export type DashboardSection = "resumen" | "npcs" | "sesiones" | "arcos" | "locaciones" | "facciones" | "quests" | "jugadores";

interface CampaignDashboardProps {
  npcs: Npc[];
  onNavigate: (section: DashboardSection) => void;
  onSelectNpc: (npcId: string) => void;
  onStartSession: () => void;
}

/** Contenido de la sección "Resumen" — vive dentro del AppShell, sin sidebar ni card propios. */
export function CampaignDashboard({ npcs, onNavigate, onSelectNpc, onStartSession }: CampaignDashboardProps) {
  const recentNpcs = npcs.slice(0, 4);

  return (
    <div className="campaign-dashboard">
      <header className="campaign-dashboard__header">
        <div>
          <div className="display" style={{ fontSize: 27 }}>La Fisura de Kholinar</div>
          <div className="campaign-dashboard__meta">Cosmere RPG · Arco II · 4 de 7 sesiones</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary">Abrir en Obsidian</button>
          <button className="btn btn-primary" onClick={onStartSession}>Iniciar sesión 8</button>
        </div>
      </header>

      <div className="campaign-dashboard__row">
        <div className="card campaign-dashboard__panel">
          <div className="campaign-dashboard__panel-top">
            <span className="label">Arco actual</span>
            <StatusPill status="alive" label="En curso" />
          </div>
          <div className="display" style={{ fontSize: 21, marginTop: 9 }}>Arco II · Las Tormentas Menores</div>
          <p className="campaign-dashboard__desc">
            La grieta cognitiva bajo el Mercado de Esferas se ensancha con cada alta tormenta. Los Vigías buscan un
            Radiante que la sostenga.
          </p>
          <div className="campaign-dashboard__progress">
            <div className="campaign-dashboard__progress-track">
              <div className="campaign-dashboard__progress-fill" style={{ width: "57%" }} />
            </div>
            <span className="campaign-dashboard__progress-label">4 / 7</span>
          </div>
        </div>

        <div className="card campaign-dashboard__panel">
          <span className="label">Última sesión</span>
          <div className="campaign-dashboard__session-title">
            <span className="campaign-dashboard__session-n">Sesión 7</span>
            <span className="campaign-dashboard__session-date">24 ago 2026</span>
          </div>
          <p className="campaign-dashboard__desc">
            Los PJ negociaron con Threnn. Maestro Corvain murió en la refriega del muelle.
          </p>
          <div className="campaign-dashboard__chips">
            <span className="campaign-dashboard__chip">+2 NPCs</span>
            <span className="campaign-dashboard__chip campaign-dashboard__chip--dead">
              <span className="status-dot" style={{ background: "var(--status-dead)" }} />
              1 muerte
            </span>
          </div>
        </div>
      </div>

      <div className="campaign-dashboard__row">
        <div className="card campaign-dashboard__list">
          <div className="campaign-dashboard__list-header">
            <span style={{ fontWeight: 500, fontSize: 14.5, color: "var(--text-primary)" }}>Quests activas</span>
            <button className="campaign-dashboard__list-action" onClick={() => onNavigate("quests")}>Ver todas</button>
          </div>
          {quests.map((q) => (
            <div key={q.id} className="campaign-dashboard__list-row">
              <div style={{ flex: 1 }}>
                <span className="title-underline">
                  <span style={{ fontWeight: 500, fontSize: 14.5, color: "var(--text-body-strong)" }}>{q.name}</span>
                  <span className="title-underline__bar" style={{ background: crystalColor[q.crystal] }} />
                </span>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 5 }}>{q.hook}</div>
              </div>
              <QuestStatusPill status={q.status} />
            </div>
          ))}
        </div>

        <div className="card campaign-dashboard__list">
          <div className="campaign-dashboard__list-header">
            <span style={{ fontWeight: 500, fontSize: 14.5, color: "var(--text-primary)" }}>NPCs recientes</span>
            <button className="campaign-dashboard__list-action" onClick={() => onNavigate("npcs")}>Ver todos</button>
          </div>
          {recentNpcs.map((n) => (
            <div
              key={n.id}
              className="campaign-dashboard__list-row campaign-dashboard__list-row--clickable"
              onClick={() => onSelectNpc(n.id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <EntityIdentity initials={n.initials} name={n.name} role={n.statusNote ?? n.role} color={crystalColor[n.crystal]} />
              </div>
              <StatusPill status={n.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
