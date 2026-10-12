import { useEffect, useEffectEvent, useState } from "react";
import { ApiError, apiFetch } from "../lib/api";
import { askConfirm } from "../lib/confirm";
import { useT } from "../lib/i18n";
import {
  loreEntryToApiPayload,
  mapLoreEntry,
  mapNpcType,
  type ApiLoreEntry,
  type ApiNpcType,
} from "../lib/apiMappers";
import type { LoreCategory, LoreEntry } from "../data/domain";
import type { Route } from "../types";

type Notify = (
  message: string,
  type?: "success" | "error",
  err?: unknown,
) => void;

type LoreValues = Pick<
  LoreEntry,
  "title" | "body" | "categoryId" | "arcId" | "locationId"
>;

export function useLore(
  campaignId: string | null,
  reloadKey: number,
  navigate: (route: Route, opts?: { replace?: boolean }) => void,
  notify: Notify,
) {
  const t = useT();
  const [entries, setEntries] = useState<LoreEntry[]>([]);
  const [categories, setCategories] = useState<LoreCategory[]>([]);

  const loadFailed = useEffectEvent((err: unknown) => {
    notify(t("toast.errorLoading"), "error", err);
  });

  useEffect(() => {
    if (!campaignId) return;
    let stale = false;
    apiFetch<ApiLoreEntry[]>(`/campaigns/${campaignId}/lore`)
      .then((data) => {
        if (!stale) setEntries((data ?? []).map(mapLoreEntry));
      })
      .catch((err) => loadFailed(err));
    apiFetch<ApiNpcType[]>(`/campaigns/${campaignId}/lore-categories`)
      .then((data) => {
        if (!stale) setCategories((data ?? []).map(mapNpcType));
      })
      .catch((err) => loadFailed(err));
    return () => {
      stale = true;
    };
  }, [campaignId, reloadKey]);

  function requireTitle(values: LoreValues): boolean {
    if (values.title.trim()) return true;
    notify(`${t("toast.missingFields")}: ${t("loreEdit.title")}`, "error");
    return false;
  }

  function createEntry(values: LoreValues) {
    if (!requireTitle(values)) return;
    apiFetch<ApiLoreEntry>(`/campaigns/${campaignId}/lore`, {
      method: "POST",
      body: JSON.stringify(loreEntryToApiPayload(values)),
    })
      .then((created) => {
        const entry = mapLoreEntry(created);
        setEntries((prev) => [...prev, entry]);
        navigate({ name: "lore-detail", entryId: entry.id }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorCreating")} ${t("common.nounLore")}`,
          "error",
          err,
        );
      });
  }

  function saveEntry(id: string, values: LoreValues) {
    if (!requireTitle(values)) return;
    apiFetch<ApiLoreEntry>(`/lore/${id}`, {
      method: "PUT",
      body: JSON.stringify(loreEntryToApiPayload(values)),
    })
      .then((saved) => {
        const entry = mapLoreEntry(saved);
        setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)));
        navigate({ name: "lore-detail", entryId: id }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorSaving")} ${t("common.nounLore")}`,
          "error",
          err,
        );
      });
  }

  async function deleteEntry(id: string) {
    if (!(await askConfirm(t("confirm.deleteLore")))) return;
    apiFetch(`/lore/${id}`, { method: "DELETE" })
      .then(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        navigate({ name: "section", section: "mundo" }, { replace: true });
      })
      .catch((err) => {
        notify(
          `${t("common.toastErrorDeleting")} ${t("common.nounLore")}`,
          "error",
          err,
        );
      });
  }

  function categoryError(err: unknown) {
    const inUse = err instanceof ApiError && err.status === 409;
    notify(
      t(inUse ? "loreCategories.inUse" : "loreCategories.errorSaving"),
      "error",
      err,
    );
    return false;
  }

  function createCategory(label: string, color: string) {
    return apiFetch<ApiNpcType>(`/campaigns/${campaignId}/lore-categories`, {
      method: "POST",
      body: JSON.stringify({ label, color }),
    })
      .then((created) => {
        setCategories((prev) => [...prev, mapNpcType(created)]);
        return true;
      })
      .catch(categoryError);
  }

  function updateCategory(id: string, label: string, color: string) {
    return apiFetch<ApiNpcType>(`/lore-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ label, color }),
    })
      .then((updated) => {
        setCategories((prev) =>
          prev.map((c) => (c.id === id ? mapNpcType(updated) : c)),
        );
        return true;
      })
      .catch(categoryError);
  }

  function deleteCategory(id: string) {
    return apiFetch(`/lore-categories/${id}`, { method: "DELETE" })
      .then(() => {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        return true;
      })
      .catch(categoryError);
  }

  return {
    loreEntries: entries,
    loreCategories: categories,
    createLoreEntry: createEntry,
    saveLoreEntry: saveEntry,
    deleteLoreEntry: deleteEntry,
    loreCategoriesApi: {
      types: categories,
      onCreate: createCategory,
      onUpdate: updateCategory,
      onDelete: deleteCategory,
    },
  };
}
