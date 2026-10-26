import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentsSettings } from "./AgentsSettings";
import { setConfirmAsker } from "../lib/confirm";
import * as agents from "../lib/agents";

vi.mock("../lib/agents");

const clients: agents.McpClient[] = [
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    installed: true,
    connected: false,
  },
  { id: "codex", label: "Codex", installed: false, connected: false },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(agents.loadMcpClients).mockResolvedValue(clients);
  setConfirmAsker(() => Promise.resolve(true));
});

describe("AgentsSettings", () => {
  it("turns the connection on through the API and reports the new settings", async () => {
    const settings = { vaultsRoot: "", syncDir: "", mcpEnabled: true };
    vi.mocked(agents.setMcpEnabled).mockResolvedValue(settings);
    const onChange = vi.fn();
    render(<AgentsSettings enabled={false} onChange={onChange} />);

    await userEvent.click(screen.getByRole("checkbox"));

    expect(agents.setMcpEnabled).toHaveBeenCalledWith(true);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(settings));
    expect(agents.loadMcpClients).not.toHaveBeenCalled();
  });

  it("lists the clients only while enabled and disables the ones not installed", async () => {
    render(<AgentsSettings enabled onChange={vi.fn()} />);

    expect(await screen.findByText("Claude Desktop")).toBeTruthy();
    const [claude, codex] = screen.getAllByRole("button");
    expect((claude as HTMLButtonElement).disabled).toBe(false);
    expect((codex as HTMLButtonElement).disabled).toBe(true);
  });

  it("asks before touching a client's config, and writes nothing if declined", async () => {
    setConfirmAsker(() => Promise.resolve(false));
    render(<AgentsSettings enabled onChange={vi.fn()} />);
    await screen.findByText("Claude Desktop");

    await userEvent.click(screen.getAllByRole("button")[0]);

    expect(agents.connectMcpClient).not.toHaveBeenCalled();
  });

  it("connects after confirming and shows the new state", async () => {
    const asked: string[] = [];
    setConfirmAsker((message) => {
      asked.push(message);
      return Promise.resolve(true);
    });
    vi.mocked(agents.connectMcpClient).mockResolvedValue([
      { ...clients[0], connected: true },
      clients[1],
    ]);
    render(<AgentsSettings enabled onChange={vi.fn()} />);
    await screen.findByText("Claude Desktop");

    await userEvent.click(screen.getAllByRole("button")[0]);

    await waitFor(() =>
      expect(agents.connectMcpClient).toHaveBeenCalledWith("claude-desktop"),
    );
    expect(asked[0]).toContain("Claude Desktop");
    await waitFor(() =>
      expect(screen.getByText(/connected|conectado/i)).toBeTruthy(),
    );
  });
});
