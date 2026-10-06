import { useState } from "react";
import "../styles/list.css";
import "./NpcList.css";
import {
  encounterStatusColor,
  encounterStatusLabel,
  sessionCode,
  type Encounter,
  type EncounterStatus,
  type Session,
} from "../data/domain";
import { EncounterStatusPill } from "../components/StatusPill";
import { useLang, useT } from "../lib/i18n";
import { Link } from "../components/Link";

const statusFilters: EncounterStatus[] = ["planificado", "activo", "cerrado"];

interface EncountersListProps {
  encounters: Encounter[];
  sessions: Session[];
  onCreate: () => void;
}

export function EncountersList({
  encounters,
  sessions,
  onCreate,
}: EncountersListProps) {
  const t = useT();
  const lang = useLang();
  const [search, setSearch] = useState("");
  const [activeStatuses, setActiveStatuses] = useState<Set<EncounterStatus>>(
    new Set(),
  );
  const [sessionId, setSessionId] = useState("");

  function label(e: Encounter) {
    return e.name || `${t("encountersList.unnamed")} #${e.id}`;
  }

  function toggleStatus(s: EncounterStatus) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const q = search.trim().toLowerCase();
  const filtered = encounters.filter(
    (e) =>
      (!q || label(e).toLowerCase().includes(q)) &&
      (activeStatuses.size === 0 || activeStatuses.has(e.status)) &&
      (!sessionId || e.sessionId === sessionId),
  );

  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>
            {t("encountersList.title")}
          </div>
          <span className="list-page__count">
            {filtered.length} / {encounters.length} {t("encountersList.count")}
          </span>
        </div>
        <div className="list-page__header-actions">
          <input
            className="list-page__search"
            placeholder={t("encountersList.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("encountersList.new")}
          </button>
        </div>
      </div>
      <div className="npc-list__filters">
        <span className="npc-list__filter-label">
          {t("npcList.statusFilterLabel")}
        </span>
        {statusFilters.map((s) => (
          <button
            key={s}
            className={`npc-list__filter-chip${activeStatuses.has(s) ? " npc-list__filter-chip--active" : ""}`}
            style={{ color: encounterStatusColor[s] }}
            onClick={() => toggleStatus(s)}
          >
            <span
              className="status-dot"
              style={{ background: encounterStatusColor[s] }}
            />
            {encounterStatusLabel[lang][s]}
          </button>
        ))}
        <span className="npc-list__divider" />
        <select
          className={`npc-list__filter-chip${sessionId ? " npc-list__filter-chip--active" : ""}`}
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        >
          <option value="">{t("encountersList.allSessions")}</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {sessionCode(s)}
            </option>
          ))}
        </select>
      </div>
      <div className="list-page__rows">
        {filtered.map((e) => {
          const session = sessions.find((s) => s.id === e.sessionId);
          return (
            <Link
              key={e.id}
              className="list-page__row list-page__row--clickable"
              route={{ name: "encounter-detail", encounterId: e.id }}
            >
              <div className="list-page__row-main">
                <span className="list-page__row-title">{label(e)}</span>
                <div className="list-page__row-sub" style={{ marginTop: 6 }}>
                  {session
                    ? sessionCode(session)
                    : t("encountersList.noSession")}{" "}
                  · {t("encountersList.round")} {e.round}
                </div>
              </div>
              <EncounterStatusPill status={e.status} />
            </Link>
          );
        })}
        {encounters.length === 0 && (
          <span style={{ color: "var(--text-secondary)" }}>
            {t("encountersList.empty")}
          </span>
        )}
        {encounters.length > 0 && filtered.length === 0 && (
          <span style={{ color: "var(--text-secondary)" }}>
            {t("encountersList.noMatches")}
          </span>
        )}
      </div>
    </div>
  );
}
