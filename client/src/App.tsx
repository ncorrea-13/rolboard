import { useEffect, useState } from "react";
import "./App.css";
import { apiFetch } from "./lib/api";
import { AppShell } from "./components/AppShell";
import { Modal } from "./components/Modal";
import { NewSessionForm } from "./components/NewSessionForm";
import { PlanSession } from "./screens/PlanSession";
import { SessionEdit } from "./screens/SessionEdit";
import { NewCampaignForm } from "./components/NewCampaignForm";
import { EntityForm, type FormField } from "./components/EntityForm";
import { CampaignSelector } from "./screens/CampaignSelector";
import {
  CampaignDashboard,
  type DashboardSection,
} from "./screens/CampaignDashboard";
import { NpcList } from "./screens/NpcList";
import { NpcDetail } from "./screens/NpcDetail";
import { NpcEdit } from "./screens/NpcEdit";
import { PlayerDetail } from "./screens/PlayerDetail";
import { PlayerEdit } from "./screens/PlayerEdit";
import { SessionsTimeline } from "./screens/SessionsTimeline";
import { ArcsList } from "./screens/ArcsList";
import { FactionsList } from "./screens/FactionsList";
import { LocationsList } from "./screens/LocationsList";
import { QuestsList } from "./screens/QuestsList";
import { PlayersList } from "./screens/PlayersList";
import {
  ArcDetail,
  FactionDetail,
  LocationDetail,
  QuestDetail,
} from "./screens/EntityDetails";
import {
  npcs as initialNpcs,
  quests as initialQuests,
  playerCharacters as initialPlayerCharacters,
  locationTypeLabel,
  type Campaign,
  type CampaignStatus,
  type Npc,
  type Arc,
  type Group,
  type Location,
  type Quest,
  type PlayerCharacter,
  type SessionEntry,
  type CrystalType,
  type StatusKind,
  type ArcStatus,
  crystalLabel,
} from "./data/mock";

interface ApiCampaign {
  id: number;
  name: string;
  system: string;
  status: CampaignStatus;
}

function mapCampaign(c: ApiCampaign): Campaign {
  return {
    id: String(c.id),
    name: c.name,
    system: c.system,
    status: c.status,
    meta: "",
    last: "",
  };
}

