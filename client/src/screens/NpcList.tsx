import { useMemo, useState } from "react";
import "./NpcList.css";
import {
  crystalColor,
  statusLabel,
  type CrystalType,
  type Npc,
  type StatusKind,
} from "../data/mock";
import { EntityIdentity } from "../components/EntityIdentity";
import { StatusPill } from "../components/StatusPill";

const typeFilters: {
  label: string;
  crystal: CrystalType;
  matches: (n: Npc) => boolean;
}[] = [
  { label: "NPC", crystal: "npc", matches: (n) => n.crystal === "npc" },
  {
    label: "Spren / cognitiva",
    crystal: "spren",
    matches: (n) => n.crystal === "spren",
  },
];

const statusFilters: StatusKind[] = ["alive", "dead", "missing", "paused"];

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

  function toggleType(label: string) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function toggleStatus(status: StatusKind) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return npcs.filter((n) => {
      if (
        q &&
        !n.name.toLowerCase().includes(q) &&
        !n.faction.toLowerCase().includes(q) &&
        !n.location.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (activeTypes.size > 0) {
        const matchesType = typeFilters.some(
          (f) => activeTypes.has(f.label) && f.matches(n),
        );
        if (!matchesType) return false;
      }
      if (activeStatuses.size > 0 && !activeStatuses.has(n.status)) {
        return false;
      }
      return true;
    });
  }, [npcs, search, activeTypes, activeStatuses]);

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
            placeholder="Buscar nombre, facción, locación…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            key={f.label}
            className={`npc-list__filter-chip${activeTypes.has(f.label) ? " npc-list__filter-chip--active" : ""}`}
            onClick={() => toggleType(f.label)}
          >
            <span
              className="npc-list__filter-mark"
              style={{ background: crystalColor[f.crystal] }}
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
        <span>Facción</span>
        <span>Status</span>
      </div>

      {filtered.length === 0 && (
        <div className="npc-list__empty">
          Ningún NPC coincide con el filtro.
        </div>
      )}

      {filtered.map((n) => (
        <div
          key={n.id}
          className="npc-list__row npc-list__row--data"
          onClick={() => onSelect(n.id)}
        >
          <EntityIdentity
            initials={n.initials}
            name={n.name}
            role={n.role}
            color={crystalColor[n.crystal]}
          />
          <span className="npc-list__type">
            <span
              className="npc-list__type-mark"
              style={{ background: crystalColor[n.crystal] }}
            />
            {n.crystalLabel}
          </span>
          <span className="npc-list__cell">{n.location}</span>
          <span className="npc-list__cell">{n.faction}</span>
          <StatusPill status={n.status} />
        </div>
      ))}
    </div>
  );
}
