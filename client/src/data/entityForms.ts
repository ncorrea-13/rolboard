import type { DashboardSection } from "../screens/CampaignDashboard";
import type { Lang } from "../lib/i18n";

export type EntityKind = "arc" | "faction" | "location" | "quest";

export const entityKindLabel: Record<Lang, Record<EntityKind, string>> = {
  es: {
    arc: "arco",
    faction: "facción",
    location: "locación",
    quest: "quest",
  },
  en: {
    arc: "arc",
    faction: "faction",
    location: "location",
    quest: "quest",
  },
};

export const entityKindSection: Record<EntityKind, DashboardSection> = {
  arc: "arcos",
  faction: "facciones",
  location: "locaciones",
  quest: "quests",
};
