import { useEffect, useEffectEvent, useState } from "react";
import { apiFetch, apiImageRequest } from "../lib/api";
import { askConfirm } from "../lib/confirm";
import { useT } from "../lib/i18n";
import {
  currencyToApiPayload,
  itemToApiPayload,
  mapCurrency,
  mapItem,
  type ApiCurrency,
  type ApiItem,
  type CurrencyValues,
  type ItemValues,
} from "../lib/apiMappers";
import type { Currency, Item } from "../data/domain";

type Notify = (
  message: string,
  type?: "success" | "error",
  err?: unknown,
) => void;

export function useEconomy(
  campaignId: string | null,
  reloadKey: number,
  notify: Notify,
  onImageChange: () => void,
) {
  const t = useT();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const loadFailed = useEffectEvent((err: unknown) => {
    notify(t("toast.errorLoading"), "error", err);
  });

  useEffect(() => {
    if (!campaignId) return;
    let stale = false;
    apiFetch<ApiCurrency[]>(`/campaigns/${campaignId}/currencies`)
      .then((data) => {
        if (!stale) setCurrencies((data ?? []).map(mapCurrency));
      })
      .catch((err) => loadFailed(err));
    apiFetch<ApiItem[]>(`/campaigns/${campaignId}/items`)
      .then((data) => {
        if (!stale) setItems((data ?? []).map(mapItem));
      })
      .catch((err) => loadFailed(err));
    return () => {
      stale = true;
    };
  }, [campaignId, reloadKey]);

  function fail(
    kind: "toastErrorSaving" | "toastErrorDeleting",
    noun: "common.nounItem" | "common.nounCurrency",
    err: unknown,
  ) {
    notify(`${t(`common.${kind}`)} ${t(noun)}`, "error", err);
    return false;
  }

  async function reloadCurrencies() {
    const data = await apiFetch<ApiCurrency[]>(
      `/campaigns/${campaignId}/currencies`,
    );
    setCurrencies((data ?? []).map(mapCurrency));
  }

  async function saveCurrency(id: string | null, values: CurrencyValues) {
    try {
      const body = JSON.stringify(currencyToApiPayload(values));
      if (id) {
        await apiFetch<ApiCurrency>(`/currencies/${id}`, {
          method: "PUT",
          body,
        });
      } else {
        await apiFetch<ApiCurrency>(`/campaigns/${campaignId}/currencies`, {
          method: "POST",
          body,
        });
      }
      await reloadCurrencies();
      return true;
    } catch (err) {
      return fail("toastErrorSaving", "common.nounCurrency", err);
    }
  }

  async function deleteCurrency(id: string) {
    if (!(await askConfirm(t("economy.confirmDeleteCurrency")))) return false;
    try {
      await apiFetch(`/currencies/${id}`, { method: "DELETE" });
      setCurrencies((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      return fail("toastErrorDeleting", "common.nounCurrency", err);
    }
  }

  async function saveItem(id: string | null, values: ItemValues, image?: File) {
    try {
      const body = JSON.stringify(itemToApiPayload(values));
      if (id) {
        const saved = await apiFetch<ApiItem>(`/items/${id}`, {
          method: "PUT",
          body,
        });
        setItems((prev) => prev.map((i) => (i.id === id ? mapItem(saved) : i)));
      } else {
        const created = await apiFetch<ApiItem>(
          `/campaigns/${campaignId}/items`,
          { method: "POST", body },
        );
        setItems((prev) => [...prev, mapItem(created)]);
        if (image) await uploadItemImage(String(created.id), image);
      }
      return true;
    } catch (err) {
      return fail("toastErrorSaving", "common.nounItem", err);
    }
  }

  async function uploadItemImage(id: string, file: File) {
    try {
      const updated = await apiImageRequest<ApiItem>(
        `/items/${id}/image`,
        "POST",
        file,
      );
      setItems((prev) => prev.map((i) => (i.id === id ? mapItem(updated) : i)));
      onImageChange();
    } catch (err) {
      notify(t("common.toastErrorSaving"), "error", err);
      throw err;
    }
  }

  async function removeItemImage(id: string) {
    try {
      const updated = await apiImageRequest<ApiItem>(
        `/items/${id}/image`,
        "DELETE",
      );
      setItems((prev) => prev.map((i) => (i.id === id ? mapItem(updated) : i)));
      onImageChange();
    } catch (err) {
      notify(t("common.toastErrorDeleting"), "error", err);
      throw err;
    }
  }

  async function deleteItem(id: string) {
    if (!(await askConfirm(t("economy.confirmDeleteItem")))) return false;
    try {
      await apiFetch(`/items/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      return true;
    } catch (err) {
      return fail("toastErrorDeleting", "common.nounItem", err);
    }
  }

  return {
    currencies,
    items,
    saveCurrency,
    deleteCurrency,
    saveItem,
    deleteItem,
    uploadItemImage,
    removeItemImage,
  };
}
