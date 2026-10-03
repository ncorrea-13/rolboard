import { useState } from "react";
import "../styles/list.css";
import type { PlayerCharacter } from "../data/domain";
import { useT } from "../lib/i18n";
import { entityImageUrl } from "../lib/images";
import { Link } from "../components/Link";

interface PlayersListProps {
  playerCharacters: PlayerCharacter[];
  onCreate: () => void;
  imageVersion?: number;
}

export function PlayersList({
  playerCharacters,
  onCreate,
  imageVersion = 0,
}: PlayersListProps) {
  const t = useT();
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? playerCharacters.filter(
        (p) =>
          p.characterName.toLowerCase().includes(q) ||
          p.playerName.toLowerCase().includes(q),
      )
    : playerCharacters;
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
        <div className="list-page__header-actions">
          <input
            className="list-page__search"
            placeholder={t("playersList.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("playersList.new")}
          </button>
        </div>
      </div>
      <div className="list-page__rows">
        {filtered.map((p) => {
          const imageUrl = entityImageUrl(
            "player-character",
            p.id,
            p.hasImage,
            imageVersion,
          );
          return (
            <Link
              key={p.id}
              className="list-page__row list-page__row--clickable"
              route={{ name: "player-detail", playerId: p.id }}
            >
              {imageUrl && (
                <img className="list-page__thumbnail" src={imageUrl} alt="" />
              )}
              <div className="list-page__row-main">
                <div className="list-page__row-title">{p.characterName}</div>
                <div className="list-page__row-sub">
                  {t("playersList.playedBy")} {p.playerName}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
