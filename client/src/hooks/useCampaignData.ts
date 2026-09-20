import { useEffect, useEffectEvent, useState } from "react";
import { ApiError, apiFetch, apiImageRequest } from "../lib/api";
import {
  locationBreadcrumb,
  setNpcTypeRegistry,
  type Campaign,
  type Npc,
  type NpcType,
  type Arc,
  type Encounter,
  type Group,
  type Location,
  type Quest,
  type PlayerCharacter,
  type Session,
} from "../data/domain";
import {
  type EntityKind,
  entityKindLabel,
  entityKindSection,
} from "../data/entityForms";
import {
  mapNpc,
  mapNpcType,
  npcToApiPayload,
  mapLocation,
  locationToApiPayload,
  mapGroup,
  groupToApiPayload,
  mapArc,
  arcToApiPayload,
  mapEncounter,
  encounterToApiPayload,
  mapQuest,
  questToApiPayload,
  mapPlayerCharacter,
  playerCharacterToApiPayload,
  mapSession,
  sessionToApiPayload,
  type ApiNpc,
  type ApiNpcType,
  type ApiLocation,
  type ApiGroup,
  type ApiArc,
  type ApiEncounter,
  type ApiQuest,
  type ApiPlayerCharacter,
  type ApiSession,
  type ApiDashboardSummary,
} from "../lib/apiMappers";
import type { Route } from "../types";
import {
  useT,
  useLang,
  npcLeaderWarning,
  arcSessionsWarning,
  locationDependentsWarning,
} from "../lib/i18n";

const blankNpcDraft: Npc = {
  id: "",
  campaignId: "",
  name: "",
  role: "",
  description: "",
  crystal: "npc",
  status: "alive",
  detailLevel: "full",
  location: "",
  initials: "",
  obsidianPath: "",
  attributes: {},
  skills: {},
};

const blankPlayerDraft: PlayerCharacter = {
  id: "",
  campaignId: "",
  playerName: "",
  characterName: "",
  race: "",
  class: "",
  status: "alive",
  backstory: "",
  progressionNotes: "",
  obsidianPath: "",
  attributes: {},
  skills: {},
};

const blankFactionDraft: Group = {
  id: "",
  campaignId: "",
  name: "",
  description: "",
  alineacion: "",
  memberCount: 0,
  obsidianPath: "",
};

const blankLocationDraft: Location = {
  id: "",
  campaignId: "",
  name: "",
  locationType: "site",
  description: "",
  obsidianPath: "",
};

const blankArcDraft: Arc = {
  id: "",
  campaignId: "",
  label: "",
  summary: "",
  meta: "",
  order: 0,
  status: "planificado",
  obsidianPath: "",
};

const blankQuestDraft: Quest = {
  id: "",
  campaignId: "",
  name: "",
  hook: "",
  crystal: "faction-quest",
  status: "active",
  priority: 3,
  notes: "",
};

const blankEncounterDraft: Encounter = {
  id: "",
  campaignId: "",
  round: 1,
  status: "planificado",
};

export const blankDrafts = {
  npc: blankNpcDraft,
  player: blankPlayerDraft,
  faction: blankFactionDraft,
  location: blankLocationDraft,
  arc: blankArcDraft,
  quest: blankQuestDraft,
  encounter: blankEncounterDraft,
};

