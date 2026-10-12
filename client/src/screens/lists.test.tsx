import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestsList } from "./QuestsList";
import { NotesList } from "./NotesList";
import { SecretsList } from "./SecretsList";
import type { LooseNote, Quest, Secret } from "../data/domain";

const quest = (over: Partial<Quest>): Quest => ({
  id: "1",
  campaignId: "1",
  name: "El aceite del faro",
  hook: "Encontrar al ladrón",
  crystal: "faction-quest",
  status: "active",
  priority: 2,
  notes: "",
  ...over,
});

describe("QuestsList", () => {
  it("groups quests by status", () => {
    render(
      <QuestsList
        quests={[
          quest({ id: "1", status: "completed", name: "Hecha" }),
          quest({ id: "2", status: "active", name: "En curso" }),
        ]}
        onCreate={vi.fn()}
        onSetStatus={vi.fn()}
      />,
    );
    const headings = screen
      .getAllByText(/^(Active|Completed)$/)
      .map((n) => n.textContent);
    expect(headings).toEqual(["Active", "Completed"]);
  });

  it("completes an active quest from its checkbox", async () => {
    const onSetStatus = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestsList
        quests={[quest({ id: "7" })]}
        onCreate={vi.fn()}
        onSetStatus={onSetStatus}
      />,
    );
    await user.click(screen.getByRole("button", { name: /complete/i }));
    expect(onSetStatus).toHaveBeenCalledWith("7", "completed");
  });

  it("reopens a completed quest", async () => {
    const onSetStatus = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestsList
        quests={[quest({ id: "7", status: "completed" })]}
        onCreate={vi.fn()}
        onSetStatus={onSetStatus}
      />,
    );
    await user.click(screen.getByRole("button", { name: /reopen/i }));
    expect(onSetStatus).toHaveBeenCalledWith("7", "active");
  });

  it("filters by the search box", async () => {
    const user = userEvent.setup();
    render(
      <QuestsList
        quests={[
          quest({ id: "1", name: "El aceite del faro" }),
          quest({ id: "2", name: "La carta de Maren", hook: "Una carta" }),
        ]}
        onCreate={vi.fn()}
        onSetStatus={vi.fn()}
      />,
    );
    await user.type(screen.getByPlaceholderText(/search/i), "carta");
    expect(screen.queryByText("El aceite del faro")).not.toBeInTheDocument();
    expect(screen.getByText("La carta de Maren")).toBeInTheDocument();
  });

  it("calls onCreate from the new button", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestsList quests={[]} onCreate={onCreate} onSetStatus={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /new quest/i }));
    expect(onCreate).toHaveBeenCalled();
  });
});

describe("NotesList", () => {
  const note = (over: Partial<LooseNote>): LooseNote => ({
    id: "1",
    campaignId: "1",
    title: "Idea",
    body: "",
    pending: true,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...over,
  });

  it("lists pending notes first and toggles them", async () => {
    const onTogglePending = vi.fn();
    const user = userEvent.setup();
    const filed = note({ id: "2", title: "Archivada", pending: false });
    const pending = note({ id: "1", title: "Pendiente" });
    render(
      <NotesList
        notes={[filed, pending]}
        onCreate={vi.fn()}
        onTogglePending={onTogglePending}
      />,
    );
    const rows = screen.getAllByRole("link");
    expect(within(rows[0]).getByText("Pendiente")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /file it/i }));
    expect(onTogglePending).toHaveBeenCalledWith(pending);
  });
});

describe("SecretsList", () => {
  const secret = (over: Partial<Secret>): Secret => ({
    id: "1",
    campaignId: "1",
    title: "Teodric envenenó a su padre",
    body: "",
    status: "hidden",
    knownByNpcIds: [],
    ...over,
  });

  it("reveals a hidden secret", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    const s = secret({});
    render(
      <SecretsList
        secrets={[s]}
        npcs={[]}
        locations={[]}
        loreEntries={[]}
        onCreate={vi.fn()}
        onToggle={onToggle}
      />,
    );
    await user.click(screen.getByRole("button", { name: /^reveal$/i }));
    expect(onToggle).toHaveBeenCalledWith(s);
  });

  it("offers to hide a revealed secret again", () => {
    render(
      <SecretsList
        secrets={[secret({ status: "revealed" })]}
        npcs={[]}
        locations={[]}
        loreEntries={[]}
        onCreate={vi.fn()}
        onToggle={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /hide again/i }),
    ).toBeInTheDocument();
  });
});
