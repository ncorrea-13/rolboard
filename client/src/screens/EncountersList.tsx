import "../styles/list.css";
import { sessionCode, type Encounter, type Session } from "../data/domain";
import { EncounterStatusPill } from "../components/StatusPill";
import { useT } from "../lib/i18n";

interface EncountersListProps {
  encounters: Encounter[];
  sessions: Session[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function EncountersList({
  encounters,
  sessions,
  onSelect,
  onCreate,
}: EncountersListProps) {
  const t = useT();
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>
            {t("encountersList.title")}
          </div>
          <span className="list-page__count">
            {encounters.length} {t("encountersList.count")}
          </span>
        </div>
        <button className="btn btn-primary" onClick={onCreate}>
          {t("encountersList.new")}
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
                  {t("encountersList.round")} {e.round}
                </span>
                <div className="list-page__row-sub" style={{ marginTop: 6 }}>
                  {session
                    ? sessionCode(session)
                    : t("encountersList.noSession")}
                </div>
              </div>
              <EncounterStatusPill status={e.status} />
            </div>
          );
        })}
        {encounters.length === 0 && (
          <span style={{ color: "var(--text-secondary)" }}>
            {t("encountersList.empty")}
          </span>
        )}
      </div>
    </div>
  );
}
