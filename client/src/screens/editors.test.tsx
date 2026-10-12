import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestEdit } from "./QuestEdit";
import { ArcEdit } from "./ArcEdit";
import type { Arc, Quest } from "../data/domain";

const blankDrafts: { quest: Quest; arc: Arc } = {
  quest: {
    id: "",
    campaignId: "",
    name: "",
    hook: "",
    crystal: "faction-quest",
    status: "active",
    priority: 3,
    notes: "",
  },
  arc: {
    id: "",
    campaignId: "",
    label: "",
    summary: "",
    meta: "",
    order: 0,
    status: "planificado",
    obsidianPath: "",
  },
};

describe("QuestEdit", () => {
  it("creates a quest with the typed title and hook", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestEdit
        quest={blankDrafts.quest}
        onSave={onSave}
        onDiscard={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText("Title"), "La balsa perdida");
    await user.type(
      screen.getAllByRole("textbox").find((e) => e.tagName === "TEXTAREA")!,
      "Recuperarla antes de la marea",
    );
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const [patch, image] = onSave.mock.calls[0];
    expect(patch.name).toBe("La balsa perdida");
    expect(patch.hook).toBe("Recuperarla antes de la marea");
    expect(image).toBeUndefined();
  });

  it("edits an existing quest and keeps unchanged fields", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestEdit
        quest={{
          ...blankDrafts.quest,
          id: "9",
          name: "Original",
          hook: "Gancho",
          status: "active",
        }}
        onSave={onSave}
        onDiscard={vi.fn()}
      />,
    );
    const title = screen.getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "Renombrada");
    await user.click(screen.getByRole("button", { name: /save/i }));
    const [patch] = onSave.mock.calls[0];
    expect(patch.name).toBe("Renombrada");
    expect(patch.hook).toBe("Gancho");
    expect(patch.status).toBe("active");
  });

  it("discards without saving", async () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestEdit
        quest={blankDrafts.quest}
        onSave={onSave}
        onDiscard={onDiscard}
      />,
    );
    await user.click(screen.getByRole("button", { name: /discard/i }));
    expect(onDiscard).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("ArcEdit", () => {
  it("creates an arc with its name and number", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ArcEdit
        arc={blankDrafts.arc}
        hasVault={false}
        onSave={onSave}
        onDiscard={vi.fn()}
      />,
    );
    const textboxes = screen.getAllByRole("textbox");
    await user.type(textboxes[0], "La luz que se apaga");
    await user.type(screen.getAllByRole("spinbutton")[0], "2");
    await user.click(screen.getByRole("button", { name: /save/i }));
    const [patch] = onSave.mock.calls[0];
    expect(patch.label).toBe("La luz que se apaga");
    expect(patch.order).toBe(2);
  });
});
