import { useEffect, useEffectEvent, useState } from "react";
import { apiFetch } from "../lib/api";
import { askConfirm } from "../lib/confirm";
import { useT } from "../lib/i18n";
import {
  looseNoteToApiPayload,
  mapLooseNote,
  type ApiLooseNote,
} from "../lib/apiMappers";
import type { LooseNote } from "../data/domain";
import type { Route } from "../types";

type Notify = (
  message: string,
  type?: "success" | "error",
  err?: unknown,
) => void;

export function useLooseNotes(
  campaignId: string | null,
  reloadKey: number,
  navigate: (route: Route, opts?: { replace?: boolean }) => void,
  notify: Notify,
) {
  const t = useT();
  const [looseNotes, setLooseNotes] = useState<LooseNote[]>([]);

  const loadFailed = useEffectEvent((err: unknown) => {
    notify(t("toast.errorLoading"), "error", err);
  });

  useEffect(() => {
    if (!campaignId) return;
    let stale = false;
    apiFetch<ApiLooseNote[]>(`/campaigns/${campaignId}/loose-notes`)
      .then((data) => {
        if (!stale) setLooseNotes((data ?? []).map(mapLooseNote));
      })
      .catch((err) => loadFailed(err));
    return () => {
      stale = true;
    };
  }, [campaignId, reloadKey]);

  function createLooseNote(
    values: Pick<LooseNote, "title" | "body" | "pending">,
  ) {
    if (!values.title.trim()) {
      notify(`${t("toast.missingFields")}: ${t("noteEdit.title")}`, "error");
      return;
    }
    apiFetch<ApiLooseNote>(`/campaigns/${campaignId}/loose-notes`, {
      method: "POST",
      body: JSON.stringify(looseNoteToApiPayload(values)),
    })
      .then((created) => {
        const note = mapLooseNote(created);
        setLooseNotes((prev) => [note, ...prev]);
        navigate({ name: "note-detail", noteId: note.id }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounNote")}`,
          "error",
          err,
        );
      });
  }

  function saveLooseNote(
    id: string,
    values: Pick<LooseNote, "title" | "body" | "pending">,
  ) {
    if (!values.title.trim()) {
      notify(`${t("toast.missingFields")}: ${t("noteEdit.title")}`, "error");
      return;
    }
    apiFetch<ApiLooseNote>(`/loose-notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(looseNoteToApiPayload(values)),
    })
      .then((saved) => {
        const note = mapLooseNote(saved);
        setLooseNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
        navigate({ name: "note-detail", noteId: id }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounNote")}`,
          "error",
          err,
        );
      });
  }

  async function togglePending(note: LooseNote) {
    apiFetch<ApiLooseNote>(`/loose-notes/${note.id}`, {
      method: "PUT",
      body: JSON.stringify(
        looseNoteToApiPayload({ ...note, pending: !note.pending }),
      ),
    })
      .then((saved) => {
        const updated = mapLooseNote(saved);
        setLooseNotes((prev) =>
          prev.map((n) => (n.id === note.id ? updated : n)),
        );
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounNote")}`,
          "error",
          err,
        );
      });
  }

  async function deleteLooseNote(id: string) {
    if (!(await askConfirm(t("confirm.deleteNote")))) return;
    apiFetch(`/loose-notes/${id}`, { method: "DELETE" })
      .then(() => {
        setLooseNotes((prev) => prev.filter((n) => n.id !== id));
        navigate({ name: "section", section: "notas" }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounNote")}`,
          "error",
          err,
        );
      });
  }

  return {
    looseNotes,
    createLooseNote,
    saveLooseNote,
    togglePending,
    deleteLooseNote,
  };
}
