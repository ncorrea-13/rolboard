import { useState, type CSSProperties } from "react";
import "../styles/list.css";
import { statusColor, type PlayerCharacter } from "../data/domain";
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
          <div className="display page-title" role="heading" aria-level={1}>
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
      <div className="player-grid">
        {filtered.map((p) => {
          const imageUrl = entityImageUrl(
            "player-character",
            p.id,
            p.hasImage,
            imageVersion,
          );
          const hpPct =
            p.currentHp != null && p.maxHp
              ? Math.max(0, Math.min(100, (p.currentHp / p.maxHp) * 100))
              : null;
          return (
            <Link
              key={p.id}
              className="player-card"
              style={{ "--c": statusColor[p.status] } as CSSProperties}
              route={{ name: "player-detail", playerId: p.id }}
            >
              <span className="player-card__portrait">
                {imageUrl ? (
                  <img src={imageUrl} alt="" />
                ) : (
                  <span>{p.characterName.slice(0, 2).toUpperCase()}</span>
                )}
              </span>
              <span className="player-card__body">
                <span className="player-card__name">{p.characterName}</span>
                <span className="player-card__sub">
                  {t("playersList.playedBy")} {p.playerName}
                </span>
                {hpPct !== null && (
                  <span className="player-card__hp">
                    <span className="player-card__hp-track">
                      <span
                        className="player-card__hp-fill"
                        style={{
                          width: `${hpPct}%`,
                          background:
                            hpPct > 60
                              ? "var(--status-alive)"
                              : hpPct > 30
                                ? "var(--accent-flame)"
                                : "var(--status-dead)",
                        }}
                      />
                    </span>
                    <span className="player-card__hp-label">
                      {p.currentHp}/{p.maxHp}
                    </span>
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
