import { useMemo, useState, type CSSProperties } from "react";
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

interface SecretsListProps {
  secrets: Secret[];
  npcs: Npc[];
  locations: Location[];
  loreEntries: LoreEntry[];
  onCreate: () => void;
}

export function SecretsList({
  secrets,
  npcs,
  locations,
  loreEntries,
  onCreate,
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
        <div className="display" style={{ fontSize: 21 }}>
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

      <div className="npc-list__row npc-list__row--secret npc-list__row--head">
        <span>{t("secretsList.colTitle")}</span>
        <span>{t("secretsList.colStatus")}</span>
        <span>{t("secretsList.colPoints")}</span>
        <span>{t("secretsList.colKnownBy")}</span>
      </div>

      {filtered.length === 0 && (
        <div className="npc-list__empty">{t("secretsList.empty")}</div>
      )}

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
        return (
          <Link
            key={s.id}
            className="npc-list__row npc-list__row--secret npc-list__row--data"
            route={{ name: "secret-detail", secretId: s.id }}
          >
            <div className="npc-list__lore-main">
              <span className="npc-list__lore-title">{s.title}</span>
              {s.body && (
                <div className="npc-list__lore-sub">
                  <MarkdownText inline text={s.body} />
                </div>
              )}
            </div>
            <span className="npc-list__type">
              <span
                className="type-chip"
                style={{ "--c": secretTone[s.status] } as CSSProperties}
              >
                {t(s.status === "hidden" ? "secret.hidden" : "secret.revealed")}
              </span>
            </span>
            <span className="npc-list__cell">{points}</span>
            <span className="npc-list__cell">
              {known.slice(0, 2).join(", ")}
              {known.length > 2 ? ` +${known.length - 2}` : ""}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
