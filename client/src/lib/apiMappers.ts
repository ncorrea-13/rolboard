import {
  crystalLabelFor,
  type Arc,
  type ArcStatus,
  type Campaign,
  type CampaignStatus,
  type CrystalType,
  type Encounter,
  type EncounterParticipant,
  type EncounterStatus,
  type Group,
  type Location,
  type Npc,
  type PlayerCharacter,
  type Quest,
  type QuestStatus,
  type Session,
  type SessionType,
  type StatMap,
  type StatusKind,
  type TurnType,
} from "../data/domain";

export interface ApiCampaign {
  id: number;
  name: string;
  system: string;
  status: CampaignStatus;
  vault_path: string;
}

export function mapCampaign(c: ApiCampaign): Campaign {
  return {
    id: String(c.id),
    name: c.name,
    system: c.system,
    status: c.status,
    vaultPath: c.vault_path,
    meta: "",
    last: "",
  };
}

export interface ApiNpc {
  id: number;
  campaign_id: number;
  name: string;
  npc_kind: string;
  detail_level: string;
  status: string;
  rol?: string;
  etnia?: string;
  tipo_spren?: string;
  location_id?: number;
  description: string;
  attributes?: StatMap;
  skills?: StatMap;
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
  paused: "paused",
};
const canonicalApiStatus = new Set([
  "vivo",
  "muerto",
  "desaparecido",
  "paused",
]);

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
    crystalLabel: crystalLabelFor(crystal),
    detailLevel: n.detail_level === "minor" ? "minor" : "full",
    status: apiStatusToStatusKind[n.status] ?? "alive",
    statusNote: canonicalApiStatus.has(n.status) ? undefined : n.status,
    location: "—",
    locationId: n.location_id ? String(n.location_id) : undefined,
    initials: initialsFromName(n.name),
    obsidianPath: n.obsidian_path ?? "",
    attributes: n.attributes ?? {},
    skills: n.skills ?? {},
  };
}

const statusKindToApiStatus: Record<StatusKind, string> = {
  alive: "vivo",
  missing: "desaparecido",
  dead: "muerto",
  paused: "paused",
};

function npcStatusToApi(npc: Npc): string {
  if (npc.statusNote && apiStatusToStatusKind[npc.statusNote] === npc.status) {
    return npc.statusNote;
  }
  return statusKindToApiStatus[npc.status];
}

export function npcToApiPayload(npc: Npc) {
  return {
    name: npc.name,
    npc_kind: npc.crystal,
    detail_level: npc.detailLevel,
    status: npcStatusToApi(npc),
    description: npc.description,
    rol: npc.role || undefined,
    etnia: npc.etnia || undefined,
    tipo_spren: npc.tipoSpren || undefined,
    location_id: npc.locationId ? Number(npc.locationId) : undefined,
    attributes: npc.attributes,
    skills: npc.skills,
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
  alineacion: string;
  lider_npc_id?: number;
  obsidian_path?: string;
  member_count: number;
}

export interface ApiGroupMember {
  npc_id: number;
  name: string;
  role_in_group?: string;
}

export interface GroupMember {
  npcId: string;
  name: string;
}

export function mapGroupMember(m: ApiGroupMember): GroupMember {
  return { npcId: String(m.npc_id), name: m.name };
}

export interface ApiPCGroupMember {
  pc_id: number;
  character_name: string;
  role_in_group?: string;
}

export interface PCGroupMember {
  pcId: string;
  characterName: string;
}

export function mapPCGroupMember(m: ApiPCGroupMember): PCGroupMember {
  return { pcId: String(m.pc_id), characterName: m.character_name };
}

export function mapGroup(g: ApiGroup): Group {
  return {
    id: String(g.id),
    campaignId: String(g.campaign_id),
    name: g.name,
    description: g.description,
    alineacion: g.alineacion,
    liderNpcId: g.lider_npc_id ? String(g.lider_npc_id) : undefined,
    memberCount: g.member_count,
    obsidianPath: g.obsidian_path ?? "",
  };
}

export function groupToApiPayload(g: Group) {
  return {
    name: g.name,
    description: g.description,
    alineacion: g.alineacion,
    lider_npc_id: g.liderNpcId ? Number(g.liderNpcId) : undefined,
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
  obsidian_path?: string;
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
    obsidianPath: a.obsidian_path ?? "",
  };
}

export function arcToApiPayload(a: Arc) {
  return {
    name: a.label,
    order: a.order,
    status: a.status,
    subarc_order: a.subarcOrder ?? undefined,
    summary: a.summary,
    obsidian_path: a.obsidianPath || undefined,
  };
}

export interface ApiQuest {
  id: number;
  campaign_id: number;
  title: string;
  description: string;
  status: string;
  priority?: number;
  notes: string;
}

function questToStatus(status: string): QuestStatus {
  const valid: QuestStatus[] = ["active", "completed", "failed", "on_hold"];
  return (valid as string[]).includes(status)
    ? (status as QuestStatus)
    : "active";
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
    notes: q.notes,
  };
}

