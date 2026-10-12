import type { EntityKind } from "./data/entityForms";
import type { DashboardSection } from "./screens/CampaignDashboard";

export type Route =
  | { name: "campaigns" }
  | { name: "section"; section: DashboardSection }
  | { name: "npc-detail"; npcId: string }
  | { name: "npc-edit"; npcId: string }
  | { name: "npc-create" }
  | { name: "player-detail"; playerId: string }
  | { name: "player-edit"; playerId: string }
  | { name: "player-create" }
  | { name: "session-plan"; oneshot?: boolean }
  | { name: "session-detail"; sessionId: string }
  | {
      name: "session-edit";
      sessionId: string;
      autoConfirm?: boolean;
    }
  | { name: "entity-detail"; kind: EntityKind; id: string }
  | { name: "arc-edit"; arcId: string }
  | { name: "arc-create" }
  | { name: "quest-edit"; questId: string }
  | { name: "quest-create" }
  | { name: "note-detail"; noteId: string }
  | { name: "note-edit"; noteId: string }
  | { name: "note-create" }
  | { name: "lore-detail"; entryId: string }
  | { name: "lore-edit"; entryId: string }
  | { name: "lore-create" }
  | { name: "secret-detail"; secretId: string }
  | { name: "secret-edit"; secretId: string }
  | { name: "secret-create" }
  | { name: "faction-edit"; factionId: string }
  | { name: "faction-create" }
  | { name: "location-edit"; locationId: string }
  | { name: "location-create" }
  | { name: "encounter-detail"; encounterId: string };
