import { useState } from "react";
import "./NpcEdit.css";
import { Modal } from "../components/Modal";
import { MarkdownField } from "../components/MarkdownField";
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
import { useT } from "../lib/i18n";

interface TimelineEventModalProps {
  event: TimelineEvent | null;
  defaultTimelineId: string;
  timelines: Timeline[];
  arcs: Arc[];
  sessions: Session[];
  locations: Location[];
  groups: Group[];
  loreEntries: LoreEntry[];
  onSave: (values: TimelineEventValues) => Promise<boolean>;
  onDelete?: () => void;
  onClose: () => void;
}

export function TimelineEventModal({
  event,
  defaultTimelineId,
  timelines,
  arcs,
  sessions,
  locations,
  groups,
  loreEntries,
  onSave,
  onDelete,
  onClose,
}: TimelineEventModalProps) {
  const t = useT();
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [timelineId, setTimelineId] = useState(
    event?.timelineId ?? defaultTimelineId,
  );
  const [dateLabel, setDateLabel] = useState(event?.dateLabel ?? "");
  const [endDateLabel, setEndDateLabel] = useState(event?.endDateLabel ?? "");
  const [sortKey, setSortKey] = useState(String(event?.sortKey ?? 0));
  const [arcId, setArcId] = useState(event?.arcId ?? "");
  const [sessionId, setSessionId] = useState(event?.sessionId ?? "");
  const [locationId, setLocationId] = useState(event?.locationId ?? "");
  const [groupId, setGroupId] = useState(event?.groupId ?? "");
  const [loreEntryId, setLoreEntryId] = useState(event?.loreEntryId ?? "");
  const [saving, setSaving] = useState(false);

  const parsedKey = Number(sortKey.replace(",", "."));
  const keyValid = sortKey.trim() !== "" && Number.isFinite(parsedKey);
  const canSave = title.trim() !== "" && keyValid && !saving;

  async function save() {
    setSaving(true);
    const ok = await onSave({
      timelineId,
      title: title.trim(),
      description,
      dateLabel: dateLabel.trim(),
      endDateLabel: endDateLabel.trim(),
      sortKey: parsedKey,
      arcId: arcId || undefined,
      sessionId: sessionId || undefined,
      locationId: locationId || undefined,
      groupId: groupId || undefined,
      loreEntryId: loreEntryId || undefined,
    });
    setSaving(false);
    if (ok) onClose();
  }

  function select(
    value: string,
    set: (v: string) => void,
    empty: string,
    options: { id: string; label: string }[],
  ) {
    return (
      <select
        className="npc-edit__select npc-edit__select--native"
        value={value}
        onChange={(e) => set(e.target.value)}
      >
        <option value="">{empty}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Modal
      title={event ? t("timeline.editEvent") : t("timeline.newEvent")}
      onClose={onClose}
      size="sheet"
    >
      <div>
        <span className="label">{t("timeline.eventTitle")}</span>
        <input
          className="npc-edit__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      {timelines.length > 0 && (
        <div>
          <span className="label">{t("timeline.timeline")}</span>
          {select(
            timelineId,
            setTimelineId,
            t("timeline.noTimelineYet"),
            timelines.map((x) => ({ id: x.id, label: x.name })),
          )}
        </div>
      )}
      <div className="npc-edit__grid-2">
        <div>
          <span className="label">{t("timeline.dateLabel")}</span>
          <input
            className="npc-edit__input"
            value={dateLabel}
            placeholder={t("timeline.datePlaceholder")}
            onChange={(e) => setDateLabel(e.target.value)}
          />
        </div>
        <div>
          <span className="label">{t("timeline.endDateLabel")}</span>
          <input
            className="npc-edit__input"
            value={endDateLabel}
            onChange={(e) => setEndDateLabel(e.target.value)}
          />
        </div>
      </div>
      <div>
        <span className="label">{t("timeline.sortKey")}</span>
        <input
          className="npc-edit__input"
          inputMode="decimal"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
        />
        <div className="npc-edit__hint">{t("timeline.sortKeyHint")}</div>
      </div>
      <MarkdownField
        label={`${t("common.description")} ${t("common.supportsMarkdown")}`}
        minHeight={120}
        value={description}
        onChange={setDescription}
      />
      <div className="npc-edit__grid-2">
        <div>
          <span className="label">{t("loreEdit.arc")}</span>
          {select(
            arcId,
            setArcId,
            t("sessionsTimeline.noArc"),
            arcs.map((a) => ({ id: a.id, label: a.label })),
          )}
        </div>
        <div>
          <span className="label">{t("timeline.session")}</span>
          {select(
            sessionId,
            setSessionId,
            t("timeline.none"),
            sessions.map((s) => ({
              id: s.id,
              label: `${sessionCode(s)}${s.title ? ` · ${s.title}` : ""}`,
            })),
          )}
        </div>
        <div>
          <span className="label">{t("loreEdit.location")}</span>
          {select(
            locationId,
            setLocationId,
            t("npcEdit.noLocation"),
            locations.map((l) => ({
              id: l.id,
              label: locationBreadcrumb(l, locations),
            })),
          )}
        </div>
        <div>
          <span className="label">{t("timeline.faction")}</span>
          {select(
            groupId,
            setGroupId,
            t("timeline.none"),
            groups.map((g) => ({ id: g.id, label: g.name })),
          )}
        </div>
      </div>
      <div>
        <span className="label">{t("timeline.loreEntry")}</span>
        {select(
          loreEntryId,
          setLoreEntryId,
          t("timeline.none"),
          loreEntries.map((e) => ({ id: e.id, label: e.title })),
        )}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <div>
          {onDelete && (
            <button className="btn btn-danger-outline" onClick={onDelete}>
              {t("entityDetail.deactivate")}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => void save()}
            disabled={!canSave}
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
