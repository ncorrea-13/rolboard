import { useEffect, useEffectEvent, useState } from "react";
import "./App.css";
import {
  apiFetch,
  ApiError,
  loginToCampaign,
  loginAsAdmin,
  logoutAdmin,
  hasAdminSecret,
  isLocalMode,
  checkAdminSession,
  describeError,
} from "./lib/api";
import { CampaignLoginForm } from "./components/CampaignLoginForm";
import { AdminSecretForm } from "./components/AdminSecretForm";
import { useT } from "./lib/i18n";
import { AppShell } from "./components/AppShell";
import { SiteFooter } from "./components/SiteFooter";
import { Modal } from "./components/Modal";
import { Toast } from "./components/Toast";
import { PlanSession } from "./screens/PlanSession";
import { SessionEdit } from "./screens/SessionEdit";
import { SessionDetail } from "./screens/SessionDetail";
import { NewCampaignForm } from "./components/NewCampaignForm";
import { CampaignSettingsForm } from "./components/CampaignSettingsForm";
import { CampaignSelector } from "./screens/CampaignSelector";
import { Splash } from "./screens/Splash";
import {
  CampaignDashboard,
  type DashboardSection,
} from "./screens/CampaignDashboard";
import { NpcList } from "./screens/NpcList";
import { NpcDetail } from "./screens/NpcDetail";
import { NpcEdit } from "./screens/NpcEdit";
import { PlayerDetail } from "./screens/PlayerDetail";
import { PlayerEdit } from "./screens/PlayerEdit";
import { ArcEdit } from "./screens/ArcEdit";
import { QuestEdit } from "./screens/QuestEdit";
import { FactionEdit } from "./screens/FactionEdit";
import { LocationEdit } from "./screens/LocationEdit";
import { SessionsTimeline } from "./screens/SessionsTimeline";
import { ArcsList } from "./screens/ArcsList";
import { FactionsList } from "./screens/FactionsList";
import { LocationsList } from "./screens/LocationsList";
import { QuestsList } from "./screens/QuestsList";
import { PlayersList } from "./screens/PlayersList";
import { EncountersList } from "./screens/EncountersList";
import { EncounterDetail } from "./screens/EncounterDetail";
import { Wardails } from "./screens/Wardails";
import { Help } from "./screens/Help";
import type { NpcTypesApi } from "./components/NpcTypesManager";
import {
  ArcDetail,
  FactionDetail,
  LocationDetail,
  QuestDetail,
} from "./screens/EntityDetails";
import type { Campaign } from "./data/domain";
import { entityKindSection } from "./data/entityForms";
import {
  mapCampaign,
  mapCampaignSummary,
  mapNpc,
  mapQuest,
  mapSession,
  type ApiCampaign,
  type ApiCampaignSummary,
} from "./lib/apiMappers";
import type { Route } from "./types";
import { currentLocation, routeToPath } from "./lib/routes";
import { RouterContext } from "./lib/router";
import { setErrorReporter } from "./lib/notify";
import { withViewTransition } from "./lib/motion";
import { useCampaignData, blankDrafts } from "./hooks/useCampaignData";

type HistoryMode = "push" | "replace" | "none";

