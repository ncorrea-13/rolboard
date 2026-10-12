import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import "./CampaignSelector.css";
import type { Campaign } from "../data/domain";
import { CampaignStatusPill } from "../components/StatusPill";
import { LanguageToggle } from "../components/LanguageToggle";
import { useT } from "../lib/i18n";
import { Link } from "../components/Link";
import { Crack } from "../components/Crack";
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
          <img
            className="campaign-selector__brand"
            src="/logo-wordmark.png"
            alt={t("campaignSelector.title")}
          />
          <div className="campaign-selector__subtitle">
            {campaigns.length}{" "}
            {campaigns.length === 1
              ? t("campaignSelector.one")
              : t("campaignSelector.many")}
          </div>
        </div>
        <div className="campaign-selector__actions">
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
      <Crack />
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
        {[...campaigns]
          .sort(
            (x, y) =>
              Number(y.status === "active") - Number(x.status === "active"),
          )
          .map((c) => (
            <Link
              key={c.id}
              className={`campaign-card campaign-card--clickable${c.status === "active" ? " campaign-card--active" : ""}`}
              route={{ name: "section", section: "resumen" }}
              campaignId={c.id}
              onNavigate={() => onSelect(c.id)}
            >
              <div className="campaign-card__top">
                <div>
                  <div className="campaign-card__system">{c.system}</div>
                  <div className="display campaign-card__name">{c.name}</div>
                </div>
                <CampaignStatusPill status={c.status} />
              </div>
              {(c.meta || c.last) && (
                <div className="campaign-card__bottom">
                  <span>{c.meta}</span>
                  <span>{c.last}</span>
                </div>
              )}
            </Link>
          ))}
        <button
          type="button"
          className="campaign-card campaign-card--new"
          onClick={onCreate}
        >
          {t("campaignSelector.newCard")}
        </button>
      </div>
      {settingsOpen && <AppSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
