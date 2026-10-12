import { describe, expect, it } from "vitest";
import { searchItems, type SearchItem } from "./search";

const item = (
  key: string,
  title: string,
  extra: Partial<SearchItem> = {},
): SearchItem => ({
  key,
  kind: "npc",
  title,
  body: "",
  route: { name: "campaigns" },
  ...extra,
});

describe("searchItems", () => {
  const items = [
    item("a", "Isolde Wren", { subtitle: "Alquimista" }),
    item("b", "El faro de Valdris", { body: "Torre de piedra negra" }),
    item("c", "Historia del faro", { kind: "lore" }),
    item("d", "Capitán Fen", { body: "Isolde le debe aceite" }),
  ];

  it("returns nothing for an empty query", () => {
    expect(searchItems(items, "   ")).toEqual([]);
  });

  it("ignores case and accents", () => {
    const keys = searchItems(items, "CAPITAN").map((i) => i.key);
    expect(keys).toEqual(["d"]);
  });

  it("ranks a title prefix above a body match", () => {
    const keys = searchItems(items, "isolde").map((i) => i.key);
    expect(keys).toEqual(["a", "d"]);
  });

  it("matches words inside a title", () => {
    const keys = searchItems(items, "faro").map((i) => i.key);
    expect(keys).toEqual(["b", "c"]);
  });
});
