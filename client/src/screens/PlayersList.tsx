import "../styles/list.css";
import type { PlayerCharacter } from "../data/domain";
import { useT } from "../lib/i18n";

interface PlayersListProps {
  playerCharacters: PlayerCharacter[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function PlayersList({
  playerCharacters,
  onSelect,
  onCreate,
}: PlayersListProps) {
  const t = useT();
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>
            {t("playersList.title")}
          </div>
          <span className="list-page__count">
            {playerCharacters.length} {t("playersList.count")}
          </span>
        </div>
        <button className="btn btn-primary" onClick={onCreate}>
          {t("playersList.new")}
        </button>
      </div>
      <div className="list-page__rows">
        {playerCharacters.map((p) => (
          <div
            key={p.id}
            className="list-page__row list-page__row--clickable"
            onClick={() => onSelect(p.id)}
          >
            <div className="list-page__row-main">
              <div className="list-page__row-title">{p.characterName}</div>
              <div className="list-page__row-sub">
                {t("playersList.playedBy")} {p.playerName}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
