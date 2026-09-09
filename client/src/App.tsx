import { useState } from "react";
import "./App.css";
import { AppShell } from "./components/AppShell";
import { Modal } from "./components/Modal";
import { NewSessionForm } from "./components/NewSessionForm";
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
  campaigns as initialCampaigns,
  npcs as initialNpcs,
  arcs as initialArcs,
  groups as initialGroups,
  locations as initialLocations,
  quests as initialQuests,
  playerCharacters as initialPlayerCharacters,
  locationTypeLabel,
  type Campaign,
  type Npc,
  type Arc,
  type Group,
  type Location,
  type Quest,
  type PlayerCharacter,
  type SessionEntry,
} from "./data/mock";

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
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: [
        { value: "alive", label: "En curso" },
        { value: "dead", label: "Cerrado" },
      ],
    },
  ];
}

function factionFields(): FormField[] {
  return [
    { key: "name", label: "Nombre", type: "text" },
    { key: "description", label: "Descripción", type: "textarea" },
    { key: "memberCount", label: "Miembros conocidos", type: "number" },
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
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [npcs, setNpcs] = useState<Npc[]>(initialNpcs);
  const [arcs, setArcs] = useState<Arc[]>(initialArcs);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [playerCharacters, setPlayerCharacters] = useState<PlayerCharacter[]>(
    initialPlayerCharacters,
  );
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [entityForm, setEntityForm] = useState<{
    kind: EntityKind;
    id?: string;
  } | null>(null);

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);

  const campaignNpcs = npcs.filter((n) => n.campaignId === activeCampaignId);
  const campaignArcs = arcs.filter((a) => a.campaignId === activeCampaignId);
  const campaignGroups = groups.filter(
    (g) => g.campaignId === activeCampaignId,
  );
  const campaignLocations = locations.filter(
    (l) => l.campaignId === activeCampaignId,
  );
  const campaignQuests = quests.filter(
    (q) => q.campaignId === activeCampaignId,
  );
  const campaignPlayerCharacters = playerCharacters.filter(
    (p) => p.campaignId === activeCampaignId,
  );

  function selectCampaign(id: string) {
    setActiveCampaignId(id);
    setRoute({ name: "section", section: "resumen" });
  }

  function createCampaign(campaign: Omit<Campaign, "id">) {
    const id = `c${campaigns.length + 1}`;
    setCampaigns((prev) => [...prev, { ...campaign, id }]);
    setNewCampaignOpen(false);
    selectCampaign(id);
  }

  function saveNpc(id: string, patch: Partial<Npc>) {
    setNpcs((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  function createNpc(patch: Partial<Npc>) {
    const id = `n${npcs.length + 1}`;
    const name = patch.name ?? "";
    const initials =
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "??";
    const npc: Npc = {
      ...blankNpcDraft,
      ...patch,
      id,
      campaignId: activeCampaign!.id,
      initials,
      obsidianPath: `NPCs/${name}.md`,
    };
    setNpcs((prev) => [...prev, npc]);
    setRoute({ name: "npc-detail", npcId: id });
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

  function addSession(entry: SessionEntry) {
    const currentArc =
      campaignArcs.find((a) => a.status === "alive") ??
      campaignArcs[campaignArcs.length - 1];
    if (!currentArc) return;
    setArcs((prev) =>
      prev.map((a) =>
        a.id === currentArc.id ? { ...a, sessions: [...a.sessions, entry] } : a,
      ),
    );
    setNewSessionOpen(false);
    setRoute({ name: "section", section: "sesiones" });
  }

  function nextId(prefix: string, items: { id: string }[]) {
    return `${prefix}${items.length + 1}`;
  }

  function submitEntityForm(values: Record<string, string>) {
    if (!entityForm) return;
    const { kind, id } = entityForm;

    switch (kind) {
      case "arc": {
        if (id) {
          setArcs((prev) =>
            prev.map((a) =>
              a.id === id
                ? {
                    ...a,
                    label: values.label,
                    summary: values.summary,
                    status: values.status as Arc["status"],
                  }
                : a,
            ),
          );
        } else {
          const newId = nextId("a", arcs);
          setArcs((prev) => [
            ...prev,
            {
              id: newId,
              campaignId: activeCampaign!.id,
              label: values.label,
              summary: values.summary,
              meta: "0 sesiones",
              status: values.status as Arc["status"],
              obsidianPath: `Arcos/${values.label}.md`,
              sessions: [],
            },
          ]);
        }
        break;
      }
      case "faction": {
        if (id) {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === id
                ? {
                    ...g,
                    name: values.name,
                    description: values.description,
                    memberCount: Number(values.memberCount) || 0,
                  }
                : g,
            ),
          );
        } else {
          const newId = nextId("g", groups);
          setGroups((prev) => [
            ...prev,
            {
              id: newId,
              campaignId: activeCampaign!.id,
              name: values.name,
              description: values.description,
              memberCount: Number(values.memberCount) || 0,
              obsidianPath: `Facciones/${values.name}.md`,
            },
          ]);
        }
        break;
      }
      case "location": {
        if (id) {
          setLocations((prev) =>
            prev.map((l) =>
              l.id === id
                ? {
                    ...l,
                    name: values.name,
                    locationType:
                      values.locationType as Location["locationType"],
                    parentId: values.parentId || undefined,
                    description: values.description,
                  }
                : l,
            ),
          );
        } else {
          const newId = nextId("l", locations);
          setLocations((prev) => [
            ...prev,
            {
              id: newId,
              campaignId: activeCampaign!.id,
              name: values.name,
              locationType: values.locationType as Location["locationType"],
              parentId: values.parentId || undefined,
              description: values.description,
              obsidianPath: `Locaciones/${values.name}.md`,
            },
          ]);
        }
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
    if (
      !window.confirm(
        `¿Borrar este ${entityKindLabel[kind]}? No se puede deshacer.`,
      )
    )
      return;
    switch (kind) {
      case "arc":
        setArcs((prev) => prev.filter((a) => a.id !== id));
        break;
      case "faction":
        setGroups((prev) => prev.filter((g) => g.id !== id));
        break;
      case "location":
        setLocations((prev) => prev.filter((l) => l.id !== id));
        break;
      case "quest":
        setQuests((prev) => prev.filter((q) => q.id !== id));
        break;
    }
    goToEntitySection(kind);
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
          ? { label: a.label, summary: a.summary, status: a.status }
          : undefined;
      }
      case "faction": {
        const g = groups.find((x) => x.id === id);
        return g
          ? {
              name: g.name,
              description: g.description,
              memberCount: String(g.memberCount),
            }
          : undefined;
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
          : route.name === "entity-detail"
            ? entityKindSection[route.kind]
            : "resumen";

  const totalSessions = campaignArcs.reduce(
    (acc, a) => acc + a.sessions.length,
    0,
  );

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
              onStartSession={() => setNewSessionOpen(true)}
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
              onRegisterSession={() => setNewSessionOpen(true)}
              onEditSession={editSession}
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
        </AppShell>
      )}

      {newSessionOpen && (
        <Modal
          title="Nueva sesión de juego"
          onClose={() => setNewSessionOpen(false)}
        >
          <NewSessionForm
            nextNumber={totalSessions + 1}
            onConfirm={addSession}
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
