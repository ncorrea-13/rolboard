import { useMemo, useState } from "react";
import "./NpcList.css";
import {
  crystalColorFor,
  statusLabel,
  type Npc,
  type StatusKind,
} from "../data/domain";
import { EntityIdentity } from "../components/EntityIdentity";
import { StatusPill } from "../components/StatusPill";

const statusFilters: StatusKind[] = ["alive", "dead", "missing", "paused"];

const PAGE_SIZE = 25;

export function NpcList({
  npcs,
  onSelect,
  onCreate,
}: {
  npcs: Npc[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [activeStatuses, setActiveStatuses] = useState<Set<StatusKind>>(
    new Set(),
  );
  const [page, setPage] = useState(1);

  const typeFilters = useMemo(() => {
    const seen = new Map<string, string>();
    for (const n of npcs) {
      if (!seen.has(n.crystal)) seen.set(n.crystal, n.crystalLabel);
    }
    return [...seen.entries()].map(([crystal, label]) => ({ crystal, label }));
  }, [npcs]);

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
            placeholder="Buscar nombre, locación…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button className="btn btn-primary" onClick={onCreate}>
            Nuevo NPC
          </button>
        </div>
      </div>

      <div className="npc-list__filters">
        <span className="npc-list__filter-label">TIPO</span>
        {typeFilters.map((f) => (
          <button
            key={f.crystal}
            className={`npc-list__filter-chip${activeTypes.has(f.crystal) ? " npc-list__filter-chip--active" : ""}`}
            onClick={() => toggleType(f.crystal)}
          >
            <span
              className="npc-list__filter-mark"
              style={{ background: crystalColorFor(f.crystal) }}
            />
            {f.label}
          </button>
        ))}
        <span className="npc-list__divider" />
        <span className="npc-list__filter-label">STATUS</span>
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
            {statusLabel[s]}
          </button>
        ))}
      </div>

      <div className="npc-list__row npc-list__row--head">
        <span>Nombre</span>
        <span>Tipo</span>
        <span>Ubicación actual</span>
        <span>Status</span>
      </div>

      {filtered.length === 0 && (
        <div className="npc-list__empty">
          Ningún NPC coincide con el filtro.
        </div>
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
          />
          <span className="npc-list__type">
            <span
              className="npc-list__type-mark"
              style={{ background: crystalColorFor(n.crystal) }}
            />
            {n.crystalLabel}
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
            Anterior
          </button>
          <span className="npc-list__pagination-label">
            Página {currentPage} de {pageCount}
          </span>
          <button
            className="btn btn-secondary"
            disabled={currentPage >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
