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
  { id: "claude-desktop", label: "Claude Desktop / Antigravity" },
  { id: "opencode", label: "OpenCode" },
  { id: "codex", label: "Codex" },
] as const;

export type WebClientId = (typeof WEB_CLIENTS)[number]["id"];

/** Where each client keeps the config the snippet has to be merged into. */
export const WEB_CLIENT_CONFIG: Record<WebClientId, string | null> = {
  "claude-code": null,
  "claude-desktop": "claude_desktop_config.json",
  opencode: "~/.config/opencode/opencode.json",
  codex: "~/.codex/config.toml",
};

/**
 * The config that makes a client launch rolboard-mcp for one campaign. Paths
 * are placeholders: the user knows where they put the binary and the code file.
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
  switch (id) {
    case "claude-code":
      return [
        `claude mcp add --scope user ${name} \\`,
        ...Object.entries(env).map(([k, v]) => `  -e ${k}=${v} \\`),
        `  -- ${exe}`,
      ].join("\n");
    case "claude-desktop":
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
    case "codex":
      return [
        `[mcp_servers.${name}]`,
        `command = ${JSON.stringify(exe)}`,
        "",
        `[mcp_servers.${name}.env]`,
        ...Object.entries(env).map(([k, v]) => `${k} = ${JSON.stringify(v)}`),
      ].join("\n");
  }
}
