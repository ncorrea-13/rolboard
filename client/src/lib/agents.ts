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
