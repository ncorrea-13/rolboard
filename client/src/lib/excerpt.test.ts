import { describe, expect, it } from "vitest";
import { excerpt } from "./excerpt";

describe("excerpt", () => {
  it("drops markdown table rows and block syntax", () => {
    const md = [
      "## Historia",
      "| Época | Hecho |",
      "| --- | --- |",
      "- Se enciende el faro",
      "1. Cae la niebla",
      "> una cita",
    ].join("\n");
    expect(excerpt(md)).toBe(
      "Historia Se enciende el faro Cae la niebla una cita",
    );
  });

  it("collapses whitespace", () => {
    expect(excerpt("a\n\n\n  b")).toBe("a b");
  });
});
