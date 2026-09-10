import { useEffect, useState } from "react";
import "./App.css";
import { apiFetch } from "./lib/api";
import { AppShell } from "./components/AppShell";
import { Modal } from "./components/Modal";
import { Toast } from "./components/Toast";
import { NewSessionForm } from "./components/NewSessionForm";
import { PlanSession } from "./screens/PlanSession";
import { SessionEdit } from "./screens/SessionEdit";
import { NewCampaignForm } from "./components/NewCampaignForm";
import { CampaignSelector } from "./screens/CampaignSelector";
import { CampaignDashboard, type DashboardSection } from "./screens/CampaignDashboard";
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
  mapNpc,
  mapQuest,
  mapSession,
  type ApiCampaign,
} from "./lib/apiMappers";
import type { Route } from "./types";
import { useCampaignData, blankDrafts } from "./hooks/useCampaignData";

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "campaigns" });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    apiFetch<ApiCampaign[]>("/campaigns")
      .then((data) => setCampaigns((data ?? []).map(mapCampaign)))
      .catch((err) => console.error("Error cargando campañas:", err));
  }, []);

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: "success" | "error";
  } | null>(null);

  function notify(message: string, type: "success" | "error" = "success") {
    setToast({ id: Date.now(), message, type });
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.type === "error" ? 3000 : 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);

  const {
    campaignArcs,
    campaignGroups,
    campaignLocations,
    campaignNpcs,
    campaignQuests,
    campaignPlayerCharacters,
    campaignSessions,
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
    planSession,
    playSession,
    startPlaySession,
    goToEntitySection,
  } = useCampaignData(activeCampaignId, activeCampaign, setRoute, setNewSessionOpen, notify);

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
          : route.name === "session-plan" || route.name === "session-edit"
            ? "sesiones"
            : route.name === "entity-detail"
              ? entityKindSection[route.kind]
              : route.name === "arc-edit" || route.name === "arc-create"
                ? "arcos"
                : route.name === "quest-edit" || route.name === "quest-create"
                  ? "quests"
                  : route.name === "faction-edit" || route.name === "faction-create"
                    ? "facciones"
                    : route.name === "location-edit" || route.name === "location-create"
                      ? "locaciones"
                      : "resumen";

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
              nextSessionNumber={nextSessionNumber}
              summary={
                dashboardSummary
                  ? {
                      activeQuests: (dashboardSummary.active_quests ?? []).map(mapQuest),
                      recentNpcs: (dashboardSummary.recent_npcs ?? []).map(mapNpc),
                      lastSession: dashboardSummary.last_session
                        ? mapSession(dashboardSummary.last_session)
                        : undefined,
                    }
                  : null
              }
              onNavigate={(section) => setRoute({ name: "section", section })}
              onSelectNpc={(npcId) => setRoute({ name: "npc-detail", npcId })}
              onSelectQuest={(id) =>
                setRoute({ name: "entity-detail", kind: "quest", id })
              }
              onSelectArc={(id) =>
                setRoute({ name: "entity-detail", kind: "arc", id })
              }
              onOpenSession={(sessionId) => {
                const session = campaignSessions.find((s) => s.id === sessionId);
                setRoute({
                  name: "session-edit",
                  sessionId,
                  autoConfirm: session?.sessionType === "planning",
                });
              }}
              onStartSession={startPlaySession}
              onPlanSession={() => setRoute({ name: "session-plan" })}
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
              nextSessionNumber={nextSessionNumber}
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
              onCreate={() => setRoute({ name: "arc-create" })}
            />
          )}
          {route.name === "section" && route.section === "locaciones" && (
            <LocationsList
              locations={campaignLocations}
              onSelect={(id) =>
                setRoute({ name: "entity-detail", kind: "location", id })
              }
              onCreate={() => setRoute({ name: "location-create" })}
            />
          )}
          {route.name === "section" && route.section === "facciones" && (
            <FactionsList
              groups={campaignGroups}
              onSelect={(id) =>
                setRoute({ name: "entity-detail", kind: "faction", id })
              }
              onCreate={() => setRoute({ name: "faction-create" })}
            />
          )}
          {route.name === "section" && route.section === "quests" && (
            <QuestsList
              quests={campaignQuests}
              onSelect={(id) =>
                setRoute({ name: "entity-detail", kind: "quest", id })
              }
              onCreate={() => setRoute({ name: "quest-create" })}
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
              vaultName={activeCampaign!.vaultPath}
              campaignId={activeCampaignId!}
              onBack={() => goToEntitySection("arc")}
              onEdit={() => setRoute({ name: "arc-edit", arcId: route.id })}
              onDelete={() => deleteEntity("arc", route.id)}
              onStart={() => saveArc(route.id, { status: "en_curso" })}
              onClose={() => saveArc(route.id, { status: "cerrado" })}
            />
          )}
          {route.name === "entity-detail" && route.kind === "faction" && (
            <FactionDetail
              group={
                campaignGroups.find((g) => g.id === route.id) ??
                campaignGroups[0]
              }
              npcs={campaignNpcs}
              vaultName={activeCampaign!.vaultPath}
              campaignId={activeCampaignId!}
              onBack={() => goToEntitySection("faction")}
              onSelectNpc={(npcId) => setRoute({ name: "npc-detail", npcId })}
              onEdit={() =>
                setRoute({ name: "faction-edit", factionId: route.id })
              }
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
              vaultName={activeCampaign!.vaultPath}
              campaignId={activeCampaignId!}
              onBack={() => goToEntitySection("location")}
              onEdit={() =>
                setRoute({ name: "location-edit", locationId: route.id })
              }
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
              onEdit={() => setRoute({ name: "quest-edit", questId: route.id })}
              onDelete={() => deleteEntity("quest", route.id)}
            />
          )}

          {route.name === "npc-detail" && selectedNpc && (
            <NpcDetail
              npc={selectedNpc}
              npcs={campaignNpcs}
              quests={campaignQuests}
              campaignId={activeCampaignId!}
              vaultName={activeCampaign!.vaultPath}
              onEdit={() =>
                setRoute({ name: "npc-edit", npcId: selectedNpc.id })
              }
              onBack={() => setRoute({ name: "section", section: "npcs" })}
              onDelete={() => deleteNpc(selectedNpc.id)}
            />
          )}

          {route.name === "faction-edit" &&
            (() => {
              const group = campaignGroups.find((g) => g.id === route.factionId);
              if (!group) return null;
              return (
                <FactionEdit
                  key={group.id}
                  group={group}
                  npcs={campaignNpcs}
                  onSave={(patch) => {
                    saveFaction(group.id, patch);
                    setRoute({ name: "entity-detail", kind: "faction", id: group.id });
                  }}
                  onDiscard={() =>
                    setRoute({ name: "entity-detail", kind: "faction", id: group.id })
                  }
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
              const location = campaignLocations.find((l) => l.id === route.locationId);
              if (!location) return null;
              return (
                <LocationEdit
                  key={location.id}
                  location={location}
                  locations={campaignLocations}
                  onSave={(patch) => {
                    saveLocation(location.id, patch);
                    setRoute({ name: "entity-detail", kind: "location", id: location.id });
                  }}
                  onDiscard={() =>
                    setRoute({ name: "entity-detail", kind: "location", id: location.id })
                  }
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
                  onSave={(patch) => {
                    saveArc(arc.id, patch);
                    setRoute({ name: "entity-detail", kind: "arc", id: arc.id });
                  }}
                  onDiscard={() =>
                    setRoute({ name: "entity-detail", kind: "arc", id: arc.id })
                  }
                />
              );
            })()}

          {route.name === "arc-create" && (
            <ArcEdit
              arc={blankDrafts.arc}
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
                    saveQuest(quest.id, patch);
                    setRoute({ name: "entity-detail", kind: "quest", id: quest.id });
                  }}
                  onDiscard={() =>
                    setRoute({ name: "entity-detail", kind: "quest", id: quest.id })
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
              npc={blankDrafts.npc}
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
              campaignId={activeCampaignId!}
              vaultName={activeCampaign!.vaultPath}
              onEdit={() =>
                setRoute({ name: "player-edit", playerId: selectedPlayer.id })
              }
              onBack={() => setRoute({ name: "section", section: "jugadores" })}
              onDelete={() => deletePlayer(selectedPlayer.id)}
            />
          )}

          {route.name === "player-edit" && selectedPlayer && (
            <PlayerEdit
              key={selectedPlayer.id}
              player={selectedPlayer}
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
              player={blankDrafts.player}
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
                  autoConfirm={route.autoConfirm}
                  onSave={(patch) => saveSession(session.id, patch)}
                  onDelete={() => deleteSession(session.id)}
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

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          durationMs={toast.type === "error" ? 3000 : 2000}
        />
      )}
    </div>
  );
}