interface ApiNpc {
  id: number;
  campaign_id: number;
  name: string;
  npc_kind: string;
  status: string;
  rol?: string;
  etnia?: string;
  tipo_spren?: string;
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

function mapNpc(n: ApiNpc): Npc {
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

function npcToApiPayload(npc: Npc) {
  return {
    name: npc.name,
    npc_kind: npc.crystal,
    detail_level: "full", // ponytail: NpcEdit no tiene control para "minor" todavía
    status: npcStatusToApi(npc),
    description: npc.description,
    rol: npc.role || undefined,
    etnia: npc.etnia || undefined,
    tipo_spren: npc.tipoSpren || undefined,
    obsidian_path: npc.obsidianPath || undefined,
  };
}

interface ApiLocation {
  id: number;
  campaign_id: number;
  name: string;
  location_type: string;
  parent_location_id?: number;
  description: string;
  obsidian_path?: string;
}

function mapLocation(l: ApiLocation): Location {
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

function locationToApiPayload(l: Location) {
  return {
    name: l.name,
    location_type: l.locationType,
    parent_location_id: l.parentId ? Number(l.parentId) : undefined,
    description: l.description,
    obsidian_path: l.obsidianPath || undefined,
  };
}

interface ApiGroup {
  id: number;
  campaign_id: number;
  name: string;
  description: string;
  obsidian_path?: string;
  member_count: number;
}

function mapGroup(g: ApiGroup): Group {
  return {
    id: String(g.id),
    campaignId: String(g.campaign_id),
    name: g.name,
    description: g.description,
    memberCount: g.member_count,
    obsidianPath: g.obsidian_path ?? "",
  };
}

function groupToApiPayload(g: Group) {
  return {
    name: g.name,
    description: g.description,
    obsidian_path: g.obsidianPath || undefined,
  };
}

interface ApiArc {
  id: number;
  campaign_id: number;
  title: string;
  order: number;
  status: string;
  subarc_order?: number;
  summary: string;
}

function mapArc(a: ApiArc): Arc {
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
    sessions: [],
  };
}

function arcToApiPayload(a: Arc) {
  return {
    name: a.label,
    order: a.order,
    status: a.status,
    subarc_order: a.subarcOrder ?? undefined,
    summary: a.summary,
  };
}

type EntityKind = "arc" | "faction" | "location" | "quest";

const entityKindLabel: Record<EntityKind, string> = {
  arc: "arco",
  faction: "facción",
  location: "locación",
  quest: "quest",
};

function arcFields(): FormField[] {
  return [
    {
      key: "label",
      label: "Nombre del arco",
      type: "text",
      placeholder: "ej. Arco III · La Marea Alta",
    },
    { key: "summary", label: "Resumen", type: "textarea" },
    { key: "order", label: "Número de arco", type: "number" },
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: [
        { value: "planificado", label: "Planificado" },
        { value: "en_curso", label: "En curso" },
        { value: "cerrado", label: "Cerrado" },
      ],
    },
  ];
}

function factionFields(): FormField[] {
  return [
    { key: "name", label: "Nombre", type: "text" },
    { key: "description", label: "Descripción", type: "textarea" },
  ];
}

function locationFields(
  locations: Location[],
  excludeId?: string,
): FormField[] {
  return [
    { key: "name", label: "Nombre", type: "text" },
    {
      key: "locationType",
      label: "Tipo",
      type: "select",
      options: Object.entries(locationTypeLabel).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      key: "parentId",
      label: "Ubicación padre",
      type: "select",
      options: [
        { value: "", label: "— sin padre —" },
        ...locations
          .filter((l) => l.id !== excludeId)
          .map((l) => ({ value: l.id, label: l.name })),
      ],
    },
    { key: "description", label: "Descripción", type: "textarea" },
  ];
}

function questFields(): FormField[] {
  return [
    { key: "name", label: "Título", type: "text" },
    { key: "hook", label: "Gancho narrativo", type: "textarea" },
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: [
        { value: "active", label: "Activa" },
        { value: "on_hold", label: "En pausa" },
        { value: "completed", label: "Completada" },
        { value: "failed", label: "Fallida" },
      ],
    },
    {
      key: "priority",
      label: "Prioridad",
      type: "select",
      options: [
        { value: "1", label: "Alta" },
        { value: "2", label: "Media" },
        { value: "3", label: "Baja" },
      ],
    },
  ];
}

const entityKindSection: Record<EntityKind, DashboardSection> = {
  arc: "arcos",
  faction: "facciones",
  location: "locaciones",
  quest: "quests",
};

type Route =
  | { name: "campaigns" }
  | { name: "section"; section: DashboardSection }
  | { name: "npc-detail"; npcId: string }
  | { name: "npc-edit"; npcId: string }
  | { name: "npc-create" }
  | { name: "player-detail"; playerId: string }
  | { name: "player-edit"; playerId: string }
  | { name: "player-create" }
  | { name: "session-plan" }
  | { name: "session-edit"; arcId: string; sessionN: string; autoConfirm?: boolean }
  | { name: "entity-detail"; kind: EntityKind; id: string };

const blankNpcDraft: Npc = {
  id: "",
  campaignId: "",
  name: "",
  role: "",
  description: "",
  crystal: "npc",
  crystalLabel: "NPC",
  status: "alive",
  location: "",
  faction: "—",
  initials: "",
  obsidianPath: "",
};

