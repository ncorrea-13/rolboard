import type { DashboardSection } from "../screens/CampaignDashboard";

export type EntityKind = "arc" | "faction" | "location" | "quest";

export const entityKindLabel: Record<EntityKind, string> = {
  arc: "arco",
  faction: "facción",
  location: "locación",
  quest: "quest",
};

export const entityKindSection: Record<EntityKind, DashboardSection> = {
  arc: "arcos",
  faction: "facciones",
  location: "locaciones",
  quest: "quests",
};
