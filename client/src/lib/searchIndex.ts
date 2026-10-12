import {
  sessionCode,
  type Arc,
  type Currency,
  type Encounter,
  type Group,
  type Item,
  type Location,
  type LooseNote,
  type LoreEntry,
  type Npc,
  type PlayerCharacter,
  type Quest,
  type Secret,
  type Session,
  type TimelineEvent,
} from "../data/domain";
import type { SearchItem } from "./search";

export interface SearchData {
  npcs: Npc[];
  players: PlayerCharacter[];
  locations: Location[];
  groups: Group[];
  arcs: Arc[];
  quests: Quest[];
  sessions: Session[];
  encounters: Encounter[];
  loreEntries: LoreEntry[];
  secrets: Secret[];
  notes: LooseNote[];
  items: Item[];
  currencies: Currency[];
  timelineEvents: TimelineEvent[];
}

export function buildSearchItems(d: SearchData): SearchItem[] {
  const out: SearchItem[] = [];
  for (const n of d.npcs) {
    if (n.crystal === "referencia") continue;
    out.push({
      key: `npc-${n.id}`,
      kind: "npc",
      title: n.name,
      subtitle: n.role,
      body: n.description,
      route: { name: "npc-detail", npcId: n.id },
    });
  }
  for (const p of d.players) {
    out.push({
      key: `player-${p.id}`,
      kind: "player",
      title: p.characterName,
      subtitle: [p.race, p.class !== "—" ? p.class : ""]
        .filter(Boolean)
        .join(" · "),
      body: `${p.description} ${p.backstory} ${p.progressionNotes}`,
      route: { name: "player-detail", playerId: p.id },
    });
  }
  for (const l of d.locations) {
    out.push({
      key: `location-${l.id}`,
      kind: "location",
      title: l.name,
      body: l.description,
      route: { name: "entity-detail", kind: "location", id: l.id },
    });
  }
  for (const g of d.groups) {
    out.push({
      key: `faction-${g.id}`,
      kind: "faction",
      title: g.name,
      subtitle: g.alineacion,
      body: g.description,
      route: { name: "entity-detail", kind: "faction", id: g.id },
    });
  }
  for (const a of d.arcs) {
    out.push({
      key: `arc-${a.id}`,
      kind: "arc",
      title: a.label,
      body: a.summary,
      route: { name: "entity-detail", kind: "arc", id: a.id },
    });
  }
  for (const q of d.quests) {
    out.push({
      key: `quest-${q.id}`,
      kind: "quest",
      title: q.name,
      body: `${q.hook} ${q.notes}`,
      route: { name: "entity-detail", kind: "quest", id: q.id },
    });
  }
  for (const s of d.sessions) {
    const code = sessionCode(s);
    out.push({
      key: `session-${s.id}`,
      kind: "session",
      title: s.title ? `${code} · ${s.title}` : code,
      subtitle: s.date,
      body: `${s.summary} ${s.prepNotes}`,
      route: { name: "session-detail", sessionId: s.id },
    });
  }
  for (const e of d.encounters) {
    out.push({
      key: `encounter-${e.id}`,
      kind: "encounter",
      title: e.name,
      body: "",
      route: { name: "encounter-detail", encounterId: e.id },
    });
  }
  for (const e of d.loreEntries) {
    out.push({
      key: `lore-${e.id}`,
      kind: "lore",
      title: e.title,
      body: e.body,
      route: { name: "lore-detail", entryId: e.id },
    });
  }
  for (const s of d.secrets) {
    out.push({
      key: `secret-${s.id}`,
      kind: "secret",
      title: s.title,
      body: s.body,
      route: { name: "secret-detail", secretId: s.id },
    });
  }
  for (const n of d.notes) {
    out.push({
      key: `note-${n.id}`,
      kind: "note",
      title: n.title,
      body: n.body,
      route: { name: "note-detail", noteId: n.id },
    });
  }
  for (const i of d.items) {
    out.push({
      key: `item-${i.id}`,
      kind: "item",
      title: i.name,
      subtitle: [i.category, i.rarity].filter(Boolean).join(" · "),
      body: `${i.description} ${i.effect}`,
      route: { name: "section", section: "objetos" },
    });
  }
  for (const c of d.currencies) {
    out.push({
      key: `currency-${c.id}`,
      kind: "currency",
      title: c.name,
      subtitle: c.symbol,
      body: "",
      route: { name: "section", section: "objetos" },
    });
  }
  for (const e of d.timelineEvents) {
    out.push({
      key: `event-${e.id}`,
      kind: "event",
      title: e.title,
      subtitle: e.dateLabel,
      body: e.description,
      route: { name: "section", section: "mundo" },
    });
  }
  return out;
}
