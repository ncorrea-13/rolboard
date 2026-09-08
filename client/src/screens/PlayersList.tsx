import "../styles/list.css";
import { playerCharacters } from "../data/mock";

export function PlayersList({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div className="display" style={{ fontSize: 21 }}>Jugadores</div>
        <span className="list-page__count">{playerCharacters.length} personajes</span>
      </div>
      <div className="list-page__rows">
        {playerCharacters.map((p) => (
          <div key={p.id} className="list-page__row list-page__row--clickable" onClick={() => onSelect(p.id)}>
            <div className="list-page__row-main">
              <div className="list-page__row-title">{p.characterName}</div>
              <div className="list-page__row-sub">Jugado por {p.playerName}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
