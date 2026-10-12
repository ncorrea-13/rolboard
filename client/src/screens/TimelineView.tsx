import { useMemo, useState, type CSSProperties } from "react";
import "./NpcList.css";
import "./TimelineView.css";
import {
  locationBreadcrumb,
  sessionCode,
  type Arc,
  type Group,
  type Location,
  type LoreEntry,
  type Session,
  type Timeline,
  type TimelineEvent,
} from "../data/domain";
import type { TimelineEventValues } from "../lib/apiMappers";
import type { TimelineValues } from "../hooks/useTimeline";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import { TimelineManager } from "./TimelineManager";
import { TimelineEventModal } from "./TimelineEventModal";

interface TimelineViewProps {
  timelines: Timeline[];
  events: TimelineEvent[];
  arcs: Arc[];
  sessions: Session[];
  locations: Location[];
  groups: Group[];
  loreEntries: LoreEntry[];
  onCreateTimeline: (values: TimelineValues) => Promise<Timeline | null>;
  onUpdateTimeline: (id: string, values: TimelineValues) => Promise<boolean>;
  onDeleteTimeline: (id: string) => Promise<boolean>;
  onSaveEvent: (
    id: string | null,
    values: TimelineEventValues,
  ) => Promise<boolean>;
  onDeleteEvent: (id: string) => Promise<boolean>;
}

function descendantIds(rootId: string, locations: Location[]): Set<string> {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const l of locations) {
      if (l.parentId && ids.has(l.parentId) && !ids.has(l.id)) {
        ids.add(l.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function TimelineView({
  timelines,
  events,
  arcs,
  sessions,
  locations,
  groups,
  loreEntries,
  onCreateTimeline,
  onUpdateTimeline,
  onDeleteTimeline,
  onSaveEvent,
  onDeleteEvent,
}: TimelineViewProps) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [activeTimelines, setActiveTimelines] = useState<Set<string>>(
    new Set(),
  );
  const [groupId, setGroupId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<TimelineEvent | "new" | null>(null);

  function toggleTimeline(id: string) {
    setActiveTimelines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const locationIds = locationId
      ? descendantIds(locationId, locations)
      : null;
    return events
      .filter((e) => {
        if (activeTimelines.size > 0 && !activeTimelines.has(e.timelineId))
          return false;
        if (groupId && e.groupId !== groupId) return false;
        if (locationIds && !(e.locationId && locationIds.has(e.locationId)))
          return false;
        if (
          q &&
          !e.title.toLowerCase().includes(q) &&
          !e.description.toLowerCase().includes(q) &&
          !e.dateLabel.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => a.sortKey - b.sortKey || Number(a.id) - Number(b.id));
  }, [events, search, activeTimelines, groupId, locationId, locations]);

  const hasFilters =
    search !== "" || activeTimelines.size > 0 || groupId || locationId;

  function clearFilters() {
    setSearch("");
    setActiveTimelines(new Set());
    setGroupId("");
    setLocationId("");
  }

  return (
    <div className="card npc-list">
      <div className="npc-list__header">
        <div className="display" style={{ fontSize: 21 }}>
          {t("timeline.title")}{" "}
          <span className="npc-list__count">
            · {filtered.length} / {events.length}
          </span>
        </div>
        <div className="npc-list__actions">
          <input
            className="npc-list__search"
            placeholder={t("timeline.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            onClick={() => setManaging(true)}
          >
            {t("timeline.manage")}
          </button>
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            {t("timeline.newEvent")}
          </button>
        </div>
      </div>

      <div className="npc-list__filters">
        {timelines.length > 0 && (
          <>
            <span className="npc-list__filter-label">
              {t("timeline.timeline").toUpperCase()}
            </span>
            {timelines.map((tl) => (
              <button
                key={tl.id}
                className={`npc-list__filter-chip${activeTimelines.has(tl.id) ? " npc-list__filter-chip--active" : ""}`}
                style={{ "--c": tl.color } as CSSProperties}
                onClick={() => toggleTimeline(tl.id)}
              >
                {tl.name}
              </button>
            ))}
            <span className="npc-list__divider" />
          </>
        )}
        <select
          className="tl-filter"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        >
          <option value="">{t("timeline.allFactions")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          className="tl-filter"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">{t("timeline.allLocations")}</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {locationBreadcrumb(l, locations)}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button className="tl-clear" onClick={clearFilters}>
            {t("timeline.clearFilters")}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="npc-list__empty">
          {events.length === 0 ? t("timeline.empty") : t("timeline.noMatches")}
        </div>
      ) : (
        <ol className="tl">
          {filtered.map((e) => {
            const timeline = timelines.find((x) => x.id === e.timelineId);
            const color = timeline?.color ?? "var(--text-secondary)";
            const arc = arcs.find((a) => a.id === e.arcId);
            const session = sessions.find((s) => s.id === e.sessionId);
            const location = locations.find((l) => l.id === e.locationId);
            const group = groups.find((g) => g.id === e.groupId);
            const lore = loreEntries.find((l) => l.id === e.loreEntryId);
            const chips = [
              arc && arc.label,
              session && sessionCode(session),
              location && location.name,
              group && group.name,
              lore && lore.title,
            ].filter(Boolean) as string[];
            return (
              <li
                key={e.id}
                className="tl__item"
                style={{ "--c": color } as CSSProperties}
              >
                <div className="tl__date">
                  <span>{e.dateLabel || "—"}</span>
                  {e.endDateLabel && (
                    <span className="tl__date-end">→ {e.endDateLabel}</span>
                  )}
                </div>
                <div className="tl__rail">
                  <span className="tl__dot" />
                </div>
                <button
                  type="button"
                  className="tl__card"
                  onClick={() => setEditing(e)}
                >
                  <span className="tl__card-head">
                    <span className="tl__title">{e.title}</span>
                    {timeline && (
                      <span
                        className="type-chip"
                        style={{ "--c": color } as CSSProperties}
                      >
                        {timeline.name}
                      </span>
                    )}
                  </span>
                  {e.description && (
                    <MarkdownText className="tl__desc" text={e.description} />
                  )}
                  {chips.length > 0 && (
                    <span className="tl__chips">
                      {chips.map((c, i) => (
                        <span key={i} className="npc-detail__appearance-chip">
                          {c}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {managing && (
        <TimelineManager
          timelines={timelines}
          onCreate={onCreateTimeline}
          onUpdate={onUpdateTimeline}
          onDelete={onDeleteTimeline}
          onClose={() => setManaging(false)}
        />
      )}

      {editing && (
        <TimelineEventModal
          key={editing === "new" ? "new" : editing.id}
          event={editing === "new" ? null : editing}
          defaultTimelineId={
            activeTimelines.size === 1
              ? [...activeTimelines][0]
              : (timelines[0]?.id ?? "")
          }
          timelines={timelines}
          arcs={arcs}
          sessions={sessions}
          locations={locations}
          groups={groups}
          loreEntries={loreEntries}
          onSave={(values) =>
            onSaveEvent(editing === "new" ? null : editing.id, values)
          }
          onDelete={
            editing === "new"
              ? undefined
              : async () => {
                  if (await onDeleteEvent(editing.id)) setEditing(null);
                }
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
