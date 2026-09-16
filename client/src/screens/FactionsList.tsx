import { useState } from "react";
import "../styles/list.css";
import type { Group } from "../data/domain";
import { useT } from "../lib/i18n";
import { entityImageUrl } from "../lib/images";

interface FactionsListProps {
  groups: Group[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  imageVersion?: number;
}

export function FactionsList({
  groups,
  onSelect,
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
          <div className="display" style={{ fontSize: 21 }}>
            {t("factionsList.title")}
          </div>
          <span className="list-page__count">{groups.length} {t("factionsList.count")}</span>
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
      <div className="list-page__rows">
        {filtered.map((g) => {
          const imageUrl = entityImageUrl("group", g.id, g.hasImage, imageVersion);
          return (
          <div
            key={g.id}
            className="list-page__row list-page__row--clickable"
            onClick={() => onSelect(g.id)}
          >
            {imageUrl && (
              <img className="list-page__thumbnail" src={imageUrl} alt="" />
            )}
            <div className="list-page__row-main">
              <span className="title-underline">
                <span className="list-page__row-title">{g.name}</span>
                <span
                  className="title-underline__bar"
                  style={{ background: "var(--crystal-faction-quest)" }}
                />
              </span>
              <div className="list-page__row-sub" style={{ marginTop: 6 }}>
                {g.description}
              </div>
            </div>
            <span className="list-page__badge">{g.memberCount} {t("factionsList.members")}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
}
