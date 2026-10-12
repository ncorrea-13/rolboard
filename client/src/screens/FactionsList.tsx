import { useState } from "react";
import { Shield } from "lucide-react";
import "../styles/list.css";
import type { Group } from "../data/domain";
import { useT } from "../lib/i18n";
import { entityImageUrl } from "../lib/images";
import { MarkdownText } from "../components/MarkdownText";
import { Link } from "../components/Link";

interface FactionsListProps {
  groups: Group[];
  onCreate: () => void;
  imageVersion?: number;
}

export function FactionsList({
  groups,
  onCreate,
  imageVersion = 0,
}: FactionsListProps) {
  const t = useT();
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? groups.filter((g) => g.name.toLowerCase().includes(q))
    : groups;
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display page-title" role="heading" aria-level={1}>
            {t("factionsList.title")}
          </div>
          <span className="list-page__count">
            {groups.length} {t("factionsList.count")}
          </span>
        </div>
        <div className="list-page__header-actions">
          <input
            className="list-page__search"
            placeholder={t("factionsList.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("factionsList.new")}
          </button>
        </div>
      </div>
      <div className="faction-grid">
        {filtered.map((g) => {
          const imageUrl = entityImageUrl(
            "group",
            g.id,
            g.hasImage,
            imageVersion,
          );
          return (
            <Link
              key={g.id}
              className="faction-card"
              route={{ name: "entity-detail", kind: "faction", id: g.id }}
            >
              <span className="faction-card__emblem">
                {imageUrl ? (
                  <img src={imageUrl} alt="" />
                ) : (
                  <Shield size={26} strokeWidth={1.5} />
                )}
              </span>
              <span className="faction-card__body">
                <span className="display faction-card__name">{g.name}</span>
                {g.description && (
                  <span className="faction-card__desc">
                    <MarkdownText inline text={g.description} />
                  </span>
                )}
                <span className="faction-card__members">
                  {g.memberCount} {t("factionsList.members")}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
