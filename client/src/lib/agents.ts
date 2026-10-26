import { apiFetch } from "./api";
import type { LocalSettings } from "./localSettings";

/** An MCP client (Claude Desktop, Codex...) Rolboard can add itself to. */
export interface McpClient {
  id: string;
  label: string;
  installed: boolean;
  connected: boolean;
}

export function loadMcpClients(): Promise<McpClient[]> {
  return apiFetch<McpClient[]>("/desktop/mcp-clients");
}

export function connectMcpClient(id: string): Promise<McpClient[]> {
  return apiFetch<McpClient[]>("/desktop/mcp-clients/connect", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export function setMcpEnabled(enabled: boolean): Promise<LocalSettings> {
  return apiFetch<LocalSettings>("/desktop/mcp", {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}

/** Clients that run on the user's computer and reach a Docker server through rolboard-mcp. */
export const WEB_CLIENTS = [
  { id: "claude-code", label: "Claude Code" },
  { id: "claude-desktop", label: "Claude Desktop" },
  { id: "opencode", label: "OpenCode" },
  { id: "codex", label: "Codex" },
  { id: "antigravity", label: "Antigravity" },
] as const;

export type WebClientId = (typeof WEB_CLIENTS)[number]["id"];

/**
 * Config files a snippet has to be merged into, one per line. Empty means the
 * client has a command that does it, so there is no file to edit. None of
 * these clients has a link that opens them with the server preloaded.
 */
export const WEB_CLIENT_FILES: Record<WebClientId, string[]> = {
  "claude-code": [],
  codex: [],
  "claude-desktop": [
    "%APPDATA%\\Claude\\claude_desktop_config.json (Windows)",
    "~/Library/Application Support/Claude/claude_desktop_config.json (macOS)",
  ],
  opencode: ["~/.config/opencode/opencode.json"],
  antigravity: ["~/.gemini/config/mcp_config.json"],
};

/**
 * The command or config that makes a client launch rolboard-mcp for one
 * campaign. Commands are one line so they work in any shell. Paths are
 * placeholders: the user knows where the binary and the code file are.
 */
export function webSnippet(
  id: WebClientId,
  url: string,
  campaignId: string | number,
): string {
  const name = `rolboard-${campaignId}`;
  const exe = "/path/to/rolboard-mcp";
  const env = {
    ROLBOARD_URL: url,
    ROLBOARD_CAMPAIGN: String(campaignId),
    ROLBOARD_CODE_FILE: "/path/to/access-code.txt",
  };
  const flags = (flag: string) =>
    Object.entries(env)
      .map(([k, v]) => `${flag} ${k}=${v}`)
      .join(" ");
  switch (id) {
    case "claude-code":
      return `claude mcp add --scope user ${name} ${flags("-e")} -- ${exe}`;
    case "codex":
      return `codex mcp add ${name} ${flags("--env")} -- ${exe}`;
    case "claude-desktop":
    case "antigravity":
      return JSON.stringify(
        { mcpServers: { [name]: { command: exe, env } } },
        null,
        2,
      );
    case "opencode":
      return JSON.stringify(
        {
          mcp: {
            [name]: {
              type: "local",
              command: [exe],
              environment: env,
              enabled: true,
            },
          },
        },
        null,
        2,
      );
  }
}
