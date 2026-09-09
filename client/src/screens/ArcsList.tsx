import "../styles/list.css";
import { type Arc } from "../data/mock";
import { StatusPill } from "../components/StatusPill";

interface ArcsListProps {
  arcs: Arc[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function ArcsList({ arcs, onSelect, onCreate }: ArcsListProps) {
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>
            Arcos
          </div>
          <span className="list-page__count">{arcs.length} arcos</span>
        </div>
        <button className="btn btn-primary" onClick={onCreate}>
          Nuevo arco
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
              <div className="list-page__row-sub">{a.summary}</div>
            </div>
            <span className="list-page__badge">{a.meta}</span>
            <StatusPill
              status={a.status}
              label={a.status === "alive" ? "En curso" : "Cerrado"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