const blankPlayerDraft: PlayerCharacter = {
  id: "",
  campaignId: "",
  playerName: "",
  characterName: "",
  race: "",
  class: "",
  status: "alive",
  faction: "—",
  backstory: "",
  progressionNotes: "",
  obsidianPath: "",
};

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "campaigns" });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    apiFetch<ApiCampaign[]>("/campaigns")
      .then((data) => setCampaigns((data ?? []).map(mapCampaign)))
      .catch((err) => console.error("Error cargando campañas:", err));
  }, []);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [npcs, setNpcs] = useState<Npc[]>(initialNpcs);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiNpc[]>(`/campaigns/${activeCampaignId}/npcs`)
      .then((data) =>
        setNpcs(
          (data ?? []).filter((n) => n.npc_kind !== "referencia").map(mapNpc),
        ),
      )
      .catch((err) => console.error("Error cargando NPCs:", err));
  }, [activeCampaignId]);

  const [arcs, setArcs] = useState<Arc[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiArc[]>(`/campaigns/${activeCampaignId}/arcs`)
      .then((data) => setArcs((data ?? []).map(mapArc)))
      .catch((err) => console.error("Error cargando arcos:", err));
  }, [activeCampaignId]);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiGroup[]>(`/campaigns/${activeCampaignId}/groups`)
      .then((data) => setGroups((data ?? []).map(mapGroup)))
      .catch((err) => console.error("Error cargando facciones:", err));
  }, [activeCampaignId]);

  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiLocation[]>(`/campaigns/${activeCampaignId}/locations`)
      .then((data) => setLocations((data ?? []).map(mapLocation)))
      .catch((err) => console.error("Error cargando locaciones:", err));
  }, [activeCampaignId]);

  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [playerCharacters, setPlayerCharacters] = useState<PlayerCharacter[]>(
    initialPlayerCharacters,
  );
  const [reindexing, setReindexing] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [entityForm, setEntityForm] = useState<{
    kind: EntityKind;
    id?: string;
  } | null>(null);

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);

  const campaignNpcs = npcs.filter((n) => n.campaignId === activeCampaignId && !n.deletedAt);
  const campaignArcs = arcs.filter((a) => a.campaignId === activeCampaignId && !a.deletedAt);
  const campaignGroups = groups.filter(
    (g) => g.campaignId === activeCampaignId && !g.deletedAt,
  );
  const campaignLocations = locations.filter(
    (l) => l.campaignId === activeCampaignId && !l.deletedAt,
  );
  const campaignQuests = quests.filter(
    (q) => q.campaignId === activeCampaignId && !q.deletedAt,
  );
  const campaignPlayerCharacters = playerCharacters.filter(
    (p) => p.campaignId === activeCampaignId && !p.deletedAt,
  );

  function selectCampaign(id: string) {
    setActiveCampaignId(id);
    setRoute({ name: "section", section: "resumen" });
  }

  function createCampaign(campaign: Omit<Campaign, "id">, vaultPath: string) {
    apiFetch<ApiCampaign>("/campaigns", {
      method: "POST",
      body: JSON.stringify({ name: campaign.name, system: campaign.system, description: "", vault_path: vaultPath }),
    })
      .then((created) => {
        const mapped = mapCampaign(created);
        setCampaigns((prev) => [...prev, mapped]);
        setNewCampaignOpen(false);
        selectCampaign(mapped.id);
      })
      .catch((err) => console.error("Error creando campaña:", err));
  }

  function handleReindex() {
    if (!activeCampaign || reindexing) return;
    setReindexing(true);
    apiFetch(`/campaigns/${activeCampaign.id}/reindex`, { method: "POST" })
      .then((result) => console.log("Reindexado:", result))
      .catch((err) => console.error("Error reindexando:", err))
      .finally(() => setReindexing(false));
  }

  function saveNpc(id: string, patch: Partial<Npc>) {
    const current = npcs.find((n) => n.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    apiFetch(`/npcs/${id}`, {
      method: "PUT",
      body: JSON.stringify(npcToApiPayload(merged)),
    })
      .then(() => setNpcs((prev) => prev.map((n) => (n.id === id ? merged : n))))
      .catch((err) => console.error("Error guardando NPC:", err));
  }

  function createNpc(patch: Partial<Npc>) {
    const name = patch.name ?? "";
    const draft: Npc = {
      ...blankNpcDraft,
      ...patch,
      campaignId: activeCampaign!.id,
      obsidianPath: `NPCs/${name}.md`,
    };
    apiFetch<ApiNpc>(`/campaigns/${activeCampaign!.id}/npcs`, {
      method: "POST",
      body: JSON.stringify(npcToApiPayload(draft)),
    })
      .then((created) => {
        // mapNpc no trae location/faction/links (no vienen del backend todavía) — se conservan del draft.
        const npc: Npc = { ...mapNpc(created), location: draft.location, faction: draft.faction, links: draft.links };
        setNpcs((prev) => [...prev, npc]);
        setRoute({ name: "npc-detail", npcId: npc.id });
      })
      .catch((err) => console.error("Error creando NPC:", err));
  }

  function savePlayer(id: string, patch: Partial<PlayerCharacter>) {
    setPlayerCharacters((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function createPlayer(patch: Partial<PlayerCharacter>) {
    const id = `p${playerCharacters.length + 1}`;
    const playerName = patch.playerName ?? "";
    const characterName = patch.characterName ?? "";
    const player: PlayerCharacter = {
      ...blankPlayerDraft,
      ...patch,
      id,
      campaignId: activeCampaign!.id,
      obsidianPath: `Jugadores/${playerName}/${characterName}.md`,
    };
    setPlayerCharacters((prev) => [...prev, player]);
    setRoute({ name: "player-detail", playerId: id });
  }

  function editSession(
    arcId: string,
    sessionN: string,
    patch: Omit<SessionEntry, "n">,
  ) {
    setArcs((prev) =>
      prev.map((a) =>
        a.id === arcId
          ? {
              ...a,
              sessions: a.sessions.map((s) =>
                s.n === sessionN ? { ...s, ...patch } : s,
              ),
            }
          : a,
      ),
    );
  }

  function addSessionEntry(entry: SessionEntry) {
    const currentArc =
      campaignArcs.find((a) => a.status === "en_curso") ??
      campaignArcs[campaignArcs.length - 1];
    if (!currentArc) return;
    setArcs((prev) =>
      prev.map((a) =>
        a.id === currentArc.id ? { ...a, sessions: [...a.sessions, entry] } : a,
      ),
    );
    setRoute({ name: "section", section: "sesiones" });
  }

  function playSession(entry: SessionEntry) {
    addSessionEntry(entry);
    setNewSessionOpen(false);
  }

  function nextId(prefix: string, items: { id: string }[]) {
    return `${prefix}${items.length + 1}`;
  }

  function submitEntityForm(values: Record<string, string>) {
    if (!entityForm) return;
    const { kind, id } = entityForm;

    switch (kind) {
      case "arc": {
        const current = id ? arcs.find((a) => a.id === id) : undefined;
        const draft: Arc = current
          ? {
              ...current,
              label: values.label,
              summary: values.summary,
              order: Number(values.order) || current.order,
              status: values.status as ArcStatus,
            }
          : {
              id: "",
              campaignId: activeCampaign!.id,
              label: values.label,
              summary: values.summary,
              meta: "",
              order: Number(values.order) || 0,
              status: values.status as ArcStatus,
              obsidianPath: `Arcos/${values.label}.md`,
              sessions: [],
            };
        const payload = JSON.stringify(arcToApiPayload(draft));
        const request = id
          ? apiFetch<ApiArc>(`/arcs/${id}`, { method: "PUT", body: payload })
          : apiFetch<ApiArc>(`/campaigns/${activeCampaign!.id}/arcs`, { method: "POST", body: payload });
        request
          .then((saved) => {
            // mapArc no trae meta/sessions (Sessions sin wirear todavía) — se conservan del draft/actual.
            const arc = { ...mapArc(saved), meta: current?.meta ?? "", sessions: current?.sessions ?? [] };
            setArcs((prev) => (id ? prev.map((a) => (a.id === id ? arc : a)) : [...prev, arc]));
          })
          .catch((err) => console.error("Error guardando arco:", err));
        break;
      }
      case "faction": {
        const current = id ? groups.find((g) => g.id === id) : undefined;
        const draft: Group = current
          ? { ...current, name: values.name, description: values.description }
          : {
              id: "",
              campaignId: activeCampaign!.id,
              name: values.name,
              description: values.description,
              memberCount: 0,
              obsidianPath: `Facciones/${values.name}.md`,
            };
        const payload = JSON.stringify(groupToApiPayload(draft));
        const request = id
          ? apiFetch<ApiGroup>(`/groups/${id}`, { method: "PUT", body: payload })
          : apiFetch<ApiGroup>(`/campaigns/${activeCampaign!.id}/groups`, { method: "POST", body: payload });
        request
          .then((saved) => {
            // GetByID/Update no calculan member_count (siempre 0) — se conserva el real ya cargado por List.
            const group = { ...mapGroup(saved), memberCount: current?.memberCount ?? 0 };
            setGroups((prev) => (id ? prev.map((g) => (g.id === id ? group : g)) : [...prev, group]));
          })
          .catch((err) => console.error("Error guardando facción:", err));
        break;
      }
      case "location": {
        const draft: Location = id
          ? {
              ...locations.find((l) => l.id === id)!,
              name: values.name,
              locationType: values.locationType as Location["locationType"],
              parentId: values.parentId || undefined,
              description: values.description,
            }
          : {
              id: "",
              campaignId: activeCampaign!.id,
              name: values.name,
              locationType: values.locationType as Location["locationType"],
              parentId: values.parentId || undefined,
              description: values.description,
              obsidianPath: `Locaciones/${values.name}.md`,
            };
        const payload = JSON.stringify(locationToApiPayload(draft));
        const request = id
          ? apiFetch<ApiLocation>(`/locations/${id}`, { method: "PUT", body: payload })
          : apiFetch<ApiLocation>(`/campaigns/${activeCampaign!.id}/locations`, { method: "POST", body: payload });
        request
          .then((saved) => {
            const location = mapLocation(saved);
            setLocations((prev) =>
              id ? prev.map((l) => (l.id === id ? location : l)) : [...prev, location],
            );
          })
          .catch((err) => console.error("Error guardando locación:", err));
        break;
      }
      case "quest": {
        const priority = (Number(values.priority) || 3) as Quest["priority"];
        if (id) {
          setQuests((prev) =>
            prev.map((q) =>
              q.id === id
                ? {
                    ...q,
                    name: values.name,
                    hook: values.hook,
                    status: values.status as Quest["status"],
                    priority,
                  }
                : q,
            ),
          );
        } else {
          const newId = nextId("q", quests);
          setQuests((prev) => [
            ...prev,
            {
              id: newId,
              campaignId: activeCampaign!.id,
              name: values.name,
              hook: values.hook,
              crystal: "faction-quest",
              status: values.status as Quest["status"],
              priority,
            },
          ]);
        }
        break;
      }
    }

    setEntityForm(null);
  }

  function deleteEntity(kind: EntityKind, id: string) {
    if (!window.confirm(`¿Dar de baja este ${entityKindLabel[kind]}? Deja de verse en la campaña, no se borra.`)) return;
    if (kind === "location") {
      apiFetch(`/locations/${id}`, { method: "DELETE" })
        .then(() => setLocations((prev) => prev.filter((l) => l.id !== id)))
        .catch((err) => console.error("Error borrando locación:", err));
      goToEntitySection(kind);
      return;
    }
    if (kind === "faction") {
      apiFetch(`/groups/${id}`, { method: "DELETE" })
        .then(() => setGroups((prev) => prev.filter((g) => g.id !== id)))
        .catch((err) => console.error("Error borrando facción:", err));
      goToEntitySection(kind);
      return;
    }
    if (kind === "arc") {
      apiFetch(`/arcs/${id}`, { method: "DELETE" })
        .then(() => setArcs((prev) => prev.filter((a) => a.id !== id)))
        .catch((err) => console.error("Error borrando arco:", err));
      goToEntitySection(kind);
      return;
    }
    const deletedAt = new Date().toISOString();
    switch (kind) {
      case "quest":
        setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, deletedAt } : q)));
        break;
    }
    goToEntitySection(kind);
  }

  function deleteNpc(id: string) {
    if (!window.confirm("¿Dar de baja este NPC? Deja de verse en la campaña, no se borra.")) return;
    apiFetch(`/npcs/${id}`, { method: "DELETE" })
      .then(() => {
        setNpcs((prev) => prev.filter((n) => n.id !== id));
        setRoute({ name: "section", section: "npcs" });
      })
      .catch((err) => console.error("Error borrando NPC:", err));
  }

  function deletePlayer(id: string) {
    if (!window.confirm("¿Dar de baja este personaje? Deja de verse en la campaña, no se borra.")) return;
    setPlayerCharacters((prev) => prev.map((p) => (p.id === id ? { ...p, deletedAt: new Date().toISOString() } : p)));
    setRoute({ name: "section", section: "jugadores" });
  }

  function entityFormFields(kind: EntityKind): FormField[] {
    switch (kind) {
      case "arc":
        return arcFields();
      case "faction":
        return factionFields();
      case "location":
        return locationFields(campaignLocations, entityForm?.id);
      case "quest":
        return questFields();
    }
  }

  function entityFormInitialValues(
    kind: EntityKind,
    id?: string,
  ): Record<string, string> | undefined {
    if (!id) return undefined;
    switch (kind) {
      case "arc": {
        const a = arcs.find((x) => x.id === id);
        return a
          ? { label: a.label, summary: a.summary, order: String(a.order), status: a.status }
          : undefined;
      }
      case "faction": {
        const g = groups.find((x) => x.id === id);
        return g ? { name: g.name, description: g.description } : undefined;
      }
      case "location": {
        const l = locations.find((x) => x.id === id);
        return l
          ? {
              name: l.name,
              locationType: l.locationType,
              parentId: l.parentId ?? "",
              description: l.description,
            }
          : undefined;
      }
      case "quest": {
        const q = quests.find((x) => x.id === id);
        return q
          ? {
              name: q.name,
              hook: q.hook,
              status: q.status,
              priority: String(q.priority),
            }
          : undefined;
      }
    }
  }

  const selectedNpc =
    route.name === "npc-detail" || route.name === "npc-edit"
      ? npcs.find((n) => n.id === route.npcId)
      : undefined;

  const selectedPlayer =
    route.name === "player-detail" || route.name === "player-edit"
      ? playerCharacters.find((p) => p.id === route.playerId)
      : undefined;

  const activeNav: DashboardSection =
    route.name === "section"
      ? route.section
      : route.name === "npc-detail" ||
          route.name === "npc-edit" ||
          route.name === "npc-create"
        ? "npcs"
        : route.name === "player-detail" ||
            route.name === "player-edit" ||
            route.name === "player-create"
          ? "jugadores"
          : route.name === "session-plan" || route.name === "session-edit"
            ? "sesiones"
            : route.name === "entity-detail"
              ? entityKindSection[route.kind]
              : "resumen";

  // Los números de sesión no son necesariamente contiguos (ej. S03 -> S05,
  // salteando un interludio/planificación descartada) — el próximo número
  // tiene que salir del máximo real usado, no de la cantidad de sesiones.
  const highestSessionNumber = campaignArcs.reduce((max, a) => {
    const arcMax = a.sessions.reduce((m, s) => Math.max(m, Number(s.n.replace(/\D/g, "")) || 0), 0);
    return Math.max(max, arcMax);
  }, 0);
  const nextSessionNumber = highestSessionNumber + 1;

  // "Jugar sesión" no debería crear una entrada suelta si ya hay una
  // planificada sin jugar — toma la más reciente (mayor número) y la abre
  // directo en modo "confirmar como jugada" en vez de loguear una nueva.
  const pendingPlannedSession = campaignArcs.reduce<{ arcId: string; sessionN: string; num: number } | undefined>((best, a) => {
    for (const s of a.sessions) {
      if (s.played) continue;
      const num = Number(s.n.replace(/\D/g, "")) || 0;
      if (!best || num > best.num) best = { arcId: a.id, sessionN: s.n, num };
    }
    return best;
  }, undefined);

  function startPlaySession() {
    if (pendingPlannedSession) {
      setRoute({ name: "session-edit", arcId: pendingPlannedSession.arcId, sessionN: pendingPlannedSession.sessionN, autoConfirm: true });
    } else {
      setNewSessionOpen(true);
    }
  }

  function goToEntitySection(kind: EntityKind) {
    setRoute({ name: "section", section: entityKindSection[kind] });
  }

  return (
    <div className="app">
      {route.name === "campaigns" || !activeCampaign ? (
        <div className="app__stage">
          <CampaignSelector
            campaigns={campaigns}
            onSelect={selectCampaign}
            onCreate={() => setNewCampaignOpen(true)}
          />
        </div>
      ) : (
        <AppShell
          campaignName={activeCampaign.name}
          activeNav={activeNav}
          onNavigate={(section) => setRoute({ name: "section", section })}
          onBackToCampaigns={() => setRoute({ name: "campaigns" })}
        >
          {route.name === "section" && route.section === "resumen" && (
            <CampaignDashboard
              campaign={activeCampaign}
              arcs={campaignArcs}
              npcs={campaignNpcs}
              quests={campaignQuests}
              onNavigate={(section) => setRoute({ name: "section", section })}
              onSelectNpc={(npcId) => setRoute({ name: "npc-detail", npcId })}
              onStartSession={startPlaySession}
              onReindex={handleReindex}
              reindexing={reindexing}
            />
          )}
          {route.name === "section" && route.section === "npcs" && (
            <NpcList
              npcs={campaignNpcs}
              onSelect={(npcId) => setRoute({ name: "npc-detail", npcId })}
              onCreate={() => setRoute({ name: "npc-create" })}
            />
          )}
          {route.name === "section" && route.section === "sesiones" && (
            <SessionsTimeline
              arcs={campaignArcs}
              onPlaySession={startPlaySession}
              onPlanSession={() => setRoute({ name: "session-plan" })}
              onOpenSession={(arcId, sessionN) => setRoute({ name: "session-edit", arcId, sessionN })}
            />
          )}
          {route.name === "section" && route.section === "arcos" && (
            <ArcsList
              arcs={campaignArcs}
              onSelect={(id) =>
                setRoute({ name: "entity-detail", kind: "arc", id })
              }
              onCreate={() => setEntityForm({ kind: "arc" })}
            />
          )}
          {route.name === "section" && route.section === "locaciones" && (
            <LocationsList
              locations={campaignLocations}
              onSelect={(id) =>
                setRoute({ name: "entity-detail", kind: "location", id })
              }
              onCreate={() => setEntityForm({ kind: "location" })}
            />
          )}
          {route.name === "section" && route.section === "facciones" && (
            <FactionsList
              groups={campaignGroups}
              onSelect={(id) =>
                setRoute({ name: "entity-detail", kind: "faction", id })
              }
              onCreate={() => setEntityForm({ kind: "faction" })}
            />
          )}
          {route.name === "section" && route.section === "quests" && (
            <QuestsList
              quests={campaignQuests}
              onSelect={(id) =>
                setRoute({ name: "entity-detail", kind: "quest", id })
              }
              onCreate={() => setEntityForm({ kind: "quest" })}
            />
          )}
          {route.name === "section" && route.section === "jugadores" && (
            <PlayersList
              playerCharacters={campaignPlayerCharacters}
              onSelect={(playerId) => setRoute({ name: "player-detail", playerId })}
              onCreate={() => setRoute({ name: "player-create" })}
            />
          )}

          {route.name === "entity-detail" && route.kind === "arc" && (
            <ArcDetail
              arc={
                campaignArcs.find((a) => a.id === route.id) ?? campaignArcs[0]
              }
              onBack={() => goToEntitySection("arc")}
              onEdit={() => setEntityForm({ kind: "arc", id: route.id })}
              onDelete={() => deleteEntity("arc", route.id)}
            />
          )}
          {route.name === "entity-detail" && route.kind === "faction" && (
            <FactionDetail
              group={
                campaignGroups.find((g) => g.id === route.id) ??
                campaignGroups[0]
              }
              npcs={campaignNpcs}
              onBack={() => goToEntitySection("faction")}
              onSelectNpc={(npcId) => setRoute({ name: "npc-detail", npcId })}
              onEdit={() => setEntityForm({ kind: "faction", id: route.id })}
              onDelete={() => deleteEntity("faction", route.id)}
            />
          )}
          {route.name === "entity-detail" && route.kind === "location" && (
            <LocationDetail
              location={
                campaignLocations.find((l) => l.id === route.id) ??
                campaignLocations[0]
              }
              allLocations={campaignLocations}
              onBack={() => goToEntitySection("location")}
              onEdit={() => setEntityForm({ kind: "location", id: route.id })}
              onDelete={() => deleteEntity("location", route.id)}
            />
          )}
          {route.name === "entity-detail" && route.kind === "quest" && (
            <QuestDetail
              quest={
                campaignQuests.find((q) => q.id === route.id) ??
                campaignQuests[0]
              }
              onBack={() => goToEntitySection("quest")}
              onEdit={() => setEntityForm({ kind: "quest", id: route.id })}
              onDelete={() => deleteEntity("quest", route.id)}
            />
          )}

          {route.name === "npc-detail" && selectedNpc && (
            <NpcDetail
              npc={selectedNpc}
              npcs={campaignNpcs}
              quests={campaignQuests}
              onEdit={() =>
                setRoute({ name: "npc-edit", npcId: selectedNpc.id })
              }
              onBack={() => setRoute({ name: "section", section: "npcs" })}
              onDelete={() => deleteNpc(selectedNpc.id)}
            />
          )}

          {route.name === "npc-edit" && selectedNpc && (
            <NpcEdit
              npc={selectedNpc}
              npcs={campaignNpcs}
              groups={campaignGroups}
              locations={campaignLocations}
              onSave={(patch) => {
                saveNpc(selectedNpc.id, patch);
                setRoute({ name: "npc-detail", npcId: selectedNpc.id });
              }}
              onDiscard={() =>
                setRoute({ name: "npc-detail", npcId: selectedNpc.id })
              }
            />
          )}

          {route.name === "npc-create" && (
            <NpcEdit
              npc={blankNpcDraft}
              npcs={campaignNpcs}
              groups={campaignGroups}
              locations={campaignLocations}
              onSave={createNpc}
              onDiscard={() => setRoute({ name: "section", section: "npcs" })}
            />
          )}

          {route.name === "player-detail" && selectedPlayer && (
            <PlayerDetail
              player={selectedPlayer}
              npcs={campaignNpcs}
              onEdit={() => setRoute({ name: "player-edit", playerId: selectedPlayer.id })}
              onBack={() => setRoute({ name: "section", section: "jugadores" })}
              onDelete={() => deletePlayer(selectedPlayer.id)}
            />
          )}

          {route.name === "player-edit" && selectedPlayer && (
            <PlayerEdit
              player={selectedPlayer}
              npcs={campaignNpcs}
              groups={campaignGroups}
              onSave={(patch) => {
                savePlayer(selectedPlayer.id, patch);
                setRoute({ name: "player-detail", playerId: selectedPlayer.id });
              }}
              onDiscard={() => setRoute({ name: "player-detail", playerId: selectedPlayer.id })}
            />
          )}

          {route.name === "player-create" && (
            <PlayerEdit
              player={blankPlayerDraft}
              npcs={campaignNpcs}
              groups={campaignGroups}
              onSave={createPlayer}
              onDiscard={() => setRoute({ name: "section", section: "jugadores" })}
            />
          )}

          {route.name === "session-plan" && (
            <PlanSession
              nextNumber={nextSessionNumber}
              currentArc={campaignArcs.find((a) => a.status === "en_curso") ?? campaignArcs[campaignArcs.length - 1]}
              npcs={campaignNpcs}
              quests={campaignQuests}
              onConfirm={addSessionEntry}
              onCancel={() => setRoute({ name: "section", section: "sesiones" })}
            />
          )}

          {route.name === "session-edit" && (() => {
            const arc = campaignArcs.find((a) => a.id === route.arcId);
            const session = arc?.sessions.find((s) => s.n === route.sessionN);
            if (!arc || !session) return null;
            return (
              <SessionEdit
                arc={arc}
                session={session}
                npcs={campaignNpcs}
                quests={campaignQuests}
                autoConfirm={route.autoConfirm}
                onSave={(patch) => {
                  editSession(arc.id, session.n, patch);
                  setRoute({ name: "section", section: "sesiones" });
                }}
                onBack={() => setRoute({ name: "section", section: "sesiones" })}
              />
            );
          })()}
        </AppShell>
      )}

      {newSessionOpen && (
        <Modal title="Jugar sesión" onClose={() => setNewSessionOpen(false)}>
          <NewSessionForm
            nextNumber={nextSessionNumber}
            onConfirm={playSession}
            onCancel={() => setNewSessionOpen(false)}
          />
        </Modal>
      )}

      {newCampaignOpen && (
        <Modal title="Nueva campaña" onClose={() => setNewCampaignOpen(false)}>
          <NewCampaignForm
            onConfirm={createCampaign}
            onCancel={() => setNewCampaignOpen(false)}
          />
        </Modal>
      )}

      {entityForm && (
        <Modal
          title={`${entityForm.id ? "Editar" : "Nueva"} ${entityKindLabel[entityForm.kind]}`}
          onClose={() => setEntityForm(null)}
        >
          <EntityForm
            fields={entityFormFields(entityForm.kind)}
            initialValues={entityFormInitialValues(
              entityForm.kind,
              entityForm.id,
            )}
            submitLabel={entityForm.id ? "Guardar" : "Crear"}
            onConfirm={submitEntityForm}
            onCancel={() => setEntityForm(null)}
          />
        </Modal>
      )}
    </div>
  );
}