export function questToApiPayload(q: Quest) {
  return {
    title: q.name,
    description: q.hook,
    status: q.status,
    priority: q.priority,
    notes: q.notes,
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
  attributes?: StatMap;
  skills?: StatMap;
  current_hp?: number;
  max_hp?: number;
  obsidian_path?: string;
  historia_path?: string;
  avances_path?: string;
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
    backstory: p.backstory,
    progressionNotes: p.progression_notes,
    obsidianPath: p.obsidian_path ?? "",
    historiaPath: p.historia_path,
    avancesPath: p.avances_path,
    attributes: p.attributes ?? {},
    skills: p.skills ?? {},
    currentHp: p.current_hp,
    maxHp: p.max_hp,
  };
}

function pcStatusToApi(status: StatusKind): string {
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
    attributes: p.attributes,
    skills: p.skills,
    current_hp: p.currentHp,
    max_hp: p.maxHp,
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

export interface ApiDashboardSummary {
  active_quests: ApiQuest[];
  on_hold_quests: ApiQuest[];
  recent_npcs: ApiNpc[];
  last_session?: ApiSession;
}

export interface ApiEncounter {
  id: number;
  campaign_id: number;
  session_id?: number;
  round: number;
  status: string;
}

export function mapEncounter(e: ApiEncounter): Encounter {
  return {
    id: String(e.id),
    campaignId: String(e.campaign_id),
    sessionId: e.session_id ? String(e.session_id) : undefined,
    round: e.round,
    status: e.status as EncounterStatus,
  };
}

export function encounterToApiPayload(e: Encounter) {
  return {
    session_id: e.sessionId ? Number(e.sessionId) : undefined,
    round: e.round,
    status: e.status,
  };
}

export interface ApiEncounterParticipant {
  id: number;
  encounter_id: number;
  pc_id?: number;
  npc_id?: number;
  display_name?: string;
  current_hp?: number;
  max_hp?: number;
  initiative_value?: number;
  turn_type?: string;
  notes: string;
  attributes?: StatMap;
  skills?: StatMap;
}

export function mapEncounterParticipant(p: ApiEncounterParticipant): EncounterParticipant {
  return {
    id: String(p.id),
    encounterId: String(p.encounter_id),
    pcId: p.pc_id ? String(p.pc_id) : undefined,
    npcId: p.npc_id ? String(p.npc_id) : undefined,
    displayName: p.display_name,
    currentHp: p.current_hp,
    maxHp: p.max_hp,
    initiativeValue: p.initiative_value,
    turnType: p.turn_type as TurnType | undefined,
    notes: p.notes,
    attributes: p.attributes ?? {},
    skills: p.skills ?? {},
  };
}

export function participantToApiPayload(p: EncounterParticipant) {
  return {
    pc_id: p.pcId ? Number(p.pcId) : undefined,
    npc_id: p.npcId ? Number(p.npcId) : undefined,
    display_name: p.displayName || undefined,
    current_hp: p.currentHp,
    max_hp: p.maxHp,
    initiative_value: p.initiativeValue,
    turn_type: p.turnType,
    notes: p.notes,
    attributes: p.attributes,
    skills: p.skills,
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
