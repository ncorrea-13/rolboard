import { useMemo, useState, type CSSProperties } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./NpcList.css";
import {
  secretTone,
  type Location,
  type LoreEntry,
  type Npc,
  type Secret,
  type SecretStatus,
} from "../data/domain";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import { Link } from "../components/Link";
import { excerpt } from "../lib/excerpt";

interface SecretsListProps {
  secrets: Secret[];
  npcs: Npc[];
  locations: Location[];
  loreEntries: LoreEntry[];
  onCreate: () => void;
  onToggle: (secret: Secret) => void;
}

export function SecretsList({
  secrets,
  npcs,
  locations,
  loreEntries,
  onCreate,
  onToggle,
}: SecretsListProps) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SecretStatus | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return secrets.filter(
      (s) =>
        (status === null || s.status === status) &&
        (!q ||
          s.title.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q)),
    );
  }, [secrets, search, status]);

  const hiddenCount = secrets.filter((s) => s.status === "hidden").length;

  return (
    <div className="card npc-list">
      <div className="npc-list__header">
        <div className="display page-title" role="heading" aria-level={1}>
          {t("secretsList.title")}{" "}
          <span className="npc-list__count">
            · {filtered.length} / {secrets.length}
          </span>
        </div>
        <div className="npc-list__actions">
          <input
            className="npc-list__search"
            aria-label={t("secretsList.searchPlaceholder")}
            placeholder={t("secretsList.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("secretsList.new")}
          </button>
        </div>
      </div>

      <div className="npc-list__filters">
        <span className="npc-list__filter-label">
          {t("secretsList.statusFilterLabel")}
        </span>
        {(["hidden", "revealed"] as SecretStatus[]).map((s) => (
          <button
            key={s}
            className={`npc-list__filter-chip${status === s ? " npc-list__filter-chip--active" : ""}`}
            style={{ "--c": secretTone[s] } as CSSProperties}
            onClick={() => setStatus(status === s ? null : s)}
          >
            {t(s === "hidden" ? "secret.hidden" : "secret.revealed")}
            {s === "hidden" ? ` (${hiddenCount})` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="npc-list__empty">{t("secretsList.empty")}</div>
      )}

      <div className="secret-grid">
        {filtered.map((s) => {
          const points = [
            npcs.find((n) => n.id === s.npcId)?.name,
            locations.find((l) => l.id === s.locationId)?.name,
            loreEntries.find((e) => e.id === s.loreEntryId)?.title,
          ]
            .filter(Boolean)
            .join(" · ");
          const known = s.knownByNpcIds
            .map((id) => npcs.find((n) => n.id === id)?.name)
            .filter(Boolean) as string[];
          const hidden = s.status === "hidden";
          const StateIcon = hidden ? EyeOff : Eye;
          return (
            <div
              key={s.id}
              className={`secret-card secret-card--${s.status}`}
              style={{ "--c": secretTone[s.status] } as CSSProperties}
            >
              <Link
                className="secret-card__link"
                route={{ name: "secret-detail", secretId: s.id }}
              >
                <span className="secret-card__state">
                  <StateIcon size={15} strokeWidth={1.75} />
                  {t(hidden ? "secret.hidden" : "secret.revealed")}
                </span>
                <span className="display secret-card__title">{s.title}</span>
                {s.body && (
                  <span className="secret-card__excerpt">
                    <MarkdownText inline text={excerpt(s.body)} />
                  </span>
                )}
                {(points || known.length > 0) && (
                  <span className="secret-card__foot">
                    {points && (
                      <span className="secret-card__points">{points}</span>
                    )}
                    {known.length > 0 && (
                      <span className="secret-card__known">
                        {known.slice(0, 3).map((name) => (
                          <span key={name} className="session-detail__chip">
                            {name}
                          </span>
                        ))}
                        {known.length > 3 && (
                          <span className="secret-card__more">
                            +{known.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                )}
              </Link>
              <button
                type="button"
                className="secret-card__toggle"
                onClick={() => onToggle(s)}
              >
                {t(hidden ? "secretsList.reveal" : "secretsList.hide")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
