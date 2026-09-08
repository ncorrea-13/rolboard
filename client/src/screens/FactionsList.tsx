import "../styles/list.css";
import { groups } from "../data/mock";

export function FactionsList({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div className="display" style={{ fontSize: 21 }}>Facciones</div>
        <span className="list-page__count">{groups.length} facciones</span>
      </div>
      <div className="list-page__rows">
        {groups.map((g) => (
          <div key={g.id} className="list-page__row list-page__row--clickable" onClick={() => onSelect(g.id)}>
            <div className="list-page__row-main">
              <span className="title-underline">
                <span className="list-page__row-title">{g.name}</span>
                <span className="title-underline__bar" style={{ background: "var(--crystal-faction-quest)" }} />
              </span>
              <div className="list-page__row-sub" style={{ marginTop: 6 }}>{g.description}</div>
            </div>
            <span className="list-page__badge">{g.memberCount} miembros</span>
          </div>
        ))}
      </div>
    </div>
  );
}
