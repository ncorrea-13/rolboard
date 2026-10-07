import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import "./CampaignSelector.css";
import type { Campaign } from "../data/domain";
import { CampaignStatusPill } from "../components/StatusPill";
import { LanguageToggle } from "../components/LanguageToggle";
import { useT } from "../lib/i18n";
import { Link } from "../components/Link";
import { AppSettings } from "../components/AppSettings";
import { isLocalMode, openExternal } from "../lib/api";
import { newerRelease, type Release } from "../lib/updates";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [release, setRelease] = useState<Release | null>(null);

  useEffect(() => {
    newerRelease().then(setRelease);
  }, []);

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
          {isLocalMode() && (
            <button
              className="btn btn-secondary"
              onClick={() => setSettingsOpen(true)}
              title={t("appSettings.title")}
              aria-label={t("appSettings.title")}
            >
              <Settings size={15} strokeWidth={1.75} />
            </button>
          )}
          <LanguageToggle />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("campaignSelector.new")}
          </button>
        </div>
      </header>
      {release && (
        <a
          className="campaign-selector__update"
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={openExternal}
        >
          {t("update.available")} <strong>{release.tag}</strong>
        </a>
      )}
      <div className="campaign-selector__grid">
        {campaigns.map((c) => (
          <Link
            key={c.id}
            className="card campaign-card campaign-card--clickable"
            route={{ name: "section", section: "resumen" }}
            campaignId={c.id}
            onNavigate={() => onSelect(c.id)}
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
          </Link>
        ))}
        <div className="campaign-card campaign-card--new" onClick={onCreate}>
          {t("campaignSelector.newCard")}
        </div>
      </div>
      {settingsOpen && <AppSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
