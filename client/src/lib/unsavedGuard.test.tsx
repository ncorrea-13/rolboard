import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { setConfirmAsker } from "./confirm";
import { confirmLeave, hasUnsaved, registerUnsaved } from "./unsavedGuard";
import { useUnsavedGuard } from "../hooks/useUnsavedGuard";
import { NoteEdit } from "../screens/NoteEdit";
import userEvent from "@testing-library/user-event";

const t = (key: string) => key;

afterEach(() => {
  setConfirmAsker((message) => Promise.resolve(window.confirm(message)));
});

describe("registerUnsaved", () => {
  it("counts every registration and ignores a repeated release", () => {
    const a = registerUnsaved();
    const b = registerUnsaved();
    expect(hasUnsaved()).toBe(true);
    a();
    a();
    expect(hasUnsaved()).toBe(true);
    b();
    expect(hasUnsaved()).toBe(false);
  });
});

describe("confirmLeave", () => {
  it("lets the user go without asking when nothing is unsaved", async () => {
    const asker = vi.fn().mockResolvedValue(false);
    setConfirmAsker(asker);
    await expect(confirmLeave(t)).resolves.toBe(true);
    expect(asker).not.toHaveBeenCalled();
  });

  it("asks with the unsaved-changes wording and returns the answer", async () => {
    const asker = vi.fn().mockResolvedValue(false);
    setConfirmAsker(asker);
    const release = registerUnsaved();
    await expect(confirmLeave(t)).resolves.toBe(false);
    expect(asker).toHaveBeenCalledWith("unsaved.message", {
      title: "unsaved.title",
      accept: "unsaved.leave",
      cancel: "unsaved.stay",
    });
    release();
  });
});

describe("useUnsavedGuard", () => {
  function Probe({ dirty }: { dirty: boolean }) {
    useUnsavedGuard(dirty);
    return null;
  }

  it("registers while dirty and releases when clean or unmounted", () => {
    const { rerender, unmount } = render(<Probe dirty={false} />);
    expect(hasUnsaved()).toBe(false);
    rerender(<Probe dirty />);
    expect(hasUnsaved()).toBe(true);
    rerender(<Probe dirty={false} />);
    expect(hasUnsaved()).toBe(false);
    rerender(<Probe dirty />);
    unmount();
    expect(hasUnsaved()).toBe(false);
  });
});

describe("NoteEdit", () => {
  it("guards navigation only after the user changes a field", async () => {
    const note = { id: "1", title: "Idea", body: "", pending: false };
    const { unmount } = render(
      <NoteEdit note={note as never} onSave={vi.fn()} onDiscard={vi.fn()} />,
    );
    expect(hasUnsaved()).toBe(false);
    await userEvent.type(
      document.querySelector("input.npc-edit__input") as HTMLInputElement,
      "x",
    );
    expect(hasUnsaved()).toBe(true);
    unmount();
    expect(hasUnsaved()).toBe(false);
  });
});
