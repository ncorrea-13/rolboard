import { describe, expect, it } from "vitest";
import { WEB_CLIENTS, webSnippet } from "./agents";

describe("webSnippet", () => {
  it("names the server after the campaign and carries the three variables", () => {
    for (const { id } of WEB_CLIENTS) {
      const text = webSnippet(id, "https://box.tail.ts.net", 7);
      expect(text).toContain("rolboard-7");
      expect(text).toContain("https://box.tail.ts.net");
      expect(text).toContain("ROLBOARD_CAMPAIGN");
      expect(text).toContain("ROLBOARD_CODE_FILE");
    }
  });

  it("emits valid JSON for the JSON clients", () => {
    for (const id of ["claude-desktop", "antigravity"] as const) {
      const doc = JSON.parse(webSnippet(id, "https://x", 3));
      expect(doc.mcpServers["rolboard-3"].env.ROLBOARD_CAMPAIGN).toBe("3");
    }
    const opencode = JSON.parse(webSnippet("opencode", "https://x", 3));
    expect(opencode.mcp["rolboard-3"].type).toBe("local");
    expect(opencode.mcp["rolboard-3"].command).toEqual([
      "/path/to/rolboard-mcp",
    ]);
  });

  it("puts the env flags before the -- of the command clients", () => {
    expect(webSnippet("codex", "https://x", 3)).toBe(
      "codex mcp add rolboard-3 --env ROLBOARD_URL=https://x --env ROLBOARD_CAMPAIGN=3 --env ROLBOARD_CODE_FILE=/path/to/access-code.txt -- /path/to/rolboard-mcp",
    );
    expect(webSnippet("claude-code", "https://x", 3)).toMatch(
      /^claude mcp add --scope user rolboard-3 -e .* -- \/path\/to\/rolboard-mcp$/,
    );
  });

  it("never asks for the access code itself", () => {
    for (const { id } of WEB_CLIENTS)
      expect(webSnippet(id, "https://x", 3)).not.toMatch(/ACCESS_CODE\b/);
  });
});
