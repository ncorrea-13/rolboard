import "../styles/list.css";
import { locationTypeLabel, type Location } from "../data/mock";

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
}

export function LocationsList({
  locations,
  onSelect,
  onCreate,
}: LocationsListProps) {
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>
            Locaciones
          </div>
          <span className="list-page__count">
            {locations.length} locaciones
          </span>
        </div>
        <button className="btn btn-primary" onClick={onCreate}>
          Nueva locación
        </button>
      </div>
      <div className="list-page__rows">
        {locations.map((l) => (
          <div
            key={l.id}
            className="list-page__row list-page__row--clickable"
            style={{ marginLeft: depthOf(l, locations) * 22 }}
            onClick={() => onSelect(l.id)}
          >
            <div className="list-page__row-main">
              <span className="title-underline">
                <span className="list-page__row-title">{l.name}</span>
                <span
                  className="title-underline__bar"
                  style={{ background: "var(--crystal-location)" }}
                />
              </span>
              <div className="list-page__row-sub" style={{ marginTop: 6 }}>
                {l.description}
              </div>
            </div>
            <span className="list-page__badge">
              {locationTypeLabel[l.locationType]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