export function useCampaignData(
  activeCampaignId: string | null,
  activeCampaign: Campaign | undefined,
  setRoute: (route: Route) => void,
  setNewSessionOpen: (open: boolean) => void,
  notify: (message: string, type?: "success" | "error") => void,
) {
  const t = useT();
  const lang = useLang();

  const loadFailed = useEffectEvent((what: string, err: unknown) => {
    console.error(`Error cargando ${what}:`, err);
    notify(t("toast.errorLoading"), "error");
  });

  const [npcs, setNpcs] = useState<Npc[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiNpc[]>(`/campaigns/${activeCampaignId}/npcs`)
      .then((data) =>
        setNpcs(
          (data ?? []).filter((n) => n.npc_kind !== "referencia").map(mapNpc),
        ),
      )
      .catch((err) => loadFailed("NPCs", err));
  }, [activeCampaignId]);

  const [npcTypes, setNpcTypes] = useState<NpcType[]>([]);
  // Render-phase on purpose: children read the registry while rendering, so it must match this state.
  setNpcTypeRegistry(npcTypes);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiNpcType[]>(`/campaigns/${activeCampaignId}/npc-types`)
      .then((data) => setNpcTypes((data ?? []).map(mapNpcType)))
      .catch((err) => loadFailed("tipos de NPC", err));
  }, [activeCampaignId]);

  function npcTypeError(err: unknown) {
    console.error("Error con tipos de NPC:", err);
    const inUse = err instanceof ApiError && err.status === 409;
    notify(t(inUse ? "npcTypes.inUse" : "npcTypes.errorSaving"), "error");
    return false;
  }

  function createNpcType(label: string, color: string) {
    return apiFetch<ApiNpcType>(`/campaigns/${activeCampaignId}/npc-types`, {
      method: "POST",
      body: JSON.stringify({ label, color }),
    })
      .then((created) => {
        setNpcTypes((prev) => [...prev, mapNpcType(created)]);
        return true;
      })
      .catch(npcTypeError);
  }

  function updateNpcType(id: string, label: string, color: string) {
    return apiFetch<ApiNpcType>(`/npc-types/${id}`, {
      method: "PUT",
      body: JSON.stringify({ label, color }),
    })
      .then((updated) => {
        setNpcTypes((prev) =>
          prev.map((x) => (x.id === id ? mapNpcType(updated) : x)),
        );
        return true;
      })
      .catch(npcTypeError);
  }

  function deleteNpcType(id: string) {
    return apiFetch(`/npc-types/${id}`, { method: "DELETE" })
      .then(() => {
        setNpcTypes((prev) => prev.filter((x) => x.id !== id));
        return true;
      })
      .catch(npcTypeError);
  }

  const [arcs, setArcs] = useState<Arc[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiArc[]>(`/campaigns/${activeCampaignId}/arcs`)
      .then((data) => setArcs((data ?? []).map(mapArc)))
      .catch((err) => loadFailed("arcos", err));
  }, [activeCampaignId]);

  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiGroup[]>(`/campaigns/${activeCampaignId}/groups`)
      .then((data) => setGroups((data ?? []).map(mapGroup)))
      .catch((err) => loadFailed("facciones", err));
  }, [activeCampaignId]);

  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiLocation[]>(`/campaigns/${activeCampaignId}/locations`)
      .then((data) => setLocations((data ?? []).map(mapLocation)))
      .catch((err) => loadFailed("locaciones", err));
  }, [activeCampaignId]);

  const [quests, setQuests] = useState<Quest[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiQuest[]>(`/campaigns/${activeCampaignId}/quests`)
      .then((data) => setQuests((data ?? []).map(mapQuest)))
      .catch((err) => loadFailed("quests", err));
  }, [activeCampaignId]);

  const [playerCharacters, setPlayerCharacters] = useState<PlayerCharacter[]>(
    [],
  );

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiPlayerCharacter[]>(
      `/campaigns/${activeCampaignId}/player-characters`,
    )
      .then((data) => setPlayerCharacters((data ?? []).map(mapPlayerCharacter)))
      .catch((err) => loadFailed("personajes", err));
  }, [activeCampaignId]);

  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiSession[]>(`/campaigns/${activeCampaignId}/sessions`)
      .then((data) => setSessions((data ?? []).map(mapSession)))
      .catch((err) => loadFailed("sesiones", err));
  }, [activeCampaignId]);

  const [encounters, setEncounters] = useState<Encounter[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiEncounter[]>(`/campaigns/${activeCampaignId}/encounters`)
      .then((data) => setEncounters((data ?? []).map(mapEncounter)))
      .catch((err) => loadFailed("encuentros", err));
  }, [activeCampaignId]);

  const [dashboardSummary, setDashboardSummary] =
    useState<ApiDashboardSummary | null>(null);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiDashboardSummary>(`/campaigns/${activeCampaignId}/dashboard`)
      .then(setDashboardSummary)
      .catch((err) => loadFailed("dashboard", err));
  }, [activeCampaignId]);

  const [reindexing, setReindexing] = useState(false);

  function handleReindex() {
    if (!activeCampaign || reindexing) return;
    setReindexing(true);
    apiFetch(`/campaigns/${activeCampaign.id}/reindex`, { method: "POST" })
      .then(() => notify(t("toast.reindexed")))
      .catch((err) => {
        console.error("Error reindexando:", err);
        notify(t("toast.errorReindexing"), "error");
      })
      .finally(() => setReindexing(false));
  }

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
      const loc = n.locationId
        ? campaignLocations.find((l) => l.id === n.locationId)
        : undefined;
      return loc
        ? { ...n, location: locationBreadcrumb(loc, campaignLocations) }
        : n;
    });
  const campaignQuests = quests.filter(
    (q) => q.campaignId === activeCampaignId && !q.deletedAt,
  );
  const campaignPlayerCharacters = playerCharacters.filter(
    (p) => p.campaignId === activeCampaignId && !p.deletedAt,
  );
  const campaignEncounters = encounters
    .filter((e) => e.campaignId === activeCampaignId && !e.deletedAt)
    .sort((a, b) => Number(b.id) - Number(a.id));
  const campaignSessions = sessions
    .filter((s) => s.campaignId === activeCampaignId && !s.deletedAt)
    .sort(
      (a, b) => a.sessionNumber - b.sessionNumber || a.subNumber - b.subNumber,
    );

  const plannedSessions = campaignSessions.filter(
    (s) => s.sessionType === "planning",
  );
  const pendingPlannedSession = plannedSessions[plannedSessions.length - 1];

  const nextSessionNumber =
    pendingPlannedSession?.sessionNumber ??
    campaignSessions.reduce((max, s) => Math.max(max, s.sessionNumber), 0) + 1;

  const defaultSessionArc =
    campaignArcs.find((a) => a.status === "en_curso") ??
    campaignArcs[campaignArcs.length - 1];

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
      .catch((err) => {
        console.error("Error guardando NPC:", err);
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounNpc")}`,
          "error",
        );
      });
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
        const npc = mapNpc(created);
        setNpcs((prev) => [...prev, npc]);
        setRoute({ name: "npc-detail", npcId: npc.id });
      })
      .catch((err) => {
        console.error("Error creando NPC:", err);
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounNpc")}`,
          "error",
        );
      });
  }

  function deleteNpc(id: string) {
    const ledFactions = groups.filter((g) => g.liderNpcId === id);
    const warning =
      ledFactions.length > 0 ? npcLeaderWarning(lang, ledFactions.length) : "";
    if (!window.confirm(`${t("confirm.deactivateNpc")}${warning}`)) return;
    apiFetch(`/npcs/${id}`, { method: "DELETE" })
      .then(() => {
        setNpcs((prev) => prev.filter((n) => n.id !== id));
        setRoute({ name: "section", section: "npcs" });
      })
      .catch((err) => {
        console.error("Error borrando NPC:", err);
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounNpc")}`,
          "error",
        );
      });
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
        setPlayerCharacters((prev) =>
          prev.map((p) => (p.id === id ? merged : p)),
        ),
      )
      .catch((err) => {
        console.error("Error guardando personaje:", err);
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounCharacter")}`,
          "error",
        );
      });
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
    apiFetch<ApiPlayerCharacter>(
      `/campaigns/${activeCampaign!.id}/player-characters`,
      {
        method: "POST",
        body: JSON.stringify(playerCharacterToApiPayload(draft)),
      },
    )
      .then((created) => {
        const player = mapPlayerCharacter(created);
        setPlayerCharacters((prev) => [...prev, player]);
        setRoute({ name: "player-detail", playerId: player.id });
      })
      .catch((err) => {
        console.error("Error creando personaje:", err);
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounCharacter")}`,
          "error",
        );
      });
  }

  function deletePlayer(id: string) {
    if (!window.confirm(t("confirm.deactivateCharacter"))) return;
    apiFetch(`/player-characters/${id}`, { method: "DELETE" })
      .then(() =>
        setPlayerCharacters((prev) => prev.filter((p) => p.id !== id)),
      )
      .catch((err) => {
        console.error("Error borrando personaje:", err);
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounCharacter")}`,
          "error",
        );
      });
    setRoute({ name: "section", section: "jugadores" });
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
      .catch((err) => {
        console.error("Error guardando sesión:", err);
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounSession")}`,
          "error",
        );
      });
  }

  function deleteSession(id: string) {
    if (!window.confirm(t("confirm.deleteSession"))) return;
    apiFetch(`/sessions/${id}`, { method: "DELETE" })
      .then(() => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        setRoute({ name: "section", section: "sesiones" });
      })
      .catch((err) => {
        console.error("Error borrando sesión:", err);
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounSession")}`,
          "error",
        );
      });
  }

  function createSession(
    values: {
      sessionType: Session["sessionType"];
      date: string;
      summary: string;
    },
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
      .catch((err) => {
        console.error("Error creando sesión:", err);
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounSession")}`,
          "error",
        );
      });
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
    createSession({
      sessionType: "session",
      date: values.date,
      summary: values.summary,
    });
    setNewSessionOpen(false);
  }

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

  function saveFaction(id: string, patch: Partial<Group>) {
    const current = groups.find((g) => g.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    apiFetch<ApiGroup>(`/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(groupToApiPayload(merged)),
    })
      .then((saved) => {
        const group = { ...mapGroup(saved), memberCount: current.memberCount };
        setGroups((prev) => prev.map((g) => (g.id === id ? group : g)));
      })
      .catch((err) => {
        console.error("Error guardando facción:", err);
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounFaction")}`,
          "error",
        );
      });
  }

  function createFaction(patch: Partial<Group>) {
    const draft: Group = {
      ...blankFactionDraft,
      ...patch,
      campaignId: activeCampaign!.id,
      obsidianPath: `Facciones/${patch.name}.md`,
    };
    apiFetch<ApiGroup>(`/campaigns/${activeCampaign!.id}/groups`, {
      method: "POST",
      body: JSON.stringify(groupToApiPayload(draft)),
    })
      .then((created) => {
        const group = mapGroup(created);
        setGroups((prev) => [...prev, group]);
        setRoute({ name: "entity-detail", kind: "faction", id: group.id });
      })
      .catch((err) => {
        console.error("Error creando facción:", err);
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounFaction")}`,
          "error",
        );
      });
  }

  function saveLocation(id: string, patch: Partial<Location>) {
    const current = locations.find((l) => l.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    apiFetch<ApiLocation>(`/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(locationToApiPayload(merged)),
    })
      .then((saved) => {
        const location = mapLocation(saved);
        setLocations((prev) => prev.map((l) => (l.id === id ? location : l)));
      })
      .catch((err) => {
        console.error("Error guardando locación:", err);
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounLocation")}`,
          "error",
        );
      });
  }

  function createLocation(patch: Partial<Location>) {
    const draft: Location = {
      ...blankLocationDraft,
      ...patch,
      campaignId: activeCampaign!.id,
      obsidianPath: `Locaciones/${patch.name}.md`,
    };
    apiFetch<ApiLocation>(`/campaigns/${activeCampaign!.id}/locations`, {
      method: "POST",
      body: JSON.stringify(locationToApiPayload(draft)),
    })
      .then((created) => {
        const location = mapLocation(created);
        setLocations((prev) => [...prev, location]);
        setRoute({ name: "entity-detail", kind: "location", id: location.id });
      })
      .catch((err) => {
        console.error("Error creando locación:", err);
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounLocation")}`,
          "error",
        );
      });
  }

  function saveArc(id: string, patch: Partial<Arc>) {
    const current = arcs.find((a) => a.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    apiFetch<ApiArc>(`/arcs/${id}`, {
      method: "PUT",
      body: JSON.stringify(arcToApiPayload(merged)),
    })
      .then((saved) => {
        const arc = { ...mapArc(saved), meta: current.meta };
        setArcs((prev) => prev.map((a) => (a.id === id ? arc : a)));
      })
      .catch((err) => {
        console.error("Error guardando arco:", err);
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounArc")}`,
          "error",
        );
      });
  }

  function createArc(patch: Partial<Arc>) {
    const draft: Arc = {
      ...blankArcDraft,
      ...patch,
      campaignId: activeCampaign!.id,
      obsidianPath: patch.obsidianPath || `Arcos/${patch.label}.md`,
    };
    apiFetch<ApiArc>(`/campaigns/${activeCampaign!.id}/arcs`, {
      method: "POST",
      body: JSON.stringify(arcToApiPayload(draft)),
    })
      .then((created) => {
        const arc = mapArc(created);
        setArcs((prev) => [...prev, arc]);
        setRoute({ name: "entity-detail", kind: "arc", id: arc.id });
      })
      .catch((err) => {
        console.error("Error creando arco:", err);
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounArc")}`,
          "error",
        );
      });
  }

  function saveQuest(id: string, patch: Partial<Quest>) {
    const current = quests.find((q) => q.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    apiFetch<ApiQuest>(`/quests/${id}`, {
      method: "PUT",
      body: JSON.stringify(questToApiPayload(merged)),
    })
      .then((saved) => {
        const quest = mapQuest(saved);
        setQuests((prev) => prev.map((q) => (q.id === id ? quest : q)));
      })
      .catch((err) => {
        console.error("Error guardando quest:", err);
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounQuest")}`,
          "error",
        );
      });
  }

  function createQuest(patch: Partial<Quest>) {
    const draft: Quest = {
      ...blankQuestDraft,
      ...patch,
      campaignId: activeCampaign!.id,
    };
    apiFetch<ApiQuest>(`/campaigns/${activeCampaign!.id}/quests`, {
      method: "POST",
      body: JSON.stringify(questToApiPayload(draft)),
    })
      .then((created) => {
        const quest = mapQuest(created);
        setQuests((prev) => [...prev, quest]);
        setRoute({ name: "entity-detail", kind: "quest", id: quest.id });
      })
      .catch((err) => {
        console.error("Error creando quest:", err);
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounQuest")}`,
          "error",
        );
      });
  }

  function saveEncounter(id: string, patch: Partial<Encounter>) {
    const current = encounters.find((e) => e.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    apiFetch<ApiEncounter>(`/encounters/${id}`, {
      method: "PUT",
      body: JSON.stringify(encounterToApiPayload(merged)),
    })
      .then((saved) => {
        const encounter = mapEncounter(saved);
        setEncounters((prev) => prev.map((e) => (e.id === id ? encounter : e)));
      })
      .catch((err) => {
        console.error("Error guardando encuentro:", err);
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounEncounter")}`,
          "error",
        );
      });
  }

  function createEncounter(patch: Partial<Encounter> = {}) {
    const draft: Encounter = {
      ...blankEncounterDraft,
      ...patch,
      campaignId: activeCampaign!.id,
    };
    apiFetch<ApiEncounter>(`/campaigns/${activeCampaign!.id}/encounters`, {
      method: "POST",
      body: JSON.stringify(encounterToApiPayload(draft)),
    })
      .then((created) => {
        const encounter = mapEncounter(created);
        setEncounters((prev) => [...prev, encounter]);
        setRoute({ name: "encounter-detail", encounterId: encounter.id });
      })
      .catch((err) => {
        console.error("Error creando encuentro:", err);
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounEncounter")}`,
          "error",
        );
      });
  }

  function deleteEncounter(id: string) {
    if (!window.confirm(t("confirm.deleteEncounter"))) return;
    apiFetch(`/encounters/${id}`, { method: "DELETE" })
      .then(() => {
        setEncounters((prev) => prev.filter((e) => e.id !== id));
        setRoute({ name: "section", section: "encuentros" });
      })
      .catch((err) => {
        console.error("Error borrando encuentro:", err);
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounEncounter")}`,
          "error",
        );
      });
  }

  function goToEntitySection(kind: EntityKind) {
    setRoute({ name: "section", section: entityKindSection[kind] });
  }

  function deleteEntity(kind: EntityKind, id: string) {
    let warning = "";
    if (kind === "arc") {
      const count = campaignSessions.filter((s) => s.arcId === id).length;
      if (count > 0) {
        warning = arcSessionsWarning(lang, count);
      }
    }
    if (kind === "location") {
      const children = campaignLocations.filter(
        (l) => l.parentId === id,
      ).length;
      const npcsHere = campaignNpcs.filter((n) => n.locationId === id).length;
      warning = locationDependentsWarning(lang, children, npcsHere);
    }
    if (
      !window.confirm(
        `${t("confirm.deactivateEntityBase")} ${entityKindLabel[lang][kind]}${t("confirm.deactivateEntitySuffix")}${warning}`,
      )
    )
      return;
    if (kind === "location") {
      apiFetch(`/locations/${id}`, { method: "DELETE" })
        .then(() => setLocations((prev) => prev.filter((l) => l.id !== id)))
        .catch((err) => {
          console.error("Error borrando locación:", err);
          notify(
            `${t("common.toastErrorDeleting")} ${t("common.nounLocation")}`,
            "error",
          );
        });
      goToEntitySection(kind);
      return;
    }
    if (kind === "faction") {
      apiFetch(`/groups/${id}`, { method: "DELETE" })
        .then(() => setGroups((prev) => prev.filter((g) => g.id !== id)))
        .catch((err) => {
          console.error("Error borrando facción:", err);
          notify(
            `${t("common.toastErrorDeleting")} ${t("common.nounFaction")}`,
            "error",
          );
        });
      goToEntitySection(kind);
      return;
    }
    if (kind === "arc") {
      apiFetch(`/arcs/${id}`, { method: "DELETE" })
        .then(() => setArcs((prev) => prev.filter((a) => a.id !== id)))
        .catch((err) => {
          console.error("Error borrando arco:", err);
          notify(
            `${t("common.toastErrorDeleting")} ${t("common.nounArc")}`,
            "error",
          );
        });
      goToEntitySection(kind);
      return;
    }
    apiFetch(`/quests/${id}`, { method: "DELETE" })
      .then(() => setQuests((prev) => prev.filter((q) => q.id !== id)))
      .catch((err) => {
        console.error("Error borrando quest:", err);
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounQuest")}`,
          "error",
        );
      });
    goToEntitySection(kind);
  }

  const [imageVersion, setImageVersion] = useState(0);

  function uploadNpcImage(id: string, file: File) {
    return apiImageRequest<ApiNpc>(`/npcs/${id}/image`, "POST", file)
      .then((updated) => {
        const mapped = mapNpc(updated);
        setNpcs((prev) => prev.map((n) => (n.id === id ? mapped : n)));
        setImageVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Error subiendo imagen de NPC:", err);
        notify(t("common.toastErrorSaving"), "error");
        throw err;
      });
  }

  function removeNpcImage(id: string) {
    return apiImageRequest<ApiNpc>(`/npcs/${id}/image`, "DELETE")
      .then((updated) => {
        const mapped = mapNpc(updated);
        setNpcs((prev) => prev.map((n) => (n.id === id ? mapped : n)));
        setImageVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Error borrando imagen de NPC:", err);
        notify(t("common.toastErrorDeleting"), "error");
        throw err;
      });
  }

  function uploadPlayerImage(id: string, file: File) {
    return apiImageRequest<ApiPlayerCharacter>(
      `/player-characters/${id}/image`,
      "POST",
      file,
    )
      .then((updated) => {
        const mapped = mapPlayerCharacter(updated);
        setPlayerCharacters((prev) =>
          prev.map((p) => (p.id === id ? mapped : p)),
        );
        setImageVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Error subiendo imagen de personaje:", err);
        notify(t("common.toastErrorSaving"), "error");
        throw err;
      });
  }

  function removePlayerImage(id: string) {
    return apiImageRequest<ApiPlayerCharacter>(
      `/player-characters/${id}/image`,
      "DELETE",
    )
      .then((updated) => {
        const mapped = mapPlayerCharacter(updated);
        setPlayerCharacters((prev) =>
          prev.map((p) => (p.id === id ? mapped : p)),
        );
        setImageVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Error borrando imagen de personaje:", err);
        notify(t("common.toastErrorDeleting"), "error");
        throw err;
      });
  }

  function uploadLocationImage(id: string, file: File) {
    return apiImageRequest<ApiLocation>(`/locations/${id}/image`, "POST", file)
      .then((updated) => {
        const mapped = mapLocation(updated);
        setLocations((prev) => prev.map((l) => (l.id === id ? mapped : l)));
        setImageVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Error subiendo imagen de locación:", err);
        notify(t("common.toastErrorSaving"), "error");
        throw err;
      });
  }

  function removeLocationImage(id: string) {
    return apiImageRequest<ApiLocation>(`/locations/${id}/image`, "DELETE")
      .then((updated) => {
        const mapped = mapLocation(updated);
        setLocations((prev) => prev.map((l) => (l.id === id ? mapped : l)));
        setImageVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Error borrando imagen de locación:", err);
        notify(t("common.toastErrorDeleting"), "error");
        throw err;
      });
  }

  function uploadGroupImage(id: string, file: File) {
    return apiImageRequest<ApiGroup>(`/groups/${id}/image`, "POST", file)
      .then((updated) => {
        const mapped = mapGroup(updated);
        setGroups((prev) => prev.map((g) => (g.id === id ? mapped : g)));
        setImageVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Error subiendo imagen de facción:", err);
        notify(t("common.toastErrorSaving"), "error");
        throw err;
      });
  }

  function removeGroupImage(id: string) {
    return apiImageRequest<ApiGroup>(`/groups/${id}/image`, "DELETE")
      .then((updated) => {
        const mapped = mapGroup(updated);
        setGroups((prev) => prev.map((g) => (g.id === id ? mapped : g)));
        setImageVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Error borrando imagen de facción:", err);
        notify(t("common.toastErrorDeleting"), "error");
        throw err;
      });
  }

  return {
    npcTypes,
    createNpcType,
    updateNpcType,
    deleteNpcType,
    campaignArcs,
    campaignGroups,
    campaignLocations,
    campaignNpcs,
    campaignQuests,
    campaignPlayerCharacters,
    campaignSessions,
    campaignEncounters,
    dashboardSummary,
    reindexing,
    handleReindex,
    nextSessionNumber,
    defaultSessionArc,
    saveNpc,
    createNpc,
    deleteNpc,
    savePlayer,
    createPlayer,
    deletePlayer,
    saveArc,
    createArc,
    saveQuest,
    createQuest,
    saveFaction,
    createFaction,
    saveLocation,
    createLocation,
    deleteEntity,
    saveSession,
    deleteSession,
    saveEncounter,
    createEncounter,
    deleteEncounter,
    planSession,
    playSession,
    startPlaySession,
    goToEntitySection,
    imageVersion,
    uploadNpcImage,
    removeNpcImage,
    uploadPlayerImage,
    removePlayerImage,
    uploadLocationImage,
    removeLocationImage,
    uploadGroupImage,
    removeGroupImage,
  };
}
