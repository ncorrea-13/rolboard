import "./CampaignSelector.css";
import type { Campaign } from "../data/domain";
import { CampaignStatusPill } from "../components/StatusPill";
import { LanguageToggle } from "../components/LanguageToggle";
import { useT } from "../lib/i18n";

interface CampaignSelectorProps {
  campaigns: Campaign[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function CampaignSelector({
  campaigns,
  onSelect,
  onCreate,
}: CampaignSelectorProps) {
  const t = useT();
  return (
    <div className="card campaign-selector">
      <header className="campaign-selector__header">
        <div>
          <div className="campaign-selector__title">
            <span className="sidebar__glow-standalone" />
            <span className="display" style={{ fontSize: 26 }}>
              {t("campaignSelector.title")}
            </span>
          </div>
          <div className="campaign-selector__subtitle">
            {campaigns.length}{" "}
            {campaigns.length === 1
              ? t("campaignSelector.one")
              : t("campaignSelector.many")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <LanguageToggle />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("campaignSelector.new")}
          </button>
        </div>
      </header>
      <div className="campaign-selector__grid">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="card campaign-card campaign-card--clickable"
            onClick={() => onSelect(c.id)}
          >
            <div className="campaign-card__top">
              <div>
                <div className="display" style={{ fontSize: 18.5 }}>
                  {c.name}
                </div>
                <div className="campaign-card__system">{c.system}</div>
              </div>
              <CampaignStatusPill status={c.status} />
            </div>
            <div className="campaign-card__bottom">
              <span>{c.meta}</span>
              <span>{c.last}</span>
            </div>
          </div>
        ))}
        <div className="campaign-card campaign-card--new" onClick={onCreate}>
          {t("campaignSelector.newCard")}
        </div>
      </div>
    </div>
  );
}
