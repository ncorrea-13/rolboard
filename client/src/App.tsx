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
  locationBreadcrumb,
  type Campaign,
  type Npc,
  type Arc,
  type ArcStatus,
  type Group,
  type Location,
  type Quest,
  type PlayerCharacter,
  type Session,
} from "./data/domain";
import {
  type EntityKind,
  entityKindLabel,
  entityKindSection,
  arcFields,
  factionFields,
  locationFields,
  questFields,
} from "./data/entityForms";
import {
  mapCampaign,
  mapNpc,
  npcToApiPayload,
  mapLocation,
  locationToApiPayload,
  mapGroup,
  groupToApiPayload,
  mapArc,
  arcToApiPayload,
  mapQuest,
  questToApiPayload,
  mapPlayerCharacter,
  playerCharacterToApiPayload,
  mapSession,
  sessionToApiPayload,
  type ApiCampaign,
  type ApiNpc,
  type ApiLocation,
  type ApiGroup,
  type ApiArc,
  type ApiQuest,
  type ApiPlayerCharacter,
  type ApiSession,
} from "./lib/apiMappers";

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
  | {
      name: "session-edit";
      sessionId: string;
      autoConfirm?: boolean;
    }
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
  const [npcs, setNpcs] = useState<Npc[]>([]);

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

  const [quests, setQuests] = useState<Quest[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiQuest[]>(`/campaigns/${activeCampaignId}/quests`)
      .then((data) => setQuests((data ?? []).map(mapQuest)))
      .catch((err) => console.error("Error cargando quests:", err));
  }, [activeCampaignId]);
  const [playerCharacters, setPlayerCharacters] = useState<PlayerCharacter[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiPlayerCharacter[]>(`/campaigns/${activeCampaignId}/player-characters`)
      .then((data) => setPlayerCharacters((data ?? []).map(mapPlayerCharacter)))
      .catch((err) => console.error("Error cargando personajes:", err));
  }, [activeCampaignId]);

  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiSession[]>(`/campaigns/${activeCampaignId}/sessions`)
      .then((data) => setSessions((data ?? []).map(mapSession)))
      .catch((err) => console.error("Error cargando sesiones:", err));
  }, [activeCampaignId]);

  const [reindexing, setReindexing] = useState(false);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [entityForm, setEntityForm] = useState<{
    kind: EntityKind;
    id?: string;
  } | null>(null);

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);

  const campaignArcs = arcs.filter(
    (a) => a.campaignId === activeCampaignId && !a.deletedAt,
  );
  const campaignGroups = groups.filter(
    (g) => g.campaignId === activeCampaignId && !g.deletedAt,
  );
  const campaignLocations = locations.filter(
    (l) => l.campaignId === activeCampaignId && !l.deletedAt,
  );
  const campaignNpcs = npcs
    .filter((n) => n.campaignId === activeCampaignId && !n.deletedAt)
    .map((n) => {
      const loc = n.locationId ? campaignLocations.find((l) => l.id === n.locationId) : undefined;
      return loc ? { ...n, location: locationBreadcrumb(loc, campaignLocations) } : n;
    });
  const campaignQuests = quests.filter(
    (q) => q.campaignId === activeCampaignId && !q.deletedAt,
  );
  const campaignPlayerCharacters = playerCharacters.filter(
    (p) => p.campaignId === activeCampaignId && !p.deletedAt,
  );
  const campaignSessions = sessions
    .filter((s) => s.campaignId === activeCampaignId && !s.deletedAt)
    .sort((a, b) => a.sessionNumber - b.sessionNumber || a.subNumber - b.subNumber);

  const nextSessionNumber =
    campaignSessions.reduce((max, s) => Math.max(max, s.sessionNumber), 0) + 1;

  const plannedSessions = campaignSessions.filter((s) => s.sessionType === "planning");
  const pendingPlannedSession = plannedSessions[plannedSessions.length - 1];

  function selectCampaign(id: string) {
    setActiveCampaignId(id);
    setRoute({ name: "section", section: "resumen" });
  }

  function createCampaign(campaign: Omit<Campaign, "id">, vaultPath: string) {
    apiFetch<ApiCampaign>("/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: campaign.name,
        system: campaign.system,
        description: "",
        vault_path: vaultPath,
      }),
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
      .then(() =>
        setNpcs((prev) => prev.map((n) => (n.id === id ? merged : n))),
      )
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
        // mapNpc ya trae locationId real del backend. faction/links no tienen
        // backing todavía (npc_groups/npc_relations son indexer-only) — se conservan del draft.
        const npc: Npc = {
          ...mapNpc(created),
          faction: draft.faction,
          links: draft.links,
        };
        setNpcs((prev) => [...prev, npc]);
        setRoute({ name: "npc-detail", npcId: npc.id });
      })
      .catch((err) => console.error("Error creando NPC:", err));
  }

  function savePlayer(id: string, patch: Partial<PlayerCharacter>) {
    const current = playerCharacters.find((p) => p.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    apiFetch(`/player-characters/${id}`, {
      method: "PUT",
      body: JSON.stringify(playerCharacterToApiPayload(merged)),
    })
      .then(() =>
        setPlayerCharacters((prev) => prev.map((p) => (p.id === id ? merged : p))),
      )
      .catch((err) => console.error("Error guardando personaje:", err));
  }

  function createPlayer(patch: Partial<PlayerCharacter>) {
    const playerName = patch.playerName ?? "";
    const characterName = patch.characterName ?? "";
    const draft: PlayerCharacter = {
      ...blankPlayerDraft,
      ...patch,
      campaignId: activeCampaign!.id,
      obsidianPath: `Jugadores/${playerName}/${characterName}.md`,
    };
    apiFetch<ApiPlayerCharacter>(`/campaigns/${activeCampaign!.id}/player-characters`, {
      method: "POST",
      body: JSON.stringify(playerCharacterToApiPayload(draft)),
    })
      .then((created) => {
        // faction/links no tienen backing todavía (pc_groups es indexer-only) — se conservan del draft.
        const player: PlayerCharacter = {
          ...mapPlayerCharacter(created),
          faction: draft.faction,
          links: draft.links,
        };
        setPlayerCharacters((prev) => [...prev, player]);
        setRoute({ name: "player-detail", playerId: player.id });
      })
      .catch((err) => console.error("Error creando personaje:", err));
  }

  function saveSession(id: string, patch: Partial<Session>) {
    const current = sessions.find((s) => s.id === id);
    if (!current) return;
    const draft: Session = { ...current, ...patch };
    apiFetch<ApiSession>(`/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(sessionToApiPayload(draft)),
    })
      .then((saved) => {
        const session = mapSession(saved);
        setSessions((prev) => prev.map((s) => (s.id === id ? session : s)));
        setRoute({ name: "section", section: "sesiones" });
      })
      .catch((err) => console.error("Error guardando sesión:", err));
  }

  const defaultSessionArc =
    campaignArcs.find((a) => a.status === "en_curso") ??
    campaignArcs[campaignArcs.length - 1];

  function createSession(
    values: { sessionType: Session["sessionType"]; date: string; summary: string },
    expectedNpcIds: string[] = [],
    expectedQuestIds: string[] = [],
  ) {
    const draft: Session = {
      id: "",
      campaignId: activeCampaign!.id,
      arcId: defaultSessionArc?.id,
      sessionNumber: nextSessionNumber,
      subNumber: 0,
      sessionType: values.sessionType,
      date: values.date,
      summary: values.summary,
      prepNotes: "",
    };
    apiFetch<ApiSession>(`/campaigns/${activeCampaign!.id}/sessions`, {
      method: "POST",
      body: JSON.stringify(sessionToApiPayload(draft)),
    })
      .then((saved) => {
        const session = mapSession(saved);
        setSessions((prev) => [...prev, session]);
        Promise.all([
          ...expectedNpcIds.map((npcId) =>
            apiFetch(`/sessions/${session.id}/npcs`, {
              method: "POST",
              body: JSON.stringify({ npc_id: Number(npcId) }),
            }),
          ),
          ...expectedQuestIds.map((questId) =>
            apiFetch(`/sessions/${session.id}/quests`, {
              method: "POST",
              body: JSON.stringify({ quest_id: Number(questId) }),
            }),
          ),
        ]).catch((err) => console.error("Error asociando sesión:", err));
        setRoute({ name: "section", section: "sesiones" });
      })
      .catch((err) => console.error("Error creando sesión:", err));
  }

  function planSession(values: {
    date: string;
    summary: string;
    expectedNpcIds: string[];
    expectedQuestIds: string[];
  }) {
    createSession(
      { sessionType: "planning", date: values.date, summary: values.summary },
      values.expectedNpcIds,
      values.expectedQuestIds,
    );
  }

  function playSession(values: { date: string; summary: string }) {
    createSession({ sessionType: "session", date: values.date, summary: values.summary });
    setNewSessionOpen(false);
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
            };
        const payload = JSON.stringify(arcToApiPayload(draft));
        const request = id
          ? apiFetch<ApiArc>(`/arcs/${id}`, { method: "PUT", body: payload })
          : apiFetch<ApiArc>(`/campaigns/${activeCampaign!.id}/arcs`, {
              method: "POST",
              body: payload,
            });
        request
          .then((saved) => {
            // mapArc no trae meta — se conserva del draft/actual.
            const arc = {
              ...mapArc(saved),
              meta: current?.meta ?? "",
            };
            setArcs((prev) =>
              id ? prev.map((a) => (a.id === id ? arc : a)) : [...prev, arc],
            );
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
          ? apiFetch<ApiGroup>(`/groups/${id}`, {
              method: "PUT",
              body: payload,
            })
          : apiFetch<ApiGroup>(`/campaigns/${activeCampaign!.id}/groups`, {
              method: "POST",
              body: payload,
            });
        request
          .then((saved) => {
            // GetByID/Update no calculan member_count (siempre 0) — se conserva el real ya cargado por List.
            const group = {
              ...mapGroup(saved),
              memberCount: current?.memberCount ?? 0,
            };
            setGroups((prev) =>
              id
                ? prev.map((g) => (g.id === id ? group : g))
                : [...prev, group],
            );
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
          ? apiFetch<ApiLocation>(`/locations/${id}`, {
              method: "PUT",
              body: payload,
            })
          : apiFetch<ApiLocation>(
              `/campaigns/${activeCampaign!.id}/locations`,
              { method: "POST", body: payload },
            );
        request
          .then((saved) => {
            const location = mapLocation(saved);
            setLocations((prev) =>
              id
                ? prev.map((l) => (l.id === id ? location : l))
                : [...prev, location],
            );
          })
          .catch((err) => console.error("Error guardando locación:", err));
        break;
      }
      case "quest": {
        const priority = (Number(values.priority) || 3) as Quest["priority"];
        const current = id ? quests.find((q) => q.id === id) : undefined;
        const draft: Quest = current
          ? { ...current, name: values.name, hook: values.hook, status: values.status as Quest["status"], priority }
          : {
              id: "",
              campaignId: activeCampaign!.id,
              name: values.name,
              hook: values.hook,
              crystal: "faction-quest",
              status: values.status as Quest["status"],
              priority,
            };
        const payload = JSON.stringify(questToApiPayload(draft));
        const request = id
          ? apiFetch<ApiQuest>(`/quests/${id}`, { method: "PUT", body: payload })
          : apiFetch<ApiQuest>(`/campaigns/${activeCampaign!.id}/quests`, { method: "POST", body: payload });
        request
          .then((saved) => {
            const quest = mapQuest(saved);
            setQuests((prev) => (id ? prev.map((q) => (q.id === id ? quest : q)) : [...prev, quest]));
          })
          .catch((err) => console.error("Error guardando quest:", err));
        break;
      }
    }

    setEntityForm(null);
  }

  function deleteEntity(kind: EntityKind, id: string) {
    if (
      !window.confirm(
        `¿Dar de baja este ${entityKindLabel[kind]}? Deja de verse en la campaña, no se borra.`,
      )
    )
      return;
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
    apiFetch(`/quests/${id}`, { method: "DELETE" })
      .then(() => setQuests((prev) => prev.filter((q) => q.id !== id)))
      .catch((err) => console.error("Error borrando quest:", err));
    goToEntitySection(kind);
  }

  function deleteNpc(id: string) {
    if (
      !window.confirm(
        "¿Dar de baja este NPC? Deja de verse en la campaña, no se borra.",
      )
    )
      return;
    apiFetch(`/npcs/${id}`, { method: "DELETE" })
      .then(() => {
        setNpcs((prev) => prev.filter((n) => n.id !== id));
        setRoute({ name: "section", section: "npcs" });
      })
      .catch((err) => console.error("Error borrando NPC:", err));
  }

  function deletePlayer(id: string) {
    if (
      !window.confirm(
        "¿Dar de baja este personaje? Deja de verse en la campaña, no se borra.",
      )
    )
      return;
    apiFetch(`/player-characters/${id}`, { method: "DELETE" })
      .then(() => setPlayerCharacters((prev) => prev.filter((p) => p.id !== id)))
      .catch((err) => console.error("Error borrando personaje:", err));
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
          ? {
              label: a.label,
              summary: a.summary,
              order: String(a.order),
              status: a.status,
            }
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

  function startPlaySession() {
    if (pendingPlannedSession) {
      setRoute({
        name: "session-edit",
        sessionId: pendingPlannedSession.id,
        autoConfirm: true,
      });
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
              sessions={campaignSessions}
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
              sessions={campaignSessions}
              onPlaySession={startPlaySession}
              onPlanSession={() => setRoute({ name: "session-plan" })}
              onOpenSession={(sessionId) =>
                setRoute({ name: "session-edit", sessionId })
              }
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
              onSelect={(playerId) =>
                setRoute({ name: "player-detail", playerId })
              }
              onCreate={() => setRoute({ name: "player-create" })}
            />
          )}

          {route.name === "entity-detail" && route.kind === "arc" && (
            <ArcDetail
              arc={
                campaignArcs.find((a) => a.id === route.id) ?? campaignArcs[0]
              }
              sessions={campaignSessions.filter((s) => s.arcId === route.id)}
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
              campaignId={activeCampaignId!}
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
              campaignId={activeCampaignId!}
              onEdit={() =>
                setRoute({ name: "player-edit", playerId: selectedPlayer.id })
              }
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
                setRoute({
                  name: "player-detail",
                  playerId: selectedPlayer.id,
                });
              }}
              onDiscard={() =>
                setRoute({ name: "player-detail", playerId: selectedPlayer.id })
              }
            />
          )}

          {route.name === "player-create" && (
            <PlayerEdit
              player={blankPlayerDraft}
              npcs={campaignNpcs}
              groups={campaignGroups}
              onSave={createPlayer}
              onDiscard={() =>
                setRoute({ name: "section", section: "jugadores" })
              }
            />
          )}

          {route.name === "session-plan" && (
            <PlanSession
              nextNumber={nextSessionNumber}
              currentArc={defaultSessionArc}
              npcs={campaignNpcs}
              quests={campaignQuests}
              onConfirm={planSession}
              onCancel={() =>
                setRoute({ name: "section", section: "sesiones" })
              }
            />
          )}

          {route.name === "session-edit" &&
            (() => {
              const session = campaignSessions.find((s) => s.id === route.sessionId);
              if (!session) return null;
              const arc = campaignArcs.find((a) => a.id === session.arcId);
              return (
                <SessionEdit
                  arc={arc}
                  session={session}
                  autoConfirm={route.autoConfirm}
                  onSave={(patch) => saveSession(session.id, patch)}
                  onBack={() =>
                    setRoute({ name: "section", section: "sesiones" })
                  }
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
