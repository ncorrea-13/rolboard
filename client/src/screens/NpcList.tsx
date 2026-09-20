import { useMemo, useState } from "react";
import "./NpcList.css";
import {
  crystalColorFor,
  crystalLabelFor,
  statusLabel,
  type Npc,
  type StatusKind,
} from "../data/domain";
import { EntityIdentity } from "../components/EntityIdentity";
import {
  NpcTypesButton,
  type NpcTypesApi,
} from "../components/NpcTypesManager";
import { StatusPill } from "../components/StatusPill";
import { entityImageUrl } from "../lib/images";
import { useT, useLang } from "../lib/i18n";
import type { CSSProperties } from "react";

const statusFilters: StatusKind[] = ["alive", "dead", "missing", "paused"];

const PAGE_SIZE = 25;

export function NpcList({
  npcs,
  onSelect,
  onCreate,
  npcTypesApi,
  imageVersion = 0,
}: {
  npcs: Npc[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  npcTypesApi: NpcTypesApi;
  imageVersion?: number;
}) {
  const t = useT();
  const lang = useLang();
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [activeStatuses, setActiveStatuses] = useState<Set<StatusKind>>(
    new Set(),
  );
  const [page, setPage] = useState(1);

  const typeFilters = [...new Set(npcs.map((n) => n.crystal))].map(
    (crystal) => ({
      crystal,
      label: crystalLabelFor(crystal, lang),
    }),
  );

  function toggleType(crystal: string) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(crystal)) next.delete(crystal);
      else next.add(crystal);
      return next;
    });
    setPage(1);
  }

  function toggleStatus(status: StatusKind) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return npcs.filter((n) => {
      if (
        q &&
        !n.name.toLowerCase().includes(q) &&
        !n.location.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (activeTypes.size > 0 && !activeTypes.has(n.crystal)) {
        return false;
      }
      if (activeStatuses.size > 0 && !activeStatuses.has(n.status)) {
        return false;
      }
      return true;
    });
  }, [npcs, search, activeTypes, activeStatuses]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="card npc-list">
      <div className="npc-list__header">
        <div className="display" style={{ fontSize: 21 }}>
          NPCs{" "}
          <span className="npc-list__count">
            · {filtered.length} / {npcs.length}
          </span>
        </div>
        <div className="npc-list__actions">
          <input
            className="npc-list__search"
            placeholder={t("npcList.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <NpcTypesButton api={npcTypesApi} />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("npcList.new")}
          </button>
        </div>
      </div>

      <div className="npc-list__filters">
        <span className="npc-list__filter-label">
          {t("npcList.typeFilterLabel")}
        </span>
        {typeFilters.map((f) => (
          <button
            key={f.crystal}
            className={`npc-list__filter-chip${activeTypes.has(f.crystal) ? " npc-list__filter-chip--active" : ""}`}
            style={{ "--c": crystalColorFor(f.crystal) } as CSSProperties}
            onClick={() => toggleType(f.crystal)}
          >
            {f.label}
          </button>
        ))}
        <span className="npc-list__divider" />
        <span className="npc-list__filter-label">
          {t("npcList.statusFilterLabel")}
        </span>
        {statusFilters.map((s) => (
          <button
            key={s}
            className={`npc-list__filter-chip${activeStatuses.has(s) ? " npc-list__filter-chip--active" : ""}`}
            style={{
              color: `var(--status-${s === "paused" ? "paused-text" : s})`,
            }}
            onClick={() => toggleStatus(s)}
          >
            <span
              className="status-dot"
              style={{
                background: `var(--status-${s === "paused" ? "paused-dot" : s})`,
              }}
            />
            {statusLabel[lang][s]}
          </button>
        ))}
      </div>

      <div className="npc-list__row npc-list__row--head">
        <span>{t("npcList.colName")}</span>
        <span>{t("npcList.colType")}</span>
        <span>{t("npcList.colLocation")}</span>
        <span>{t("npcList.colStatus")}</span>
      </div>

      {filtered.length === 0 && (
        <div className="npc-list__empty">{t("npcList.empty")}</div>
      )}

      {paged.map((n) => (
        <div
          key={n.id}
          className="npc-list__row npc-list__row--data"
          onClick={() => onSelect(n.id)}
        >
          <EntityIdentity
            initials={n.initials}
            name={n.name}
            role={n.role}
            color={crystalColorFor(n.crystal)}
            imageUrl={entityImageUrl("npc", n.id, n.hasImage, imageVersion)}
          />
          <span className="npc-list__type">
            <span
              className="type-chip"
              style={{ "--c": crystalColorFor(n.crystal) } as CSSProperties}
            >
              {crystalLabelFor(n.crystal, lang)}
            </span>
          </span>
          <span className="npc-list__cell">{n.location}</span>
          <StatusPill status={n.status} />
        </div>
      ))}

      {pageCount > 1 && (
        <div className="npc-list__pagination">
          <button
            className="btn btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            {t("npcList.prev")}
          </button>
          <span className="npc-list__pagination-label">
            {t("npcList.page")} {currentPage} {t("npcList.of")} {pageCount}
          </span>
          <button
            className="btn btn-secondary"
            disabled={currentPage >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            {t("npcList.next")}
          </button>
        </div>
      )}
    </div>
  );
}
