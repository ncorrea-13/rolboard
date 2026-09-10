export type CrystalType =
  | "npc"
  | "spren"
  | "location"
  | "faction-quest"
  | "entidad-cognitiva";
export type StatusKind = "alive" | "missing" | "dead" | "paused";

export const crystalColor: Record<CrystalType, string> = {
  npc: "var(--crystal-npc)",
  spren: "var(--crystal-spren)",
  location: "var(--crystal-location)",
  "faction-quest": "var(--crystal-faction-quest)",
  "entidad-cognitiva": "var(--crystal-entidad-cognitiva)",
};

export const crystalLabel: Record<CrystalType, string> = {
  npc: "Humano",
  spren: "Spren",
  location: "Locación",
  "faction-quest": "Facción",
  "entidad-cognitiva": "Ent. cognitiva",
};

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

export const statusLabel: Record<StatusKind, string> = {
  alive: "Vivo",
  missing: "Desaparecido",
  dead: "Muerto",
  paused: "En pausa",
};

export type CampaignStatus = "active" | "paused" | "finished";

export type ArcStatus = "planificado" | "en_curso" | "cerrado";

export const arcStatusColor: Record<ArcStatus, string> = {
  planificado: "var(--text-secondary)",
  en_curso: "var(--status-alive)",
  cerrado: "var(--status-dead)",
};

export const arcStatusLabel: Record<ArcStatus, string> = {
  planificado: "Planificado",
  en_curso: "En curso",
  cerrado: "Cerrado",
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

export const campaignStatusLabel: Record<CampaignStatus, string> = {
  active: "Activa",
  paused: "En pausa",
  finished: "Finalizada",
};

export interface Campaign {
  id: string;
  name: string;
  system: string;
  status: CampaignStatus;
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

export const questStatusLabel: Record<QuestStatus, string> = {
  active: "Activa",
  completed: "Completada",
  failed: "Fallida",
  on_hold: "En pausa",
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
}

export interface Group {
  id: string;
  deletedAt?: string;
  campaignId: string;
  name: string;
  description: string;
  memberCount: number;
  obsidianPath: string;
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
}

export function locationBreadcrumb(loc: Location, all: Location[]): string {
  const parent = loc.parentId ? all.find((l) => l.id === loc.parentId) : undefined;
  if (!parent || parent.locationType === "planet" || parent.locationType === "region") return loc.name;
  return `${parent.name} · ${loc.name}`;
}

export const locationTypeLabel: Record<Location["locationType"], string> = {
  planet: "Planeta",
  region: "Región",
  city: "Ciudad",
  site: "Sitio",
  plane: "Plano",
};

export interface NpcLink {
  role: string;
  npcId: string;
}

export interface Npc {
  id: string;
  deletedAt?: string;
  campaignId: string;
  name: string;
  role: string;
  etnia?: string;
  tipoSpren?: string;
  description: string;
  crystal: CrystalType;
  crystalLabel: string;
  status: StatusKind;
  statusNote?: string;
  location: string;
  locationId?: string;
  faction: string;
  initials: string;
  obsidianPath: string;
  links?: NpcLink[];
  appearances?: string[];
  relatedQuestIds?: string[];
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
  faction: string;
  links?: NpcLink[];
  backstory: string;
  progressionNotes: string;
  obsidianPath: string;
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

export function sessionCode(s: Pick<Session, "sessionNumber" | "subNumber">): string {
  const base = `S${String(s.sessionNumber).padStart(2, "0")}`;
  return s.subNumber ? `${base}.${s.subNumber}` : base;
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
