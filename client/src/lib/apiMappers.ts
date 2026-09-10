import {
  crystalLabel,
  type Arc,
  type ArcStatus,
  type Campaign,
  type CampaignStatus,
  type CrystalType,
  type Group,
  type Location,
  type Npc,
  type PlayerCharacter,
  type Quest,
  type QuestStatus,
  type Session,
  type SessionType,
  type StatusKind,
} from "../data/domain";

export interface ApiCampaign {
  id: number;
  name: string;
  system: string;
  status: CampaignStatus;
}

export function mapCampaign(c: ApiCampaign): Campaign {
  return {
    id: String(c.id),
    name: c.name,
    system: c.system,
    status: c.status,
    meta: "",
    last: "",
  };
}

export interface ApiNpc {
  id: number;
  campaign_id: number;
  name: string;
  npc_kind: string;
  status: string;
  rol?: string;
  etnia?: string;
  tipo_spren?: string;
  location_id?: number;
  description: string;
  obsidian_path?: string;
}

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const apiStatusToStatusKind: Record<string, StatusKind> = {
  vivo: "alive",
  activo: "alive",
  muerto: "dead",
  consolidado: "dead",
  desaparecido: "missing",
};
const canonicalApiStatus = new Set(["vivo", "muerto", "desaparecido"]);

export function mapNpc(n: ApiNpc): Npc {
  const crystal = n.npc_kind as CrystalType;
  return {
    id: String(n.id),
    campaignId: String(n.campaign_id),
    name: n.name,
    role: n.rol ?? "",
    etnia: n.etnia,
    tipoSpren: n.tipo_spren,
    description: n.description,
    crystal,
    crystalLabel: crystalLabel[crystal],
    status: apiStatusToStatusKind[n.status] ?? "alive",
    statusNote: canonicalApiStatus.has(n.status) ? undefined : n.status,
    location: "—",
    locationId: n.location_id ? String(n.location_id) : undefined,
    faction: "—",
    initials: initialsFromName(n.name),
    obsidianPath: n.obsidian_path ?? "",
  };
}

const statusKindToApiStatus: Record<Exclude<StatusKind, "paused">, string> = {
  alive: "vivo",
  missing: "desaparecido",
  dead: "muerto",
};

function npcStatusToApi(npc: Npc): string {
  if (npc.statusNote && apiStatusToStatusKind[npc.statusNote] === npc.status) {
    return npc.statusNote;
  }
  // ponytail: "paused" no existe en validNPCStatuses del backend (server/internal/handlers/npcs.go).
  // Se manda igual para que el backend lo rechace (400) en vez de mapearlo a un status inventado.
  if (npc.status === "paused") return npc.status;
  return statusKindToApiStatus[npc.status];
}

export function npcToApiPayload(npc: Npc) {
  return {
    name: npc.name,
    npc_kind: npc.crystal,
    detail_level: "full", // ponytail: NpcEdit no tiene control para "minor" todavía
    status: npcStatusToApi(npc),
    description: npc.description,
    rol: npc.role || undefined,
    etnia: npc.etnia || undefined,
    tipo_spren: npc.tipoSpren || undefined,
    location_id: npc.locationId ? Number(npc.locationId) : undefined,
    obsidian_path: npc.obsidianPath || undefined,
  };
}

export interface ApiLocation {
  id: number;
  campaign_id: number;
  name: string;
  location_type: string;
  parent_location_id?: number;
  description: string;
  obsidian_path?: string;
}

export function mapLocation(l: ApiLocation): Location {
  return {
    id: String(l.id),
    campaignId: String(l.campaign_id),
    name: l.name,
    locationType: l.location_type as Location["locationType"],
    parentId: l.parent_location_id ? String(l.parent_location_id) : undefined,
    description: l.description,
    obsidianPath: l.obsidian_path ?? "",
  };
}

export function locationToApiPayload(l: Location) {
  return {
    name: l.name,
    location_type: l.locationType,
    parent_location_id: l.parentId ? Number(l.parentId) : undefined,
    description: l.description,
    obsidian_path: l.obsidianPath || undefined,
  };
}

export interface ApiGroup {
  id: number;
  campaign_id: number;
  name: string;
  description: string;
  obsidian_path?: string;
  member_count: number;
}

