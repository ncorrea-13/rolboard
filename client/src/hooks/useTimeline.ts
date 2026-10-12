import { useEffect, useEffectEvent, useState } from "react";
import { apiFetch } from "../lib/api";
import { askConfirm } from "../lib/confirm";
import { useT } from "../lib/i18n";
import {
  mapTimeline,
  mapTimelineEvent,
  timelineEventToApiPayload,
  timelineToApiPayload,
  type ApiTimeline,
  type ApiTimelineEvent,
  type TimelineEventValues,
} from "../lib/apiMappers";
import type { Timeline, TimelineEvent } from "../data/domain";

type Notify = (
  message: string,
  type?: "success" | "error",
  err?: unknown,
) => void;

export type TimelineValues = Pick<
  Timeline,
  "name" | "description" | "color" | "startLabel" | "endLabel"
>;

const DEFAULT_COLOR = "#5fa8d3";

export function useTimeline(
  campaignId: string | null,
  reloadKey: number,
  notify: Notify,
) {
  const t = useT();
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  const loadFailed = useEffectEvent((err: unknown) => {
    notify(t("toast.errorLoading"), "error", err);
  });

  useEffect(() => {
    if (!campaignId) return;
    let stale = false;
    apiFetch<ApiTimeline[]>(`/campaigns/${campaignId}/timelines`)
      .then((data) => {
        if (!stale) setTimelines((data ?? []).map(mapTimeline));
      })
      .catch((err) => loadFailed(err));
    apiFetch<ApiTimelineEvent[]>(`/campaigns/${campaignId}/timeline-events`)
      .then((data) => {
        if (!stale) setEvents((data ?? []).map(mapTimelineEvent));
      })
      .catch((err) => loadFailed(err));
    return () => {
      stale = true;
    };
  }, [campaignId, reloadKey]);

  function fail(kind: "toastErrorSaving" | "toastErrorDeleting", err: unknown) {
    notify(`${t(`common.${kind}`)} ${t("common.nounTimeline")}`, "error", err);
    return false;
  }

  async function createTimeline(
    values: TimelineValues,
  ): Promise<Timeline | null> {
    try {
      const created = await apiFetch<ApiTimeline>(
        `/campaigns/${campaignId}/timelines`,
        { method: "POST", body: JSON.stringify(timelineToApiPayload(values)) },
      );
      const timeline = mapTimeline(created);
      setTimelines((prev) => [...prev, timeline]);
      return timeline;
    } catch (err) {
      fail("toastErrorSaving", err);
      return null;
    }
  }

  async function updateTimeline(id: string, values: TimelineValues) {
    try {
      const saved = await apiFetch<ApiTimeline>(`/timelines/${id}`, {
        method: "PUT",
        body: JSON.stringify(timelineToApiPayload(values)),
      });
      setTimelines((prev) =>
        prev.map((x) => (x.id === id ? mapTimeline(saved) : x)),
      );
      return true;
    } catch (err) {
      return fail("toastErrorSaving", err);
    }
  }

  async function deleteTimeline(id: string) {
    if (!(await askConfirm(t("timeline.confirmDeleteTimeline")))) return false;
    try {
      await apiFetch(`/timelines/${id}`, { method: "DELETE" });
      setTimelines((prev) => prev.filter((x) => x.id !== id));
      return true;
    } catch (err) {
      return fail("toastErrorDeleting", err);
    }
  }

  async function saveEvent(id: string | null, values: TimelineEventValues) {
    try {
      let timelineId = values.timelineId;
      if (!timelineId) {
        const created = await createTimeline({
          name: t("timeline.defaultName"),
          description: "",
          color: DEFAULT_COLOR,
          startLabel: "",
          endLabel: "",
        });
        if (!created) return false;
        timelineId = created.id;
      }
      const body = JSON.stringify(
        timelineEventToApiPayload({ ...values, timelineId }),
      );
      if (id) {
        const saved = await apiFetch<ApiTimelineEvent>(
          `/timeline-events/${id}`,
          { method: "PUT", body },
        );
        setEvents((prev) =>
          prev.map((e) => (e.id === id ? mapTimelineEvent(saved) : e)),
        );
      } else {
        const created = await apiFetch<ApiTimelineEvent>(
          `/campaigns/${campaignId}/timeline-events`,
          { method: "POST", body },
        );
        setEvents((prev) => [...prev, mapTimelineEvent(created)]);
      }
      return true;
    } catch (err) {
      return fail("toastErrorSaving", err);
    }
  }

  async function deleteEvent(id: string) {
    if (!(await askConfirm(t("timeline.confirmDeleteEvent")))) return false;
    try {
      await apiFetch(`/timeline-events/${id}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.id !== id));
      return true;
    } catch (err) {
      return fail("toastErrorDeleting", err);
    }
  }

  return {
    timelines,
    timelineEvents: events,
    createTimeline,
    updateTimeline,
    deleteTimeline,
    saveEvent,
    deleteEvent,
  };
}
