import { useState } from "react";
import "../styles/list.css";
import { locationTypeLabel, type Location } from "../data/domain";
import { useT, useLang } from "../lib/i18n";
import { entityImageUrl } from "../lib/images";
import { MarkdownText } from "../components/MarkdownText";

function depthOf(loc: Location, all: Location[]): number {
  let depth = 0;
  let current: Location | undefined = loc;
  while (current?.parentId) {
    current = all.find((l) => l.id === current!.parentId);
    depth++;
  }
  return depth;
}

interface LocationsListProps {
  locations: Location[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  imageVersion?: number;
}

export function LocationsList({
  locations,
  onSelect,
  onCreate,
  imageVersion = 0,
}: LocationsListProps) {
  const t = useT();
  const lang = useLang();
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? locations.filter((l) => l.name.toLowerCase().includes(q))
    : locations;
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>
            {t("locationsList.title")}
          </div>
          <span className="list-page__count">
            {locations.length} {t("locationsList.count")}
          </span>
        </div>
        <div className="list-page__header-actions">
          <input
            className="list-page__search"
            placeholder={t("locationsList.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("locationsList.new")}
          </button>
        </div>
      </div>
      <div className="list-page__rows">
        {filtered.map((l) => {
          const imageUrl = entityImageUrl(
            "location",
            l.id,
            l.hasImage,
            imageVersion,
          );
          return (
            <div
              key={l.id}
              className="list-page__row list-page__row--clickable"
              style={{ marginLeft: depthOf(l, locations) * 22 }}
              onClick={() => onSelect(l.id)}
            >
              {imageUrl && (
                <img className="list-page__thumbnail" src={imageUrl} alt="" />
              )}
              <div className="list-page__row-main">
                <span className="title-underline">
                  <span className="list-page__row-title">{l.name}</span>
                  <span
                    className="title-underline__bar"
                    style={{ background: "var(--crystal-location)" }}
                  />
                </span>
                <div className="list-page__row-sub" style={{ marginTop: 6 }}>
                  <MarkdownText inline text={l.description} />
                </div>
              </div>
              <span className="list-page__badge">
                {locationTypeLabel[lang][l.locationType]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
