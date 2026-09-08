import "./CampaignSelector.css";
import { campaigns } from "../data/mock";
import { StatusPill } from "../components/StatusPill";

export function CampaignSelector({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="card campaign-selector">
      <header className="campaign-selector__header">
        <div>
          <div className="campaign-selector__title">
            <span className="sidebar__glow-standalone" />
            <span className="display" style={{ fontSize: 26 }}>Tus campañas</span>
          </div>
          <div className="campaign-selector__subtitle">4 campañas · última actividad hace 13 días</div>
        </div>
        <button className="btn btn-primary">Nueva campaña</button>
      </header>
      <div className="campaign-selector__grid">
        {campaigns.map((c) => (
          <div key={c.id} className="card campaign-card campaign-card--clickable" onClick={() => onSelect(c.id)}>
            <div className="campaign-card__top">
              <div>
                <div className="display" style={{ fontSize: 18.5 }}>{c.name}</div>
                <div className="campaign-card__system">{c.system}</div>
              </div>
              <StatusPill status={c.status} />
            </div>
            <div className="campaign-card__bottom">
              <span>{c.meta}</span>
              <span>{c.last}</span>
            </div>
          </div>
        ))}
        <div className="campaign-card campaign-card--new">+ Crear campaña</div>
      </div>
    </div>
  );
}
