import { useState } from "react";
import "./App.css";
import { AppShell } from "./components/AppShell";
import { Modal } from "./components/Modal";
import { NewSessionForm } from "./components/NewSessionForm";
import { CampaignSelector } from "./screens/CampaignSelector";
import { CampaignDashboard, type DashboardSection } from "./screens/CampaignDashboard";
import { NpcList } from "./screens/NpcList";
import { NpcDetail } from "./screens/NpcDetail";
import { NpcEdit } from "./screens/NpcEdit";
import { SessionsTimeline } from "./screens/SessionsTimeline";
import { ArcsList } from "./screens/ArcsList";
import { FactionsList } from "./screens/FactionsList";
import { LocationsList } from "./screens/LocationsList";
import { QuestsList } from "./screens/QuestsList";
import { PlayersList } from "./screens/PlayersList";
import { ArcDetail, FactionDetail, LocationDetail, QuestDetail, PlayerDetail } from "./screens/EntityDetails";
import { npcs as initialNpcs, arcs as initialArcs, groups, locations, quests, playerCharacters, type Npc, type Arc, type SessionEntry } from "./data/mock";

type EntityKind = "arc" | "faction" | "location" | "quest" | "player";

const entityKindSection: Record<EntityKind, DashboardSection> = {
  arc: "arcos",
  faction: "facciones",
  location: "locaciones",
  quest: "quests",
  player: "jugadores",
};

type Route =
  | { name: "campaigns" }
  | { name: "section"; section: DashboardSection }
  | { name: "npc-detail"; npcId: string }
  | { name: "npc-edit"; npcId: string }
  | { name: "entity-detail"; kind: EntityKind; id: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "campaigns" });
  const [npcs, setNpcs] = useState<Npc[]>(initialNpcs);
  const [arcs, setArcs] = useState<Arc[]>(initialArcs);
  const [newSessionOpen, setNewSessionOpen] = useState(false);

  function saveNpc(id: string, patch: Partial<Npc>) {
    setNpcs((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  function addSession(entry: SessionEntry) {
    setArcs((prev) => {
      const currentArc = prev[prev.length - 1];
      return prev.map((a) => (a.id === currentArc.id ? { ...a, sessions: [...a.sessions, entry] } : a));
    });
    setNewSessionOpen(false);
    setRoute({ name: "section", section: "sesiones" });
  }

  const selectedNpc = route.name === "npc-detail" || route.name === "npc-edit" ? npcs.find((n) => n.id === route.npcId) : undefined;

  const activeNav: DashboardSection =
    route.name === "section"
      ? route.section
      : route.name === "npc-detail" || route.name === "npc-edit"
        ? "npcs"
        : route.name === "entity-detail"
          ? entityKindSection[route.kind]
          : "resumen";

  const totalSessions = arcs.reduce((acc, a) => acc + a.sessions.length, 0);

  function goToEntitySection(kind: EntityKind) {
    setRoute({ name: "section", section: entityKindSection[kind] });
  }

  return (
    <div className="app">
      {route.name === "campaigns" ? (
        <div className="app__stage">
          <CampaignSelector onSelect={() => setRoute({ name: "section", section: "resumen" })} />
        </div>
      ) : (
        <AppShell
          activeNav={activeNav}
          onNavigate={(section) => setRoute({ name: "section", section })}
          onBackToCampaigns={() => setRoute({ name: "campaigns" })}
        >
          {route.name === "section" && route.section === "resumen" && (
            <CampaignDashboard
              npcs={npcs}
              onNavigate={(section) => setRoute({ name: "section", section })}
              onSelectNpc={(npcId) => setRoute({ name: "npc-detail", npcId })}
              onStartSession={() => setNewSessionOpen(true)}
            />
          )}
          {route.name === "section" && route.section === "npcs" && (
            <NpcList npcs={npcs} onSelect={(npcId) => setRoute({ name: "npc-detail", npcId })} />
          )}
          {route.name === "section" && route.section === "sesiones" && (
            <SessionsTimeline arcs={arcs} onRegisterSession={() => setNewSessionOpen(true)} />
          )}
          {route.name === "section" && route.section === "arcos" && (
            <ArcsList arcs={arcs} onSelect={(id) => setRoute({ name: "entity-detail", kind: "arc", id })} />
          )}
          {route.name === "section" && route.section === "locaciones" && (
            <LocationsList onSelect={(id) => setRoute({ name: "entity-detail", kind: "location", id })} />
          )}
          {route.name === "section" && route.section === "facciones" && (
            <FactionsList onSelect={(id) => setRoute({ name: "entity-detail", kind: "faction", id })} />
          )}
          {route.name === "section" && route.section === "quests" && (
            <QuestsList onSelect={(id) => setRoute({ name: "entity-detail", kind: "quest", id })} />
          )}
          {route.name === "section" && route.section === "jugadores" && (
            <PlayersList onSelect={(id) => setRoute({ name: "entity-detail", kind: "player", id })} />
          )}

          {route.name === "entity-detail" && route.kind === "arc" && (
            <ArcDetail arc={arcs.find((a) => a.id === route.id) ?? arcs[0]} onBack={() => goToEntitySection("arc")} />
          )}
          {route.name === "entity-detail" && route.kind === "faction" && (
            <FactionDetail
              group={groups.find((g) => g.id === route.id) ?? groups[0]}
              npcs={npcs}
              onBack={() => goToEntitySection("faction")}
              onSelectNpc={(npcId) => setRoute({ name: "npc-detail", npcId })}
            />
          )}
          {route.name === "entity-detail" && route.kind === "location" && (
            <LocationDetail
              location={locations.find((l) => l.id === route.id) ?? locations[0]}
              allLocations={locations}
              onBack={() => goToEntitySection("location")}
            />
          )}
          {route.name === "entity-detail" && route.kind === "quest" && (
            <QuestDetail quest={quests.find((q) => q.id === route.id) ?? quests[0]} onBack={() => goToEntitySection("quest")} />
          )}
          {route.name === "entity-detail" && route.kind === "player" && (
            <PlayerDetail
              player={playerCharacters.find((p) => p.id === route.id) ?? playerCharacters[0]}
              onBack={() => goToEntitySection("player")}
            />
          )}

          {route.name === "npc-detail" && selectedNpc && (
            <NpcDetail
              npc={selectedNpc}
              onEdit={() => setRoute({ name: "npc-edit", npcId: selectedNpc.id })}
              onBack={() => setRoute({ name: "section", section: "npcs" })}
            />
          )}

          {route.name === "npc-edit" && selectedNpc && (
            <NpcEdit
              npc={selectedNpc}
              onSave={(patch) => {
                saveNpc(selectedNpc.id, patch);
                setRoute({ name: "npc-detail", npcId: selectedNpc.id });
              }}
              onDiscard={() => setRoute({ name: "npc-detail", npcId: selectedNpc.id })}
            />
          )}
        </AppShell>
      )}

      {newSessionOpen && (
        <Modal title="Nueva sesión de juego" onClose={() => setNewSessionOpen(false)}>
          <NewSessionForm nextNumber={totalSessions + 1} onConfirm={addSession} onCancel={() => setNewSessionOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
