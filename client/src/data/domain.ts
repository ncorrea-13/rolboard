import { getLang, type Lang } from "../lib/i18n";

export type CrystalType =
  "npc" | "spren" | "location" | "faction-quest" | "entidad-cognitiva";
export type StatusKind = "alive" | "missing" | "dead" | "paused";

export const crystalColor: Record<CrystalType, string> = {
  npc: "var(--crystal-npc)",
  spren: "var(--crystal-spren)",
  location: "var(--crystal-location)",
  "faction-quest": "var(--crystal-faction-quest)",
  "entidad-cognitiva": "var(--crystal-entidad-cognitiva)",
};

export const crystalLabel: Record<Lang, Record<CrystalType, string>> = {
  es: {
    npc: "Humano",
    spren: "Spren",
    location: "Locación",
    "faction-quest": "Facción",
    "entidad-cognitiva": "Ent. cognitiva",
  },
  en: {
    npc: "Human",
    spren: "Spren",
    location: "Location",
    "faction-quest": "Faction",
    "entidad-cognitiva": "Cog. entity",
  },
};

const fallbackPalette = [
  "var(--crystal-fallback-1)",
  "var(--crystal-fallback-2)",
  "var(--crystal-fallback-3)",
  "var(--crystal-fallback-4)",
  "var(--crystal-fallback-5)",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** A per-campaign NPC category. `key` is what NPCs store in `npc_kind` and the vault writes in `tipo`. */
export interface NpcType {
  id: string;
  key: string;
  label: string;
  color: string;
  position: number;
}

// The campaign's NPC types, keyed by `key`. crystalColorFor/crystalLabelFor read it so any component
// can resolve an NPC's type without threading the list through every prop; useCampaignData keeps it in sync.
let npcTypeRegistry = new Map<string, NpcType>();

export function setNpcTypeRegistry(types: NpcType[]) {
  npcTypeRegistry = new Map(types.map((t) => [t.key, t]));
}

export function crystalColorFor(crystal: string): string {
  return (
    npcTypeRegistry.get(crystal)?.color ??
    crystalColor[crystal as CrystalType] ??
    fallbackPalette[hashString(crystal) % fallbackPalette.length]
  );
}

export function crystalLabelFor(
  crystal: string,
  lang: Lang = getLang(),
): string {
  return (
    npcTypeRegistry.get(crystal)?.label ??
    crystalLabel[lang][crystal as CrystalType] ??
    crystal.charAt(0).toUpperCase() + crystal.slice(1)
  );
}

export const statusColor: Record<StatusKind, string> = {
  alive: "var(--status-alive)",
  missing: "var(--status-missing)",
  dead: "var(--status-dead)",
  paused: "var(--status-paused-text)",
};

export const statusDotColor: Record<StatusKind, string> = {
  ...statusColor,
  paused: "var(--status-paused-dot)",
};

export const statusLabel: Record<Lang, Record<StatusKind, string>> = {
  es: {
    alive: "Vivo",
    missing: "Desaparecido",
    dead: "Muerto",
    paused: "En pausa",
  },
  en: {
    alive: "Alive",
    missing: "Missing",
    dead: "Dead",
    paused: "Paused",
  },
};

export type CampaignStatus = "active" | "paused" | "finished";

export type ArcStatus = "planificado" | "en_curso" | "cerrado";

export const arcStatusColor: Record<ArcStatus, string> = {
  planificado: "var(--text-secondary)",
  en_curso: "var(--status-alive)",
  cerrado: "var(--status-dead)",
};

export const arcStatusLabel: Record<Lang, Record<ArcStatus, string>> = {
  es: {
    planificado: "Planificado",
    en_curso: "En curso",
    cerrado: "Cerrado",
  },
  en: {
    planificado: "Planned",
    en_curso: "In progress",
    cerrado: "Closed",
  },
};

export const campaignStatusColor: Record<CampaignStatus, string> = {
  active: "var(--status-alive)",
  paused: "var(--status-paused-text)",
  finished: "var(--text-secondary)",
};

export const campaignStatusDotColor: Record<CampaignStatus, string> = {
  ...campaignStatusColor,
  paused: "var(--status-paused-dot)",
};

export const campaignStatusLabel: Record<
  Lang,
  Record<CampaignStatus, string>
> = {
  es: {
    active: "Activa",
    paused: "En pausa",
    finished: "Finalizada",
  },
  en: {
    active: "Active",
    paused: "Paused",
    finished: "Finished",
  },
};

export interface Campaign {
  id: string;
  name: string;
  system: string;
  status: CampaignStatus;
  vaultPath: string;
  meta: string;
  last: string;
}

export type QuestStatus = "active" | "completed" | "failed" | "on_hold";

export const questStatusColor: Record<QuestStatus, string> = {
  active: "var(--status-alive)",
  completed: "var(--text-secondary)",
  failed: "var(--status-dead)",
  on_hold: "var(--status-missing)",
};

export const questStatusLabel: Record<Lang, Record<QuestStatus, string>> = {
  es: {
    active: "Activa",
    completed: "Completada",
    failed: "Fallida",
    on_hold: "En pausa",
  },
  en: {
    active: "Active",
    completed: "Completed",
    failed: "Failed",
    on_hold: "On hold",
  },
};

export interface Quest {
  id: string;
  deletedAt?: string;
  campaignId: string;
  name: string;
  hook: string;
  crystal: CrystalType;
  status: QuestStatus;
  priority: 1 | 2 | 3;
  notes: string;
}

export interface Group {
  id: string;
  deletedAt?: string;
  campaignId: string;
  name: string;
  description: string;
  alineacion: string;
  liderNpcId?: string;
  memberCount: number;
  obsidianPath: string;
  hasImage?: boolean;
}

export interface Location {
  id: string;
  deletedAt?: string;
  campaignId: string;
  name: string;
  locationType: "planet" | "region" | "city" | "site" | "plane";
  parentId?: string;
  description: string;
  obsidianPath: string;
  hasImage?: boolean;
}

export function locationBreadcrumb(loc: Location, all: Location[]): string {
  const parent = loc.parentId
    ? all.find((l) => l.id === loc.parentId)
    : undefined;
  if (
    !parent ||
    parent.locationType === "planet" ||
    parent.locationType === "region"
  )
    return loc.name;
  return `${parent.name} · ${loc.name}`;
}

export const locationTypeLabel: Record<
  Lang,
  Record<Location["locationType"], string>
> = {
  es: {
    planet: "Planeta",
    region: "Región",
    city: "Ciudad",
    site: "Sitio",
    plane: "Plano",
  },
  en: {
    planet: "Planet",
    region: "Region",
    city: "City",
    site: "Site",
    plane: "Plane",
  },
};

export interface Npc {
  id: string;
  deletedAt?: string;
  campaignId: string;
  name: string;
  role: string;
  etnia?: string;
  tipoSpren?: string;
  description: string;
  /** The NPC type key (npc_kind). */
  crystal: string;
  status: StatusKind;
  statusNote?: string;
  detailLevel: "full" | "minor";
  location: string;
  locationId?: string;
  initials: string;
  obsidianPath: string;
  appearances?: string[];
  relatedQuestIds?: string[];
  attributes: StatMap;
  skills: StatMap;
  hasImage?: boolean;
}

export interface PlayerCharacter {
  id: string;
  deletedAt?: string;
  campaignId: string;
  playerName: string;
  characterName: string;
  race: string;
  class: string;
  status: StatusKind;
  backstory: string;
  progressionNotes: string;
  obsidianPath: string;
  historiaPath?: string;
  avancesPath?: string;
  attributes: StatMap;
  skills: StatMap;
  currentHp?: number;
  maxHp?: number;
  hasImage?: boolean;
}

export type SessionType = "session" | "interlude" | "planning";

export interface Session {
  id: string;
  deletedAt?: string;
  campaignId: string;
  arcId?: string;
  sessionNumber: number;
  subNumber: number;
  sessionType: SessionType;
  date: string;
  summary: string;
  prepNotes: string;
  obsidianPath?: string;
}

export function sessionCode(
  s: Pick<Session, "sessionNumber" | "subNumber">,
): string {
  const base = `S${String(s.sessionNumber).padStart(2, "0")}`;
  return s.subNumber ? `${base}.${s.subNumber}` : base;
}

const isoDateRe = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDate(raw: string): string {
  const match = raw.match(isoDateRe);
  if (!match) return raw;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export interface Arc {
  id: string;
  deletedAt?: string;
  campaignId: string;
  label: string;
  summary: string;
  meta: string;
  order: number;
  status: ArcStatus;
  subarcOrder?: number;
  obsidianPath: string;
}

export type EncounterStatus = "planificado" | "activo" | "cerrado";

export const encounterStatusColor: Record<EncounterStatus, string> = {
  planificado: "var(--text-secondary)",
  activo: "var(--status-alive)",
  cerrado: "var(--status-dead)",
};

export const encounterStatusLabel: Record<
  Lang,
  Record<EncounterStatus, string>
> = {
  es: {
    planificado: "Planificado",
    activo: "Activo",
    cerrado: "Cerrado",
  },
  en: {
    planificado: "Planned",
    activo: "Active",
    cerrado: "Closed",
  },
};

export interface Encounter {
  id: string;
  deletedAt?: string;
  campaignId: string;
  sessionId?: string;
  round: number;
  status: EncounterStatus;
}

export type TurnType = "rapido" | "lento";

export const turnTypeLabel: Record<Lang, Record<TurnType, string>> = {
  es: {
    rapido: "Rápido",
    lento: "Lento",
  },
  en: {
    rapido: "Fast",
    lento: "Slow",
  },
};

export type StatMap = Record<string, string | number>;

export interface EncounterParticipant {
  id: string;
  encounterId: string;
  pcId?: string;
  npcId?: string;
  displayName?: string;
  currentHp?: number;
  maxHp?: number;
  initiativeValue?: number;
  turnType?: TurnType;
  notes: string;
  attributes: StatMap;
  skills: StatMap;
}
