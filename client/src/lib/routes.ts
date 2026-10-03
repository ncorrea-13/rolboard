import type { Route } from "../types";
import type { DashboardSection } from "../screens/CampaignDashboard";
import { entityKindSection, type EntityKind } from "../data/entityForms";

export type AppLocation =
  { help: true } | { help?: false; campaignId: string | null; route: Route };

const slugBySection: Record<DashboardSection, string> = {
  resumen: "",
  npcs: "npcs",
  sesiones: "sessions",
  arcos: "arcs",
  locaciones: "locations",
  facciones: "factions",
  quests: "quests",
  jugadores: "players",
  encuentros: "encounters",
  wardails: "wardails",
};

const sectionBySlug = new Map(
  Object.entries(slugBySection).map(([section, slug]) => [
    slug,
    section as DashboardSection,
  ]),
);

const kindBySection: Partial<Record<DashboardSection, EntityKind>> = {
  arcos: "arc",
  facciones: "faction",
  locaciones: "location",
  quests: "quest",
};

function subPath(route: Route): string {
  switch (route.name) {
    case "campaigns":
      return "";
    case "section":
      return route.section === "resumen"
        ? ""
        : `/${slugBySection[route.section]}`;
    case "npc-detail":
      return `/npcs/${route.npcId}`;
    case "npc-edit":
      return `/npcs/${route.npcId}/edit`;
    case "npc-create":
      return "/npcs/new";
    case "player-detail":
      return `/players/${route.playerId}`;
    case "player-edit":
      return `/players/${route.playerId}/edit`;
    case "player-create":
      return "/players/new";
    case "session-plan":
      return "/sessions/new";
    case "session-detail":
      return `/sessions/${route.sessionId}`;
    case "session-edit":
      return `/sessions/${route.sessionId}/edit`;
    case "entity-detail":
      return `/${slugBySection[entityKindSection[route.kind]]}/${route.id}`;
    case "arc-edit":
      return `/arcs/${route.arcId}/edit`;
    case "arc-create":
      return "/arcs/new";
    case "quest-edit":
      return `/quests/${route.questId}/edit`;
    case "quest-create":
      return "/quests/new";
    case "faction-edit":
      return `/factions/${route.factionId}/edit`;
    case "faction-create":
      return "/factions/new";
    case "location-edit":
      return `/locations/${route.locationId}/edit`;
    case "location-create":
      return "/locations/new";
    case "encounter-detail":
      return `/encounters/${route.encounterId}`;
  }
}

export function routeToPath(route: Route, campaignId: string | null): string {
  if (route.name === "campaigns" || !campaignId) return "/";
  return `/c/${campaignId}${subPath(route)}`;
}

function parseCampaignRoute(parts: string[]): Route | null {
  const [slug, id, action] = parts as [
    string | undefined,
    string | undefined,
    string | undefined,
  ];
  if (parts.length > 3) return null;
  if (!slug) return { name: "section", section: "resumen" };
  const section = sectionBySlug.get(slug);
  if (!section || section === "resumen") return null;
  if (!id) return { name: "section", section };

  const isNew = id === "new";
  if (!isNew && !/^\d+$/.test(id)) return null;
  if (isNew && action) return null;
  if (action && action !== "edit") return null;
  const edit = action === "edit";

  switch (section) {
    case "npcs":
      if (isNew) return { name: "npc-create" };
      return edit
        ? { name: "npc-edit", npcId: id }
        : { name: "npc-detail", npcId: id };
    case "jugadores":
      if (isNew) return { name: "player-create" };
      return edit
        ? { name: "player-edit", playerId: id }
        : { name: "player-detail", playerId: id };
    case "sesiones":
      if (isNew) return { name: "session-plan" };
      return edit
        ? { name: "session-edit", sessionId: id }
        : { name: "session-detail", sessionId: id };
    case "encuentros":
      if (isNew || edit) return null;
      return { name: "encounter-detail", encounterId: id };
    case "arcos":
      if (isNew) return { name: "arc-create" };
      if (edit) return { name: "arc-edit", arcId: id };
      break;
    case "quests":
      if (isNew) return { name: "quest-create" };
      if (edit) return { name: "quest-edit", questId: id };
      break;
    case "facciones":
      if (isNew) return { name: "faction-create" };
      if (edit) return { name: "faction-edit", factionId: id };
      break;
    case "locaciones":
      if (isNew) return { name: "location-create" };
      if (edit) return { name: "location-edit", locationId: id };
      break;
  }
  const kind = kindBySection[section];
  return kind ? { name: "entity-detail", kind, id } : null;
}

export function pathToLocation(path: string): AppLocation {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "help") return { help: true };
  if (parts[0] === "c" && parts[1] && /^\d+$/.test(parts[1])) {
    const route = parseCampaignRoute(parts.slice(2));
    if (route) return { campaignId: parts[1], route };
  }
  return { campaignId: null, route: { name: "campaigns" } };
}

export function currentLocation(): AppLocation {
  const loc = pathToLocation(window.location.pathname);
  const saved = window.history.state?.route as Route | undefined;
  if (!loc.help && saved?.name === loc.route.name)
    return { ...loc, route: saved };
  return loc;
}
