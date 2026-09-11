import "../styles/list.css";
import { sessionCode, type Encounter, type Session } from "../data/domain";
import { EncounterStatusPill } from "../components/StatusPill";

interface EncountersListProps {
  encounters: Encounter[];
  sessions: Session[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function EncountersList({ encounters, sessions, onSelect, onCreate }: EncountersListProps) {
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>
            Encuentros
          </div>
          <span className="list-page__count">{encounters.length} encuentros</span>
        </div>
        <button className="btn btn-primary" onClick={onCreate}>
          Nuevo encuentro
        </button>
      </div>
      <div className="list-page__rows">
        {encounters.map((e) => {
          const session = sessions.find((s) => s.id === e.sessionId);
          return (
            <div
              key={e.id}
              className="list-page__row list-page__row--clickable"
              onClick={() => onSelect(e.id)}
            >
              <div className="list-page__row-main">
                <span className="list-page__row-title">
                  Ronda {e.round}
                </span>
                <div className="list-page__row-sub" style={{ marginTop: 6 }}>
                  {session ? sessionCode(session) : "Sin sesión asociada"}
                </div>
              </div>
              <EncounterStatusPill status={e.status} />
            </div>
          );
        })}
        {encounters.length === 0 && (
          <span style={{ color: "var(--text-secondary)" }}>
            Sin encuentros todavía.
          </span>
        )}
      </div>
    </div>
  );
}
