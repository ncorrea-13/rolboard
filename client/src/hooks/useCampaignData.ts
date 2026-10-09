import { useEffect, useEffectEvent, useState } from "react";
import { ApiError, apiFetch, apiImageRequest } from "../lib/api";
import { reportError } from "../lib/notify";
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
  type TranslationKey,
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
  name: "",
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
  navigate: (route: Route, opts?: { replace?: boolean }) => void,
  notify: (message: string, type?: "success" | "error", err?: unknown) => void,
) {
  const t = useT();

  function hasRequired(fields: [TranslationKey, unknown][]): boolean {
    const missing = fields
      .filter(([, value]) => value == null || String(value).trim() === "")
      .map(([label]) => t(label));
    if (missing.length === 0) return true;
    notify(`${t("toast.missingFields")}: ${missing.join(", ")}`, "error");
    return false;
  }
  const lang = useLang();

  const loadFailed = useEffectEvent((err: unknown) => {
    notify(t("toast.errorLoading"), "error", err);
  });

  const [reloadKey, setReloadKey] = useState(0);

  const [npcs, setNpcs] = useState<Npc[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiNpc[]>(`/campaigns/${activeCampaignId}/npcs`)
      .then((data) =>
        setNpcs(
          (data ?? []).filter((n) => n.npc_kind !== "referencia").map(mapNpc),
        ),
      )
      .catch((err) => loadFailed(err));
  }, [activeCampaignId, reloadKey]);

  const [npcTypes, setNpcTypes] = useState<NpcType[]>([]);
  setNpcTypeRegistry(npcTypes);

  useEffect(() => {
    setNpcTypes([]);
    if (!activeCampaignId) return;
    let stale = false;
    apiFetch<ApiNpcType[]>(`/campaigns/${activeCampaignId}/npc-types`)
      .then((data) => {
        if (!stale) setNpcTypes((data ?? []).map(mapNpcType));
      })
      .catch((err) => loadFailed(err));
    return () => {
      stale = true;
    };
  }, [activeCampaignId]);

  function npcTypeError(err: unknown) {
    const inUse = err instanceof ApiError && err.status === 409;
    notify(t(inUse ? "npcTypes.inUse" : "npcTypes.errorSaving"), "error", err);
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
      .catch((err) => loadFailed(err));
  }, [activeCampaignId, reloadKey]);

  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiGroup[]>(`/campaigns/${activeCampaignId}/groups`)
      .then((data) => setGroups((data ?? []).map(mapGroup)))
      .catch((err) => loadFailed(err));
  }, [activeCampaignId, reloadKey]);

  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiLocation[]>(`/campaigns/${activeCampaignId}/locations`)
      .then((data) => setLocations((data ?? []).map(mapLocation)))
      .catch((err) => loadFailed(err));
  }, [activeCampaignId, reloadKey]);

  const [quests, setQuests] = useState<Quest[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiQuest[]>(`/campaigns/${activeCampaignId}/quests`)
      .then((data) => setQuests((data ?? []).map(mapQuest)))
      .catch((err) => loadFailed(err));
  }, [activeCampaignId, reloadKey]);

  const [playerCharacters, setPlayerCharacters] = useState<PlayerCharacter[]>(
    [],
  );

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiPlayerCharacter[]>(
      `/campaigns/${activeCampaignId}/player-characters`,
    )
      .then((data) => setPlayerCharacters((data ?? []).map(mapPlayerCharacter)))
      .catch((err) => loadFailed(err));
  }, [activeCampaignId, reloadKey]);

  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiSession[]>(`/campaigns/${activeCampaignId}/sessions`)
      .then((data) => setSessions((data ?? []).map(mapSession)))
      .catch((err) => loadFailed(err));
  }, [activeCampaignId, reloadKey]);

  const [encounters, setEncounters] = useState<Encounter[]>([]);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiEncounter[]>(`/campaigns/${activeCampaignId}/encounters`)
      .then((data) => setEncounters((data ?? []).map(mapEncounter)))
      .catch((err) => loadFailed(err));
  }, [activeCampaignId, reloadKey]);

  const [dashboardSummary, setDashboardSummary] =
    useState<ApiDashboardSummary | null>(null);

  useEffect(() => {
    if (!activeCampaignId) return;
    apiFetch<ApiDashboardSummary>(`/campaigns/${activeCampaignId}/dashboard`)
      .then(setDashboardSummary)
      .catch((err) => loadFailed(err));
  }, [activeCampaignId, reloadKey]);

  const reloadCampaignData = () => setReloadKey((k) => k + 1);

  const [reindexing, setReindexing] = useState(false);

  function handleReindex() {
    if (!activeCampaign || reindexing) return;
    setReindexing(true);
    apiFetch(`/campaigns/${activeCampaign.id}/reindex`, { method: "POST" })
      .then(() => {
        setReloadKey((k) => k + 1);
        notify(t("toast.reindexed"));
      })
      .catch((err) => {
        notify(t("toast.errorReindexing"), "error", err);
      })
      .finally(() => setReindexing(false));
  }

  const hasVault = !!activeCampaign?.vaultPath;
  const withoutVaultPath = <T extends { obsidianPath?: string }>(x: T): T =>
    hasVault || !x.obsidianPath ? x : { ...x, obsidianPath: "" };

  const campaignArcs = arcs
    .filter((a) => a.campaignId === activeCampaignId && !a.deletedAt)
    .map(withoutVaultPath);
  const campaignGroups = groups
    .filter((g) => g.campaignId === activeCampaignId && !g.deletedAt)
    .map(withoutVaultPath);
  const campaignLocations = locations
    .filter((l) => l.campaignId === activeCampaignId && !l.deletedAt)
    .map(withoutVaultPath);
  const campaignNpcs = npcs
    .filter((n) => n.campaignId === activeCampaignId && !n.deletedAt)
    .map((n) => {
      const loc = n.locationId
        ? campaignLocations.find((l) => l.id === n.locationId)
        : undefined;
      return withoutVaultPath(
        loc
          ? { ...n, location: locationBreadcrumb(loc, campaignLocations) }
          : n,
      );
    });
  const campaignQuests = quests.filter(
    (q) => q.campaignId === activeCampaignId && !q.deletedAt,
  );
  const campaignPlayerCharacters = playerCharacters
    .filter((p) => p.campaignId === activeCampaignId && !p.deletedAt)
    .map(withoutVaultPath);
  const campaignEncounters = encounters
    .filter((e) => e.campaignId === activeCampaignId && !e.deletedAt)
    .sort((a, b) => Number(b.id) - Number(a.id));
  const campaignSessions = sessions
    .filter((s) => s.campaignId === activeCampaignId && !s.deletedAt)
    .map(withoutVaultPath)
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
    if (
      !hasRequired([
        ["common.name", merged.name],
        ["common.type", merged.crystal],
      ])
    )
      return false;
    apiFetch(`/npcs/${id}`, {
      method: "PUT",
      body: JSON.stringify(npcToApiPayload(merged)),
    })
      .then(() =>
        setNpcs((prev) => prev.map((n) => (n.id === id ? merged : n))),
      )
      .catch((err) => {
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounNpc")}`,
          "error",
          err,
        );
      });
  }

  function createNpc(
    patch: Partial<Npc>,
    image?: File,
  ): Promise<string | undefined> {
    const draft: Npc = {
      ...blankNpcDraft,
      ...patch,
      campaignId: activeCampaign!.id,
    };
    if (
      !hasRequired([
        ["common.name", draft.name],
        ["common.type", draft.crystal],
      ])
    )
      return Promise.resolve(undefined);
    return apiFetch<ApiNpc>(`/campaigns/${activeCampaign!.id}/npcs`, {
      method: "POST",
      body: JSON.stringify(npcToApiPayload(draft)),
    })
      .then((created) => {
        const npc = mapNpc(created);
        setNpcs((prev) => [...prev, npc]);
        if (image) uploadNpcImage(npc.id, image).catch(() => {});
        navigate({ name: "npc-detail", npcId: npc.id }, { replace: true });
        return npc.id;
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounNpc")}`,
          "error",
          err,
        );
        return undefined;
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
        navigate({ name: "section", section: "npcs" }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounNpc")}`,
          "error",
          err,
        );
      });
  }

  function savePlayer(id: string, patch: Partial<PlayerCharacter>) {
    const current = playerCharacters.find((p) => p.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    if (
      !hasRequired([
        ["playerEdit.characterName", merged.characterName],
        ["playerEdit.player", merged.playerName],
      ])
    )
      return false;
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
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounCharacter")}`,
          "error",
          err,
        );
      });
  }

  function createPlayer(patch: Partial<PlayerCharacter>, image?: File) {
    const draft: PlayerCharacter = {
      ...blankPlayerDraft,
      ...patch,
      campaignId: activeCampaign!.id,
    };
    if (
      !hasRequired([
        ["playerEdit.characterName", draft.characterName],
        ["playerEdit.player", draft.playerName],
      ])
    )
      return false;
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
        if (image) uploadPlayerImage(player.id, image).catch(() => {});
        navigate(
          { name: "player-detail", playerId: player.id },
          { replace: true },
        );
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounCharacter")}`,
          "error",
          err,
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
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounCharacter")}`,
          "error",
          err,
        );
      });
    navigate({ name: "section", section: "jugadores" }, { replace: true });
  }

  function saveSession(id: string, patch: Partial<Session>) {
    const current = sessions.find((s) => s.id === id);
    if (!current) return;
    const draft: Session = { ...current, ...patch };
    if (
      !hasRequired([
        ["toast.missingDate", draft.sessionType === "planning" || draft.date],
      ])
    )
      return false;
    apiFetch<ApiSession>(`/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(sessionToApiPayload(draft)),
    })
      .then((saved) => {
        const session = mapSession(saved);
        setSessions((prev) => prev.map((s) => (s.id === id ? session : s)));
        navigate({ name: "session-detail", sessionId: id }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounSession")}`,
          "error",
          err,
        );
      });
  }

  function deleteSession(id: string) {
    if (!window.confirm(t("confirm.deleteSession"))) return;
    apiFetch(`/sessions/${id}`, { method: "DELETE" })
      .then(() => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        navigate({ name: "section", section: "sesiones" }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounSession")}`,
          "error",
          err,
        );
      });
  }

  function planSession(values: {
    date: string;
    summary: string;
    arcId?: string;
    expectedNpcIds: string[];
    expectedQuestIds: string[];
  }) {
    const { expectedNpcIds, expectedQuestIds } = values;
    const draft: Session = {
      id: "",
      campaignId: activeCampaign!.id,
      arcId: values.arcId,
      sessionNumber: nextSessionNumber,
      subNumber: 0,
      sessionType: "planning",
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
        ]).catch((err) => reportError("toast.errorLinkingSession", err));
        navigate({ name: "section", section: "sesiones" }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounSession")}`,
          "error",
          err,
        );
      });
  }

  function openPlanSession() {
    navigate(
      pendingPlannedSession
        ? { name: "session-edit", sessionId: pendingPlannedSession.id }
        : { name: "session-plan" },
    );
  }

  function startPlaySession() {
    if (!pendingPlannedSession) return;
    navigate({
      name: "session-edit",
      sessionId: pendingPlannedSession.id,
      autoConfirm: true,
    });
  }

  function saveFaction(id: string, patch: Partial<Group>) {
    const current = groups.find((g) => g.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    if (!hasRequired([["common.name", merged.name]])) return false;
    apiFetch<ApiGroup>(`/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(groupToApiPayload(merged)),
    })
      .then((saved) => {
        const group = { ...mapGroup(saved), memberCount: current.memberCount };
        setGroups((prev) => prev.map((g) => (g.id === id ? group : g)));
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounFaction")}`,
          "error",
          err,
        );
      });
  }

  function createFaction(patch: Partial<Group>, image?: File) {
    const draft: Group = {
      ...blankFactionDraft,
      ...patch,
      campaignId: activeCampaign!.id,
    };
    if (!hasRequired([["common.name", draft.name]])) return false;
    apiFetch<ApiGroup>(`/campaigns/${activeCampaign!.id}/groups`, {
      method: "POST",
      body: JSON.stringify(groupToApiPayload(draft)),
    })
      .then((created) => {
        const group = mapGroup(created);
        setGroups((prev) => [...prev, group]);
        if (image) uploadGroupImage(group.id, image).catch(() => {});
        navigate(
          { name: "entity-detail", kind: "faction", id: group.id },
          { replace: true },
        );
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounFaction")}`,
          "error",
          err,
        );
      });
  }

  function saveLocation(id: string, patch: Partial<Location>) {
    const current = locations.find((l) => l.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    if (
      !hasRequired([
        ["common.name", merged.name],
        ["common.type", merged.locationType],
      ])
    )
      return false;
    apiFetch<ApiLocation>(`/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(locationToApiPayload(merged)),
    })
      .then((saved) => {
        const location = mapLocation(saved);
        setLocations((prev) => prev.map((l) => (l.id === id ? location : l)));
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounLocation")}`,
          "error",
          err,
        );
      });
  }

  function createLocation(patch: Partial<Location>, image?: File) {
    const draft: Location = {
      ...blankLocationDraft,
      ...patch,
      campaignId: activeCampaign!.id,
    };
    if (
      !hasRequired([
        ["common.name", draft.name],
        ["common.type", draft.locationType],
      ])
    )
      return false;
    apiFetch<ApiLocation>(`/campaigns/${activeCampaign!.id}/locations`, {
      method: "POST",
      body: JSON.stringify(locationToApiPayload(draft)),
    })
      .then((created) => {
        const location = mapLocation(created);
        setLocations((prev) => [...prev, location]);
        if (image) uploadLocationImage(location.id, image).catch(() => {});
        navigate(
          { name: "entity-detail", kind: "location", id: location.id },
          { replace: true },
        );
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounLocation")}`,
          "error",
          err,
        );
      });
  }

  function saveArc(id: string, patch: Partial<Arc>) {
    const current = arcs.find((a) => a.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    if (
      !hasRequired([
        ["arcEdit.nameLabel", merged.label],
        ["toast.invalidOrder", merged.order || ""],
      ])
    )
      return false;
    apiFetch<ApiArc>(`/arcs/${id}`, {
      method: "PUT",
      body: JSON.stringify(arcToApiPayload(merged)),
    })
      .then((saved) => {
        const arc = { ...mapArc(saved), meta: current.meta };
        setArcs((prev) => prev.map((a) => (a.id === id ? arc : a)));
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounArc")}`,
          "error",
          err,
        );
      });
  }

  function createArc(patch: Partial<Arc>) {
    const draft: Arc = {
      ...blankArcDraft,
      ...patch,
      campaignId: activeCampaign!.id,
    };
    if (
      !hasRequired([
        ["arcEdit.nameLabel", draft.label],
        ["toast.invalidOrder", draft.order || ""],
      ])
    )
      return false;
    apiFetch<ApiArc>(`/campaigns/${activeCampaign!.id}/arcs`, {
      method: "POST",
      body: JSON.stringify(arcToApiPayload(draft)),
    })
      .then((created) => {
        const arc = mapArc(created);
        setArcs((prev) => [...prev, arc]);
        navigate(
          { name: "entity-detail", kind: "arc", id: arc.id },
          { replace: true },
        );
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounArc")}`,
          "error",
          err,
        );
      });
  }

  function saveQuest(id: string, patch: Partial<Quest>) {
    const current = quests.find((q) => q.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    if (!hasRequired([["questEdit.title", merged.name]])) return false;
    apiFetch<ApiQuest>(`/quests/${id}`, {
      method: "PUT",
      body: JSON.stringify(questToApiPayload(merged)),
    })
      .then((saved) => {
        const quest = mapQuest(saved);
        setQuests((prev) => prev.map((q) => (q.id === id ? quest : q)));
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounQuest")}`,
          "error",
          err,
        );
      });
  }

  function createQuest(patch: Partial<Quest>) {
    const draft: Quest = {
      ...blankQuestDraft,
      ...patch,
      campaignId: activeCampaign!.id,
    };
    if (!hasRequired([["questEdit.title", draft.name]])) return false;
    apiFetch<ApiQuest>(`/campaigns/${activeCampaign!.id}/quests`, {
      method: "POST",
      body: JSON.stringify(questToApiPayload(draft)),
    })
      .then((created) => {
        const quest = mapQuest(created);
        setQuests((prev) => [...prev, quest]);
        navigate(
          { name: "entity-detail", kind: "quest", id: quest.id },
          { replace: true },
        );
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounQuest")}`,
          "error",
          err,
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
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounEncounter")}`,
          "error",
          err,
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
        navigate({ name: "encounter-detail", encounterId: encounter.id });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounEncounter")}`,
          "error",
          err,
        );
      });
  }

  function deleteEncounter(id: string) {
    if (!window.confirm(t("confirm.deleteEncounter"))) return;
    apiFetch(`/encounters/${id}`, { method: "DELETE" })
      .then(() => {
        setEncounters((prev) => prev.filter((e) => e.id !== id));
        navigate({ name: "section", section: "encuentros" }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounEncounter")}`,
          "error",
          err,
        );
      });
  }

  function goToEntitySection(kind: EntityKind) {
    navigate({ name: "section", section: entityKindSection[kind] });
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
          notify(
            `${t("common.toastErrorDeleting")} ${t("common.nounLocation")}`,
            "error",
            err,
          );
        });
      goToEntitySection(kind);
      return;
    }
    if (kind === "faction") {
      apiFetch(`/groups/${id}`, { method: "DELETE" })
        .then(() => setGroups((prev) => prev.filter((g) => g.id !== id)))
        .catch((err) => {
          notify(
            `${t("common.toastErrorDeleting")} ${t("common.nounFaction")}`,
            "error",
            err,
          );
        });
      goToEntitySection(kind);
      return;
    }
    if (kind === "arc") {
      apiFetch(`/arcs/${id}`, { method: "DELETE" })
        .then(() => setArcs((prev) => prev.filter((a) => a.id !== id)))
        .catch((err) => {
          notify(
            `${t("common.toastErrorDeleting")} ${t("common.nounArc")}`,
            "error",
            err,
          );
        });
      goToEntitySection(kind);
      return;
    }
    apiFetch(`/quests/${id}`, { method: "DELETE" })
      .then(() => setQuests((prev) => prev.filter((q) => q.id !== id)))
      .catch((err) => {
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounQuest")}`,
          "error",
          err,
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
        notify(t("common.toastErrorSaving"), "error", err);
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
        notify(t("common.toastErrorDeleting"), "error", err);
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
        notify(t("common.toastErrorSaving"), "error", err);
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
        notify(t("common.toastErrorDeleting"), "error", err);
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
        notify(t("common.toastErrorSaving"), "error", err);
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
        notify(t("common.toastErrorDeleting"), "error", err);
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
        notify(t("common.toastErrorSaving"), "error", err);
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
        notify(t("common.toastErrorDeleting"), "error", err);
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
    hasPlannedSession: !!pendingPlannedSession,
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
    startPlaySession,
    openPlanSession,
    reloadCampaignData,
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
