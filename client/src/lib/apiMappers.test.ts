import { describe, expect, it } from "vitest";
import {
  mapArc,
  mapItem,
  mapLoreEntry,
  mapQuest,
  questToApiPayload,
} from "./apiMappers";

describe("image flags", () => {
  it("sets hasImage when the API sends an image_path", () => {
    expect(
      mapQuest({
        id: 1,
        campaign_id: 1,
        title: "Q",
        description: "",
        status: "active",
        notes: "",
        image_path: "quests/1.png",
      }).hasImage,
    ).toBe(true);
    expect(
      mapArc({
        id: 1,
        campaign_id: 1,
        title: "A",
        order: 1,
        status: "planificado",
        summary: "",
      }).hasImage,
    ).toBe(false);
    expect(
      mapLoreEntry({
        id: 1,
        campaign_id: 1,
        title: "L",
        body: "",
        image_path: "lore_entries/1.jpg",
        created_at: "",
        updated_at: "",
      }).hasImage,
    ).toBe(true);
    expect(
      mapItem({
        id: 1,
        campaign_id: 1,
        name: "I",
        description: "",
        effect: "",
        category: "",
        rarity: "",
        weight: null,
        prices: null,
      }).hasImage,
    ).toBe(false);
  });
});

describe("quest payload", () => {
  it("round-trips the editable fields", () => {
    const quest = mapQuest({
      id: 7,
      campaign_id: 1,
      title: "El aceite del faro",
      description: "Encontrar al ladrón",
      status: "on_hold",
      priority: 2,
      notes: "privado",
    });
    expect(questToApiPayload(quest)).toEqual({
      title: "El aceite del faro",
      description: "Encontrar al ladrón",
      status: "on_hold",
      priority: 2,
      notes: "privado",
    });
  });

  it("falls back to active for an unknown status", () => {
    expect(
      mapQuest({
        id: 1,
        campaign_id: 1,
        title: "Q",
        description: "",
        status: "???",
        notes: "",
      }).status,
    ).toBe("active");
  });
});
