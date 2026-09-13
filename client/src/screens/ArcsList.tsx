import "../styles/list.css";
import { type Arc } from "../data/domain";
import { ArcStatusPill } from "../components/StatusPill";
import { useT } from "../lib/i18n";

interface ArcsListProps {
  arcs: Arc[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function ArcsList({ arcs, onSelect, onCreate }: ArcsListProps) {
  const t = useT();
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>
            {t("arcsList.title")}
          </div>
          <span className="list-page__count">{arcs.length} {t("arcsList.count")}</span>
        </div>
        <button className="btn btn-primary" onClick={onCreate}>
          {t("arcsList.new")}
        </button>
      </div>
      <div className="list-page__rows">
        {arcs.map((a) => (
          <div
            key={a.id}
            className="list-page__row list-page__row--clickable"
            onClick={() => onSelect(a.id)}
          >
            <div className="list-page__row-main">
              <div className="list-page__row-title">{a.label}</div>
              <div className="list-page__row-sub list-page__row-sub--clamp-3">{a.summary}</div>
            </div>
            <span className="list-page__badge">{a.meta}</span>
            <ArcStatusPill status={a.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
