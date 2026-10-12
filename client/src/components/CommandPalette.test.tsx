import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./CommandPalette";
import type { SearchItem } from "../lib/search";

const items: SearchItem[] = [
  {
    key: "npc:1",
    kind: "npc",
    title: "Isolde Wren",
    subtitle: "Alquimista",
    body: "",
    route: { name: "npc-detail", npcId: "1" },
  },
  {
    key: "loc:2",
    kind: "location",
    title: "El faro de Valdris",
    body: "",
    route: { name: "entity-detail", kind: "location", id: "2" },
  },
];

describe("CommandPalette", () => {
  it("focuses the input as soon as it opens", async () => {
    render(
      <CommandPalette items={items} onSelect={vi.fn()} onClose={vi.fn()} />,
    );
    const input = await screen.findByRole("combobox");
    await vi.waitFor(() => expect(input).toHaveFocus());
  });

  it("filters while typing and selects with Enter", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <CommandPalette items={items} onSelect={onSelect} onClose={vi.fn()} />,
    );
    const input = await screen.findByRole("combobox");
    await user.type(input, "faro");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  it("moves the selection with the arrow keys", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <CommandPalette items={items} onSelect={onSelect} onClose={vi.fn()} />,
    );
    const input = await screen.findByRole("combobox");
    await user.type(input, "a");
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    const second = items.find((i) => options[1].textContent?.includes(i.title));
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(second);
  });

  it("returns focus to the input on Ctrl+K while open", async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette items={items} onSelect={vi.fn()} onClose={vi.fn()} />,
    );
    const input = await screen.findByRole("combobox");
    await user.type(input, "isolde");
    screen.getAllByRole("option")[0].focus();
    expect(input).not.toHaveFocus();
    await user.keyboard("{Control>}k{/Control}");
    expect(input).toHaveFocus();
  });

  it("explains an empty result without a listbox", async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette items={items} onSelect={vi.fn()} onClose={vi.fn()} />,
    );
    const input = await screen.findByRole("combobox");
    await user.type(input, "zzzz");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText(/nothing/i)).toBeInTheDocument();
  });
});