export function mapGroup(g: ApiGroup): Group {
  return {
    id: String(g.id),
    campaignId: String(g.campaign_id),
    name: g.name,
    description: g.description,
    memberCount: g.member_count,
    obsidianPath: g.obsidian_path ?? "",
  };
}

export function groupToApiPayload(g: Group) {
  return {
    name: g.name,
    description: g.description,
    obsidian_path: g.obsidianPath || undefined,
  };
}

export interface ApiArc {
  id: number;
  campaign_id: number;
  title: string;
  order: number;
  status: string;
  subarc_order?: number;
  summary: string;
}

export function mapArc(a: ApiArc): Arc {
  return {
    id: String(a.id),
    campaignId: String(a.campaign_id),
    label: a.title,
    summary: a.summary,
    meta: "",
    order: a.order,
    status: a.status as ArcStatus,
    subarcOrder: a.subarc_order,
    obsidianPath: "",
  };
}

export function arcToApiPayload(a: Arc) {
  return {
    name: a.label,
    order: a.order,
    status: a.status,
    subarc_order: a.subarcOrder ?? undefined,
    summary: a.summary,
  };
}

export interface ApiQuest {
  id: number;
  campaign_id: number;
  title: string;
  description: string;
  status: string;
  priority?: number;
}

function questToStatus(status: string): QuestStatus {
  const valid: QuestStatus[] = ["active", "completed", "failed", "on_hold"];
  return (valid as string[]).includes(status) ? (status as QuestStatus) : "active";
}

export function mapQuest(q: ApiQuest): Quest {
  return {
    id: String(q.id),
    campaignId: String(q.campaign_id),
    name: q.title,
    hook: q.description,
    crystal: "faction-quest",
    status: questToStatus(q.status),
    priority: (q.priority ?? 3) as Quest["priority"],
  };
}

export function questToApiPayload(q: Quest) {
  return {
    title: q.name,
    description: q.hook,
    status: q.status,
    priority: q.priority,
  };
}

export interface ApiPlayerCharacter {
  id: number;
  campaign_id: number;
  player_name: string;
  character_name: string;
  race: string;
  class: string;
  status: string;
  backstory: string;
  progression_notes: string;
  obsidian_path?: string;
}

export function mapPlayerCharacter(p: ApiPlayerCharacter): PlayerCharacter {
  return {
    id: String(p.id),
    campaignId: String(p.campaign_id),
    playerName: p.player_name,
    characterName: p.character_name,
    race: p.race,
    class: p.class,
    status: apiStatusToStatusKind[p.status] ?? "alive",
    faction: "—",
    backstory: p.backstory,
    progressionNotes: p.progression_notes,
    obsidianPath: p.obsidian_path ?? "",
  };
}

function pcStatusToApi(status: StatusKind): string {
  // ponytail: "paused" no existe en validPCStatuses del backend (server/internal/handlers/player_characters.go).
  // Se manda igual para que el backend lo rechace (400) en vez de mapearlo a un status inventado.
  if (status === "paused") return status;
  return statusKindToApiStatus[status];
}

export function playerCharacterToApiPayload(p: PlayerCharacter) {
  return {
    player_name: p.playerName,
    character_name: p.characterName,
    race: p.race,
    class: p.class,
    status: pcStatusToApi(p.status),
    backstory: p.backstory,
    progression_notes: p.progressionNotes,
    obsidian_path: p.obsidianPath || undefined,
  };
}

export interface ApiSession {
  id: number;
  campaign_id: number;
  arc_id?: number;
  session_number: number;
  sub_number: number;
  session_type: string;
  date: string;
  summary: string;
  prep_notes: string;
  obsidian_path?: string;
}

export function mapSession(s: ApiSession): Session {
  return {
    id: String(s.id),
    campaignId: String(s.campaign_id),
    arcId: s.arc_id ? String(s.arc_id) : undefined,
    sessionNumber: s.session_number,
    subNumber: s.sub_number,
    sessionType: s.session_type as SessionType,
    date: s.date,
    summary: s.summary,
    prepNotes: s.prep_notes,
    obsidianPath: s.obsidian_path,
  };
}

export function sessionToApiPayload(s: Session) {
  return {
    arc_id: s.arcId ? Number(s.arcId) : undefined,
    session_number: s.sessionNumber,
    sub_number: s.subNumber,
    session_type: s.sessionType,
    date: s.date,
    summary: s.summary,
    prep_notes: s.prepNotes,
    obsidian_path: s.obsidianPath || undefined,
  };
}
