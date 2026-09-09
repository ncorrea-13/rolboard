import "./CampaignSelector.css";
import type { Campaign } from "../data/mock";
import { StatusPill } from "../components/StatusPill";

interface CampaignSelectorProps {
  campaigns: Campaign[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function CampaignSelector({ campaigns, onSelect, onCreate }: CampaignSelectorProps) {
  return (
    <div className="card campaign-selector">
      <header className="campaign-selector__header">
        <div>
          <div className="campaign-selector__title">
            <span className="sidebar__glow-standalone" />
            <span className="display" style={{ fontSize: 26 }}>Tus campañas</span>
          </div>
          <div className="campaign-selector__subtitle">
            {campaigns.length} {campaigns.length === 1 ? "campaña" : "campañas"}
          </div>
        </div>
        <button className="btn btn-primary" onClick={onCreate}>Nueva campaña</button>
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
        <div className="campaign-card campaign-card--new" onClick={onCreate}>+ Crear campaña</div>
      </div>
    </div>
  );
}
