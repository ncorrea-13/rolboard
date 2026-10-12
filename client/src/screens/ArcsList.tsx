import { useState, type CSSProperties } from "react";
import "../styles/list.css";
import { arcStatusColor, type Arc } from "../data/domain";
import { entityImageUrl } from "../lib/images";
import { ArcStatusPill } from "../components/StatusPill";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import { Link } from "../components/Link";

interface ArcsListProps {
  arcs: Arc[];
  onCreate: () => void;
  imageVersion?: number;
}

export function ArcsList({ arcs, onCreate, imageVersion = 0 }: ArcsListProps) {
  const t = useT();
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? arcs.filter((a) => a.label.toLowerCase().includes(q))
    : arcs;
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display page-title" role="heading" aria-level={1}>
            {t("arcsList.title")}
          </div>
          <span className="list-page__count">
            {arcs.length} {t("arcsList.count")}
          </span>
        </div>
        <div className="list-page__header-actions">
          <input
            className="list-page__search"
            placeholder={t("arcsList.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("arcsList.new")}
          </button>
        </div>
      </div>
      <div className="list-page__rows arc-path">
        {filtered.map((a) => (
          <Link
            key={a.id}
            className="list-page__row list-page__row--clickable arc-row"
            style={{ "--c": arcStatusColor[a.status] } as CSSProperties}
            route={{ name: "entity-detail", kind: "arc", id: a.id }}
          >
            {a.hasImage && (
              <img
                className="list-page__thumbnail"
                src={entityImageUrl("arc", a.id, a.hasImage, imageVersion)}
                alt=""
              />
            )}
            <div className="list-page__row-main">
              <div className="display arc-row__title">{a.label}</div>
              <div className="list-page__row-sub list-page__row-sub--clamp-3">
                <MarkdownText inline text={a.summary} />
              </div>
            </div>
            {a.meta && <span className="list-page__badge">{a.meta}</span>}
            <ArcStatusPill status={a.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
