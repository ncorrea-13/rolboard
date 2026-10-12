import type { AppearsGroup } from "../components/AppearsIn";
import {
  sessionCode,
  type Currency,
  type LoreEntry,
  type Npc,
  type Secret,
  type TimelineEvent,
} from "../data/domain";
import type { Appearances } from "../hooks/useAppearances";
import type { TranslationKey } from "./i18n";

export interface AppearsContext {
  npcs: Npc[];
  loreEntries: LoreEntry[];
  timelineEvents: TimelineEvent[];
  secrets: Secret[];
  currencies: Currency[];
}

function eventItem(e: TimelineEvent) {
  return {
    key: `event-${e.id}`,
    label: e.title,
    hint: e.dateLabel || undefined,
    route: { name: "section", section: "mundo" } as const,
  };
}

function secretItem(s: Secret) {
  return {
    key: `secret-${s.id}`,
    label: s.title,
    route: { name: "secret-detail", secretId: s.id } as const,
  };
}

function loreItem(e: LoreEntry) {
  return {
    key: `lore-${e.id}`,
    label: e.title,
    route: { name: "lore-detail", entryId: e.id } as const,
  };
}

export function sessionGroup(
  sessions: Appearances["sessions"],
  title: string,
): AppearsGroup {
  return {
    title,
    items: sessions.map((s) => ({
      key: `session-${s.id}`,
      label: sessionCode(s),
      hint: s.title || undefined,
      route: { name: "session-detail", sessionId: s.id },
    })),
  };
}

export function appearsForLocation(
  locationId: string,
  ctx: AppearsContext,
  t: (key: TranslationKey) => string,
): AppearsGroup[] {
  return [
    {
      title: t("appearsIn.npcsHere"),
      items: ctx.npcs
        .filter((n) => n.locationId === locationId)
        .map((n) => ({
          key: `npc-${n.id}`,
          label: n.name,
          route: { name: "npc-detail", npcId: n.id },
        })),
    },
    {
      title: t("appearsIn.lore"),
      items: ctx.loreEntries
        .filter((e) => e.locationId === locationId)
        .map(loreItem),
    },
    {
      title: t("appearsIn.timeline"),
      items: ctx.timelineEvents
        .filter((e) => e.locationId === locationId)
        .map(eventItem),
    },
    {
      title: t("appearsIn.secrets"),
      items: ctx.secrets
        .filter((s) => s.locationId === locationId)
        .map(secretItem),
    },
    {
      title: t("appearsIn.currencies"),
      items: ctx.currencies
        .filter((c) => c.locationIds.includes(locationId))
        .map((c) => ({
          key: `currency-${c.id}`,
          label: c.name,
          route: { name: "section", section: "objetos" } as const,
        })),
    },
  ];
}

export function appearsForGroup(
  groupId: string,
  ctx: AppearsContext,
  t: (key: TranslationKey) => string,
): AppearsGroup[] {
  return [
    {
      title: t("appearsIn.timeline"),
      items: ctx.timelineEvents
        .filter((e) => e.groupId === groupId)
        .map(eventItem),
    },
  ];
}

export function appearsForLore(
  entryId: string,
  ctx: AppearsContext,
  t: (key: TranslationKey) => string,
): AppearsGroup[] {
  return [
    {
      title: t("appearsIn.timeline"),
      items: ctx.timelineEvents
        .filter((e) => e.loreEntryId === entryId)
        .map(eventItem),
    },
    {
      title: t("appearsIn.secrets"),
      items: ctx.secrets
        .filter((s) => s.loreEntryId === entryId)
        .map(secretItem),
    },
  ];
}
