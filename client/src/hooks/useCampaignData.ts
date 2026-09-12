import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import {
  locationBreadcrumb,
  type Campaign,
  type Npc,
  type Arc,
  type Encounter,
  type Group,
  type Location,
  type Quest,
  type PlayerCharacter,
  type Session,
} from "../data/domain";
import { type EntityKind, entityKindLabel, entityKindSection } from "../data/entityForms";
import {
  mapNpc,
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

const blankNpcDraft: Npc = {
  id: "",
  campaignId: "",
  name: "",
  role: "",
  description: "",
  crystal: "npc",
  crystalLabel: "NPC",
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
    apiFetch<ApiPlayerCharacter[]>(
      `/campaigns/${activeCampaignId}/player-characters`,
    )
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

  const [encounters, setEncounters] = useState<Encounter[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiEncounter[]>(`/campaigns/${activeCampaignId}/encounters`)
      .then((data) => setEncounters((data ?? []).map(mapEncounter)))
      .catch((err) => console.error("Error cargando encuentros:", err));
  }, [activeCampaignId]);

  const [dashboardSummary, setDashboardSummary] = useState<ApiDashboardSummary | null>(null);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiDashboardSummary>(`/campaigns/${activeCampaignId}/dashboard`)
      .then(setDashboardSummary)
      .catch((err) => console.error("Error cargando dashboard:", err));
  }, [activeCampaignId]);

  const [reindexing, setReindexing] = useState(false);

  function handleReindex() {
    if (!activeCampaign || reindexing) return;
    setReindexing(true);
    apiFetch(`/campaigns/${activeCampaign.id}/reindex`, { method: "POST" })
      .then((result) => {
        console.log("Reindexado:", result);
        notify("Vault reindexado");
      })
      .catch((err) => {
        console.error("Error reindexando:", err);
        notify("Error reindexando el vault", "error");
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
      .then(() => setNpcs((prev) => prev.map((n) => (n.id === id ? merged : n))))
      .catch((err) => {
        console.error("Error guardando NPC:", err);
        notify("Error guardando NPC", "error");
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
        notify("Error creando NPC", "error");
      });
  }

  function deleteNpc(id: string) {
    const ledFactions = groups.filter((g) => g.liderNpcId === id);
    const warning =
      ledFactions.length > 0
        ? ` Es líder de ${ledFactions.length} facción(es) — van a quedar sin líder visible.`
        : "";
    if (
      !window.confirm(
        `¿Dar de baja este NPC? Deja de verse en la campaña, no se borra.${warning}`,
      )
    )
      return;
    apiFetch(`/npcs/${id}`, { method: "DELETE" })
      .then(() => {
        setNpcs((prev) => prev.filter((n) => n.id !== id));
        setRoute({ name: "section", section: "npcs" });
      })
      .catch((err) => {
        console.error("Error borrando NPC:", err);
        notify("Error borrando NPC", "error");
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
        setPlayerCharacters((prev) => prev.map((p) => (p.id === id ? merged : p))),
      )
      .catch((err) => {
        console.error("Error guardando personaje:", err);
        notify("Error guardando personaje", "error");
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
        notify("Error creando personaje", "error");
      });
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
      .catch((err) => {
        console.error("Error borrando personaje:", err);
        notify("Error borrando personaje", "error");
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
        notify("Error guardando sesión", "error");
      });
  }

  function deleteSession(id: string) {
    if (!window.confirm("¿Borrar esta sesión? No se puede deshacer.")) return;
    apiFetch(`/sessions/${id}`, { method: "DELETE" })
      .then(() => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        setRoute({ name: "section", section: "sesiones" });
      })
      .catch((err) => {
        console.error("Error borrando sesión:", err);
        notify("Error borrando sesión", "error");
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
        notify("Error creando sesión", "error");
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
        notify("Error guardando facción", "error");
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
        notify("Error creando facción", "error");
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
        notify("Error guardando locación", "error");
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
        notify("Error creando locación", "error");
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
        notify("Error guardando arco", "error");
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
        notify("Error creando arco", "error");
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
        notify("Error guardando quest", "error");
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
        notify("Error creando quest", "error");
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
        notify("Error guardando encuentro", "error");
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
        notify("Error creando encuentro", "error");
      });
  }

  function deleteEncounter(id: string) {
    if (!window.confirm("¿Borrar este encuentro? No se puede deshacer.")) return;
    apiFetch(`/encounters/${id}`, { method: "DELETE" })
      .then(() => {
        setEncounters((prev) => prev.filter((e) => e.id !== id));
        setRoute({ name: "section", section: "encuentros" });
      })
      .catch((err) => {
        console.error("Error borrando encuentro:", err);
        notify("Error borrando encuentro", "error");
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
        warning = ` Tiene ${count} sesión(es) asociada(s) — van a quedar sin arco visible.`;
      }
    }
    if (kind === "location") {
      const children = campaignLocations.filter((l) => l.parentId === id).length;
      const npcsHere = campaignNpcs.filter((n) => n.locationId === id).length;
      const parts = [];
      if (children > 0) parts.push(`${children} sub-locación(es)`);
      if (npcsHere > 0) parts.push(`${npcsHere} NPC(s)`);
      if (parts.length > 0) {
        warning = ` Tiene ${parts.join(" y ")} que dependen de esta locación — van a quedar sin referencia visible.`;
      }
    }
    if (
      !window.confirm(
        `¿Dar de baja este ${entityKindLabel[kind]}? Deja de verse en la campaña, no se borra.${warning}`,
      )
    )
      return;
    if (kind === "location") {
      apiFetch(`/locations/${id}`, { method: "DELETE" })
        .then(() => setLocations((prev) => prev.filter((l) => l.id !== id)))
        .catch((err) => {
          console.error("Error borrando locación:", err);
          notify("Error borrando locación", "error");
        });
      goToEntitySection(kind);
      return;
    }
    if (kind === "faction") {
      apiFetch(`/groups/${id}`, { method: "DELETE" })
        .then(() => setGroups((prev) => prev.filter((g) => g.id !== id)))
        .catch((err) => {
          console.error("Error borrando facción:", err);
          notify("Error borrando facción", "error");
        });
      goToEntitySection(kind);
      return;
    }
    if (kind === "arc") {
      apiFetch(`/arcs/${id}`, { method: "DELETE" })
        .then(() => setArcs((prev) => prev.filter((a) => a.id !== id)))
        .catch((err) => {
          console.error("Error borrando arco:", err);
          notify("Error borrando arco", "error");
        });
      goToEntitySection(kind);
      return;
    }
    apiFetch(`/quests/${id}`, { method: "DELETE" })
      .then(() => setQuests((prev) => prev.filter((q) => q.id !== id)))
      .catch((err) => {
        console.error("Error borrando quest:", err);
        notify("Error borrando quest", "error");
      });
    goToEntitySection(kind);
  }

  return {
    npcs,
    playerCharacters,
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
  };
}