export default function App() {
  const t = useT();
  const [route, setRoute] = useState<Route>({ name: "campaigns" });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [login, setLogin] = useState<{
    campaignId: string;
    route: Route;
  } | null>(null);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminGateOpen, setAdminGateOpen] = useState(false);
  const [adminGateAction, setAdminGateAction] = useState<(() => void) | null>(
    null,
  );
  const [, forceAdminRerender] = useState(0);
  const [showSplash, setShowSplash] = useState(
    () => window.location.pathname === "/",
  );
  const [booting, setBooting] = useState(() => {
    const loc = currentLocation();
    return !loc.help && loc.campaignId !== null;
  });

  const [helpOpen, setHelpOpen] = useState(
    () => window.location.pathname === "/help",
  );

  function show(next: Route, campaignId: string | null, mode: HistoryMode) {
    if (mode !== "none") {
      const path = routeToPath(next, campaignId);
      const state = { route: next };
      if (mode === "push" && path !== window.location.pathname) {
        window.history.pushState(state, "", path);
      } else {
        window.history.replaceState(state, "", path);
      }
    }
    withViewTransition(() => setRoute(next), "route");
  }

  function navigate(next: Route, opts?: { replace?: boolean }) {
    show(next, activeCampaignId, opts?.replace ? "replace" : "push");
  }

  const onPopState = useEffectEvent(() => {
    const loc = currentLocation();
    if (loc.help) {
      withViewTransition(() => setHelpOpen(true), "help");
      return;
    }
    if (helpOpen) {
      withViewTransition(() => {
        setHelpOpen(false);
        setRoute(loc.route);
      }, "help");
      if (loc.campaignId && loc.campaignId !== activeCampaignId) {
        selectCampaign(loc.campaignId, loc.route, "none");
      }
      return;
    }
    if (loc.campaignId && loc.campaignId !== activeCampaignId) {
      selectCampaign(loc.campaignId, loc.route, "none");
    } else {
      withViewTransition(() => setRoute(loc.route), "route");
    }
  });

  useEffect(() => {
    const onPop = () => onPopState();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const bootFromUrl = useEffectEvent(() => {
    const loc = currentLocation();
    if (loc.help || !loc.campaignId) return;
    selectCampaign(loc.campaignId, loc.route, "replace").finally(() =>
      setBooting(false),
    );
  });

  useEffect(() => bootFromUrl(), []);

  function openHelp() {
    window.history.pushState({ help: true }, "", "/help");
    window.scrollTo(0, 0);
    withViewTransition(() => setHelpOpen(true), "help");
  }

  function closeHelp() {
    if (window.history.state?.help) {
      window.history.back();
      return;
    }
    window.history.replaceState(null, "", "/");
    withViewTransition(() => setHelpOpen(false), "help");
  }

  const campaignsLoadFailed = useEffectEvent((err: unknown) => {
    notify(t("toast.errorLoading"), "error", err);
  });

  useEffect(() => {
    apiFetch<ApiCampaignSummary[]>("/campaigns")
      .then((data) => setCampaigns((data ?? []).map(mapCampaignSummary)))
      .catch(campaignsLoadFailed);
    checkAdminSession().then(() => forceAdminRerender((v) => v + 1));
  }, []);

  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: "success" | "error";
  } | null>(null);

  function notify(
    message: string,
    type: "success" | "error" = "success",
    err?: unknown,
  ) {
    if (err !== undefined) message = `${message}: ${describeError(err, t)}`;
    setToast({ id: Date.now(), message, type });
  }

  useEffect(() =>
    setErrorReporter((key, err, extra) =>
      notify(extra ? `${t(key)}: ${extra}` : t(key), "error", err),
    ),
  );

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);

  const {
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
    hasPlannedSession,
    defaultSessionArc,
    npcTypes,
    createNpcType,
    updateNpcType,
    deleteNpcType,
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
  } = useCampaignData(activeCampaignId, activeCampaign, navigate, notify);

  const npcTypesApi: NpcTypesApi = {
    types: npcTypes,
    onCreate: createNpcType,
    onUpdate: updateNpcType,
    onDelete: deleteNpcType,
  };

  async function selectCampaign(
    id: string,
    target: Route = { name: "section", section: "resumen" },
    mode: HistoryMode = "push",
  ) {
    try {
      await apiFetch(`/campaigns/${id}/dashboard`);
      setActiveCampaignId(id);
      show(target, id, mode);
    } catch (err) {
      if (mode !== "push") show({ name: "campaigns" }, null, "replace");
      if (err instanceof ApiError && err.status === 401) {
        setLogin({ campaignId: id, route: target });
      } else {
        notify(t("toast.errorLoading"), "error", err);
      }
      return;
    }

    apiFetch<ApiCampaign>(`/campaigns/${id}`)
      .then((full) => {
        const mapped = mapCampaign(full);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === mapped.id ? mapped : c)),
        );
      })
      .catch((err) => {
        notify(t("toast.errorLoading"), "error", err);
      });
  }

  function openNewCampaign() {
    if (hasAdminSecret()) {
      setNewCampaignOpen(true);
    } else {
      setAdminGateAction(() => () => setNewCampaignOpen(true));
      setAdminGateOpen(true);
    }
  }

  function enterAsAdmin(target: { campaignId: string; route: Route }) {
    setLogin(null);
    setAdminGateAction(
      () => () => selectCampaign(target.campaignId, target.route),
    );
    setAdminGateOpen(true);
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
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounCampaign")}`,
          "error",
          err,
        );
      });
  }

  function saveCampaignSettings(patch: {
    name: string;
    system: string;
    status: Campaign["status"];
    vaultPath: string;
  }) {
    if (!activeCampaignId) return Promise.resolve();
    return apiFetch<ApiCampaign>(`/campaigns/${activeCampaignId}`, {
      method: "PUT",
      body: JSON.stringify({
        name: patch.name,
        system: patch.system,
        description: "",
        status: patch.status,
        vault_path: patch.vaultPath,
      }),
    })
      .then((updated) => {
        const mapped = mapCampaign(updated);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === mapped.id ? mapped : c)),
        );
        setSettingsOpen(false);
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounCampaign")}`,
          "error",
          err,
        );
        throw err;
      });
  }

  function setCampaignAccessCode(code: string) {
    if (!activeCampaignId) return Promise.resolve();
    return apiFetch<void>(`/campaigns/${activeCampaignId}/access-code`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  const selectedNpc =
    route.name === "npc-detail" || route.name === "npc-edit"
      ? campaignNpcs.find((n) => n.id === route.npcId)
      : undefined;

  const selectedPlayer =
    route.name === "player-detail" || route.name === "player-edit"
      ? campaignPlayerCharacters.find((p) => p.id === route.playerId)
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
          : route.name === "session-plan" ||
              route.name === "session-detail" ||
              route.name === "session-edit"
            ? "sesiones"
            : route.name === "entity-detail"
              ? entityKindSection[route.kind]
              : route.name === "arc-edit" || route.name === "arc-create"
                ? "arcos"
                : route.name === "quest-edit" || route.name === "quest-create"
                  ? "quests"
                  : route.name === "faction-edit" ||
                      route.name === "faction-create"
                    ? "facciones"
                    : route.name === "location-edit" ||
                        route.name === "location-create"
                      ? "locaciones"
                      : route.name === "encounter-detail"
                        ? "encuentros"
                        : "resumen";

  if (helpOpen) {
    return (
      <div className="app">
        <div className="app__stage">
          <Help onBack={closeHelp} />
        </div>
        <SiteFooter onHelp={openHelp} />
      </div>
    );
  }

  if (
    booting ||
    (activeCampaignId !== null && route.name !== "campaigns" && !activeCampaign)
  ) {
    return <div className="app" />;
  }

  if (showSplash) {
    return <Splash onContinue={() => setShowSplash(false)} onHelp={openHelp} />;
  }

  const ui = (
    <div className="app">
      {route.name === "campaigns" || !activeCampaign ? (
        <div className="app__stage">
          <CampaignSelector
            campaigns={campaigns}
            onSelect={selectCampaign}
            onCreate={openNewCampaign}
          />
        </div>
      ) : (
        <AppShell
          campaignName={activeCampaign.name}
          activeNav={activeNav}
          onNavigate={(section) => navigate({ name: "section", section })}
          onBackToCampaigns={() => navigate({ name: "campaigns" })}
          onOpenSettings={() => setSettingsOpen(true)}
          onHelp={openHelp}
          onAdminLogout={
            hasAdminSecret() && !isLocalMode()
              ? async () => {
                  await logoutAdmin();
                  setSettingsOpen(false);
                  setActiveCampaignId(null);
                  navigate({ name: "campaigns" });
                  forceAdminRerender((v) => v + 1);
                }
              : undefined
          }
        >
          {route.name === "section" && route.section === "resumen" && (
            <CampaignDashboard
              campaign={activeCampaign}
              arcs={campaignArcs}
              npcs={campaignNpcs}
              quests={campaignQuests}
              nextSessionNumber={nextSessionNumber}
              hasPlannedSession={hasPlannedSession}
              summary={
                dashboardSummary
                  ? {
                      activeQuests: (dashboardSummary.active_quests ?? []).map(
                        mapQuest,
                      ),
                      recentNpcs: (dashboardSummary.recent_npcs ?? []).map(
                        mapNpc,
                      ),
                      lastSession: dashboardSummary.last_session
                        ? mapSession(dashboardSummary.last_session)
                        : undefined,
                    }
                  : null
              }
              onNavigate={(section) => navigate({ name: "section", section })}
              onOpenSession={(sessionId) => {
                const session = campaignSessions.find(
                  (s) => s.id === sessionId,
                );
                navigate(
                  session?.sessionType === "planning"
                    ? { name: "session-edit", sessionId, autoConfirm: true }
                    : { name: "session-detail", sessionId },
                );
              }}
              onStartSession={startPlaySession}
              onPlanSession={openPlanSession}
              onReindex={handleReindex}
              reindexing={reindexing}
              imageVersion={imageVersion}
            />
          )}
          {route.name === "section" && route.section === "npcs" && (
            <NpcList
              npcs={campaignNpcs}
              onCreate={() => navigate({ name: "npc-create" })}
              npcTypesApi={npcTypesApi}
              imageVersion={imageVersion}
            />
          )}
          {route.name === "section" && route.section === "sesiones" && (
            <SessionsTimeline
              arcs={campaignArcs}
              sessions={campaignSessions}
              nextSessionNumber={nextSessionNumber}
              hasPlannedSession={hasPlannedSession}
              onPlaySession={startPlaySession}
              onPlanSession={openPlanSession}
            />
          )}
          {route.name === "section" && route.section === "arcos" && (
            <ArcsList
              arcs={campaignArcs}
              onCreate={() => navigate({ name: "arc-create" })}
            />
          )}
          {route.name === "section" && route.section === "locaciones" && (
            <LocationsList
              locations={campaignLocations}
              onCreate={() => navigate({ name: "location-create" })}
              imageVersion={imageVersion}
            />
          )}
          {route.name === "section" && route.section === "facciones" && (
            <FactionsList
              groups={campaignGroups}
              onCreate={() => navigate({ name: "faction-create" })}
              imageVersion={imageVersion}
            />
          )}
          {route.name === "section" && route.section === "quests" && (
            <QuestsList
              quests={campaignQuests}
              onCreate={() => navigate({ name: "quest-create" })}
            />
          )}
          {route.name === "section" && route.section === "jugadores" && (
            <PlayersList
              playerCharacters={campaignPlayerCharacters}
              onCreate={() => navigate({ name: "player-create" })}
              imageVersion={imageVersion}
            />
          )}
          {route.name === "section" && route.section === "encuentros" && (
            <EncountersList
              encounters={campaignEncounters}
              sessions={campaignSessions}
              onCreate={() => createEncounter()}
            />
          )}
          {route.name === "section" && route.section === "wardails" && (
            <Wardails campaignId={activeCampaignId!} notify={notify} />
          )}

          {route.name === "entity-detail" &&
            route.kind === "arc" &&
            (() => {
              const arc = campaignArcs.find((x) => x.id === route.id);
              if (!arc) return null;
              return (
                <ArcDetail
                  arc={arc}
                  sessions={campaignSessions.filter(
                    (s) => s.arcId === route.id,
                  )}
                  vaultName={activeCampaign!.vaultPath}
                  campaignId={activeCampaignId!}
                  onBack={() => goToEntitySection("arc")}
                  onEdit={() => navigate({ name: "arc-edit", arcId: route.id })}
                  onDelete={() => deleteEntity("arc", route.id)}
                  onStart={() => saveArc(route.id, { status: "en_curso" })}
                  onClose={() => saveArc(route.id, { status: "cerrado" })}
                />
              );
            })()}
          {route.name === "entity-detail" &&
            route.kind === "faction" &&
            (() => {
              const group = campaignGroups.find((x) => x.id === route.id);
              if (!group) return null;
              return (
                <FactionDetail
                  group={group}
                  npcs={campaignNpcs}
                  playerCharacters={campaignPlayerCharacters}
                  vaultName={activeCampaign!.vaultPath}
                  campaignId={activeCampaignId!}
                  onBack={() => goToEntitySection("faction")}
                  onEdit={() =>
                    navigate({ name: "faction-edit", factionId: route.id })
                  }
                  onDelete={() => deleteEntity("faction", route.id)}
                  imageVersion={imageVersion}
                />
              );
            })()}
          {route.name === "entity-detail" &&
            route.kind === "location" &&
            (() => {
              const location = campaignLocations.find((x) => x.id === route.id);
              if (!location) return null;
              return (
                <LocationDetail
                  location={location}
                  allLocations={campaignLocations}
                  vaultName={activeCampaign!.vaultPath}
                  campaignId={activeCampaignId!}
                  onBack={() => goToEntitySection("location")}
                  onEdit={() =>
                    navigate({ name: "location-edit", locationId: route.id })
                  }
                  onDelete={() => deleteEntity("location", route.id)}
                  imageVersion={imageVersion}
                />
              );
            })()}
          {route.name === "entity-detail" &&
            route.kind === "quest" &&
            (() => {
              const quest = campaignQuests.find((x) => x.id === route.id);
              if (!quest) return null;
              return (
                <QuestDetail
                  quest={quest}
                  onBack={() => goToEntitySection("quest")}
                  onEdit={() =>
                    navigate({ name: "quest-edit", questId: route.id })
                  }
                  onDelete={() => deleteEntity("quest", route.id)}
                />
              );
            })()}

          {route.name === "npc-detail" && selectedNpc && (
            <NpcDetail
              npc={selectedNpc}
              npcs={campaignNpcs}
              quests={campaignQuests}
              campaignId={activeCampaignId!}
              vaultName={activeCampaign!.vaultPath}
              onEdit={() =>
                navigate({ name: "npc-edit", npcId: selectedNpc.id })
              }
              onBack={() => navigate({ name: "section", section: "npcs" })}
              onDelete={() => deleteNpc(selectedNpc.id)}
              imageVersion={imageVersion}
            />
          )}

          {route.name === "faction-edit" &&
            (() => {
              const group = campaignGroups.find(
                (g) => g.id === route.factionId,
              );
              if (!group) return null;
              return (
                <FactionEdit
                  key={group.id}
                  group={group}
                  npcs={campaignNpcs}
                  onSave={(patch) => {
                    if (saveFaction(group.id, patch) === false) return;
                    navigate(
                      {
                        name: "entity-detail",
                        kind: "faction",
                        id: group.id,
                      },
                      { replace: true },
                    );
                  }}
                  onDiscard={() =>
                    navigate({
                      name: "entity-detail",
                      kind: "faction",
                      id: group.id,
                    })
                  }
                  imageVersion={imageVersion}
                  onUploadImage={(file) => uploadGroupImage(group.id, file)}
                  onRemoveImage={() => removeGroupImage(group.id)}
                />
              );
            })()}

          {route.name === "faction-create" && (
            <FactionEdit
              group={blankDrafts.faction}
              npcs={campaignNpcs}
              onSave={createFaction}
              onDiscard={() => goToEntitySection("faction")}
            />
          )}

          {route.name === "location-edit" &&
            (() => {
              const location = campaignLocations.find(
                (l) => l.id === route.locationId,
              );
              if (!location) return null;
              return (
                <LocationEdit
                  key={location.id}
                  location={location}
                  locations={campaignLocations}
                  onSave={(patch) => {
                    if (saveLocation(location.id, patch) === false) return;
                    navigate(
                      {
                        name: "entity-detail",
                        kind: "location",
                        id: location.id,
                      },
                      { replace: true },
                    );
                  }}
                  onDiscard={() =>
                    navigate({
                      name: "entity-detail",
                      kind: "location",
                      id: location.id,
                    })
                  }
                  imageVersion={imageVersion}
                  onUploadImage={(file) =>
                    uploadLocationImage(location.id, file)
                  }
                  onRemoveImage={() => removeLocationImage(location.id)}
                />
              );
            })()}

          {route.name === "location-create" && (
            <LocationEdit
              location={blankDrafts.location}
              locations={campaignLocations}
              onSave={createLocation}
              onDiscard={() => goToEntitySection("location")}
            />
          )}

          {route.name === "arc-edit" &&
            (() => {
              const arc = campaignArcs.find((a) => a.id === route.arcId);
              if (!arc) return null;
              return (
                <ArcEdit
                  key={arc.id}
                  arc={arc}
                  hasVault={!!activeCampaign?.vaultPath}
                  onSave={(patch) => {
                    if (saveArc(arc.id, patch) === false) return;
                    navigate(
                      {
                        name: "entity-detail",
                        kind: "arc",
                        id: arc.id,
                      },
                      { replace: true },
                    );
                  }}
                  onDiscard={() =>
                    navigate({
                      name: "entity-detail",
                      kind: "arc",
                      id: arc.id,
                    })
                  }
                />
              );
            })()}

          {route.name === "arc-create" && (
            <ArcEdit
              arc={blankDrafts.arc}
              hasVault={!!activeCampaign?.vaultPath}
              onSave={createArc}
              onDiscard={() => goToEntitySection("arc")}
            />
          )}

          {route.name === "quest-edit" &&
            (() => {
              const quest = campaignQuests.find((q) => q.id === route.questId);
              if (!quest) return null;
              return (
                <QuestEdit
                  key={quest.id}
                  quest={quest}
                  onSave={(patch) => {
                    if (saveQuest(quest.id, patch) === false) return;
                    navigate(
                      {
                        name: "entity-detail",
                        kind: "quest",
                        id: quest.id,
                      },
                      { replace: true },
                    );
                  }}
                  onDiscard={() =>
                    navigate({
                      name: "entity-detail",
                      kind: "quest",
                      id: quest.id,
                    })
                  }
                />
              );
            })()}

          {route.name === "quest-create" && (
            <QuestEdit
              quest={blankDrafts.quest}
              onSave={createQuest}
              onDiscard={() => goToEntitySection("quest")}
            />
          )}

          {route.name === "npc-edit" && selectedNpc && (
            <NpcEdit
              key={selectedNpc.id}
              npc={selectedNpc}
              npcs={campaignNpcs}
              locations={campaignLocations}
              npcTypesApi={npcTypesApi}
              onSave={(patch) => {
                if (saveNpc(selectedNpc.id, patch) === false) return false;
                navigate(
                  { name: "npc-detail", npcId: selectedNpc.id },
                  { replace: true },
                );
              }}
              onDiscard={() =>
                navigate({ name: "npc-detail", npcId: selectedNpc.id })
              }
              imageVersion={imageVersion}
              onUploadImage={(file) => uploadNpcImage(selectedNpc.id, file)}
              onRemoveImage={() => removeNpcImage(selectedNpc.id)}
            />
          )}

          {route.name === "npc-create" && (
            <NpcEdit
              npc={blankDrafts.npc}
              npcs={campaignNpcs}
              locations={campaignLocations}
              npcTypesApi={npcTypesApi}
              onSave={createNpc}
              onDiscard={() => navigate({ name: "section", section: "npcs" })}
            />
          )}

          {route.name === "player-detail" && selectedPlayer && (
            <PlayerDetail
              player={selectedPlayer}
              campaignId={activeCampaignId!}
              vaultName={activeCampaign!.vaultPath}
              onEdit={() =>
                navigate({ name: "player-edit", playerId: selectedPlayer.id })
              }
              onBack={() => navigate({ name: "section", section: "jugadores" })}
              onDelete={() => deletePlayer(selectedPlayer.id)}
              imageVersion={imageVersion}
            />
          )}

          {route.name === "player-edit" && selectedPlayer && (
            <PlayerEdit
              key={selectedPlayer.id}
              player={selectedPlayer}
              onSave={(patch) => {
                if (savePlayer(selectedPlayer.id, patch) === false) return;
                navigate(
                  {
                    name: "player-detail",
                    playerId: selectedPlayer.id,
                  },
                  { replace: true },
                );
              }}
              onDiscard={() =>
                navigate({
                  name: "player-detail",
                  playerId: selectedPlayer.id,
                })
              }
              imageVersion={imageVersion}
              onUploadImage={(file) =>
                uploadPlayerImage(selectedPlayer.id, file)
              }
              onRemoveImage={() => removePlayerImage(selectedPlayer.id)}
            />
          )}

          {route.name === "player-create" && (
            <PlayerEdit
              player={blankDrafts.player}
              onSave={createPlayer}
              onDiscard={() =>
                navigate({ name: "section", section: "jugadores" })
              }
            />
          )}

          {route.name === "encounter-detail" &&
            (() => {
              const encounter = campaignEncounters.find(
                (e) => e.id === route.encounterId,
              );
              if (!encounter) return null;
              return (
                <EncounterDetail
                  key={encounter.id}
                  encounter={encounter}
                  npcs={campaignNpcs}
                  playerCharacters={campaignPlayerCharacters}
                  sessions={campaignSessions}
                  onBack={() =>
                    navigate({ name: "section", section: "encuentros" })
                  }
                  onStart={() =>
                    saveEncounter(encounter.id, { status: "activo" })
                  }
                  onClose={() =>
                    saveEncounter(encounter.id, { status: "cerrado" })
                  }
                  onReopen={() =>
                    saveEncounter(encounter.id, { status: "activo" })
                  }
                  onNextRound={() =>
                    saveEncounter(encounter.id, {
                      round: encounter.round + 1,
                    })
                  }
                  onDelete={() => deleteEncounter(encounter.id)}
                  onChangeSession={(sessionId) =>
                    saveEncounter(encounter.id, { sessionId })
                  }
                  onRename={(name) => saveEncounter(encounter.id, { name })}
                  onSyncPlayerHp={(pcId, patch) => savePlayer(pcId, patch)}
                  onSyncNpcHp={(npcId, patch) => saveNpc(npcId, patch)}
                  imageVersion={imageVersion}
                />
              );
            })()}

          {route.name === "session-plan" && (
            <PlanSession
              nextNumber={nextSessionNumber}
              currentArc={defaultSessionArc}
              arcs={campaignArcs}
              npcs={campaignNpcs}
              quests={campaignQuests}
              onConfirm={planSession}
              onCancel={() =>
                navigate({ name: "section", section: "sesiones" })
              }
            />
          )}

          {route.name === "session-detail" &&
            (() => {
              const session = campaignSessions.find(
                (s) => s.id === route.sessionId,
              );
              if (!session) return null;
              return (
                <SessionDetail
                  key={session.id}
                  campaignId={activeCampaignId!}
                  arc={campaignArcs.find((a) => a.id === session.arcId)}
                  session={session}
                  onBack={() =>
                    navigate({ name: "section", section: "sesiones" })
                  }
                  onEdit={() =>
                    navigate({ name: "session-edit", sessionId: session.id })
                  }
                  onMarkPlayed={() =>
                    navigate({
                      name: "session-edit",
                      sessionId: session.id,
                      autoConfirm: true,
                    })
                  }
                />
              );
            })()}

          {route.name === "session-edit" &&
            (() => {
              const session = campaignSessions.find(
                (s) => s.id === route.sessionId,
              );
              if (!session) return null;
              const arc = campaignArcs.find((a) => a.id === session.arcId);
              return (
                <SessionEdit
                  key={session.id}
                  arc={arc}
                  arcs={campaignArcs}
                  session={session}
                  campaignId={activeCampaignId!}
                  npcs={campaignNpcs}
                  quests={campaignQuests}
                  autoConfirm={route.autoConfirm}
                  onSave={(patch) => saveSession(session.id, patch)}
                  onDelete={() => deleteSession(session.id)}
                  onBack={() =>
                    navigate(
                      route.autoConfirm
                        ? { name: "section", section: "sesiones" }
                        : { name: "session-detail", sessionId: session.id },
                    )
                  }
                />
              );
            })()}
        </AppShell>
      )}

      {adminGateOpen && (
        <Modal
          title={t("app.modal.confirm")}
          onClose={() => setAdminGateOpen(false)}
        >
          <AdminSecretForm
            onSubmit={async (secret) => {
              await loginAsAdmin(secret);
              setAdminGateOpen(false);
              adminGateAction?.();
            }}
            onCancel={() => setAdminGateOpen(false)}
          />
        </Modal>
      )}

      {login && (
        <Modal
          title={t("app.modal.campaignCode")}
          onClose={() => setLogin(null)}
        >
          <CampaignLoginForm
            onSubmit={async (code) => {
              await loginToCampaign(login.campaignId, code);
              setLogin(null);
              await selectCampaign(login.campaignId, login.route);
            }}
            onCancel={() => setLogin(null)}
          />
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button
              onClick={() => enterAsAdmin(login)}
              style={{
                background: "none",
                border: "none",
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              {t("login.enterAsAdmin")}
            </button>
          </div>
        </Modal>
      )}

      {newCampaignOpen && (
        <Modal
          title={t("app.modal.newCampaign")}
          onClose={() => setNewCampaignOpen(false)}
        >
          <NewCampaignForm
            onConfirm={createCampaign}
            onCancel={() => setNewCampaignOpen(false)}
          />
        </Modal>
      )}

      {settingsOpen && activeCampaign && (
        <Modal
          title={t("campaignSettings.title")}
          onClose={() => setSettingsOpen(false)}
        >
          <CampaignSettingsForm
            campaign={activeCampaign}
            onSave={saveCampaignSettings}
            onSetAccessCode={setCampaignAccessCode}
            onCancel={() => setSettingsOpen(false)}
          />
        </Modal>
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      <SiteFooter onHelp={openHelp} />
    </div>
  );

  return (
    <RouterContext value={{ campaignId: activeCampaignId, navigate }}>
      {ui}
    </RouterContext>
  );
}
