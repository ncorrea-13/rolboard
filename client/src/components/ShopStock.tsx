import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import "../screens/NpcEdit.css";
import "./QuestNpcs.css";
import { apiFetch } from "../lib/api";
import { reportError } from "../lib/notify";
import { useT } from "../lib/i18n";
import {
  mapShopEntry,
  shopPricesToApi,
  type ApiShopEntry,
} from "../lib/apiMappers";
import {
  formatPrices,
  type Currency,
  type Item,
  type ItemPrice,
  type ShopEntry,
} from "../data/domain";
import { PricesEditor } from "./PricesEditor";

interface ShopStockProps {
  locationId: string;
  items: Item[];
  currencies: Currency[];
}

export function ShopStock({ locationId, items, currencies }: ShopStockProps) {
  const t = useT();
  const base = `/locations/${locationId}/items`;
  const [entries, setEntries] = useState<ShopEntry[]>([]);
  const [itemId, setItemId] = useState("");
  const [prices, setPrices] = useState<ItemPrice[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let stale = false;
    apiFetch<ApiShopEntry[]>(base)
      .then((data) => {
        if (!stale) setEntries((data ?? []).map(mapShopEntry));
      })
      .catch((err) => reportError("toast.errorLoading", err));
    return () => {
      stale = true;
    };
  }, [base]);

  function reset() {
    setItemId("");
    setPrices([]);
    setNotes("");
  }

  async function save() {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    try {
      await apiFetch(`${base}/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ notes, prices: shopPricesToApi(prices) }),
      });
      setEntries((prev) =>
        [
          ...prev.filter((e) => e.itemId !== item.id),
          { itemId: item.id, name: item.name, notes, prices },
        ].sort((a, b) => a.name.localeCompare(b.name)),
      );
      reset();
    } catch (err) {
      reportError("common.toastErrorSaving", err);
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`${base}/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.itemId !== id));
    } catch (err) {
      reportError("common.toastErrorDeleting", err);
    }
  }

  function edit(entry: ShopEntry) {
    setItemId(entry.itemId);
    setPrices(entry.prices);
    setNotes(entry.notes);
  }

  const editing = entries.some((e) => e.itemId === itemId);
  const selectable = items.filter(
    (i) => i.id === itemId || !entries.some((e) => e.itemId === i.id),
  );

  return (
    <div className="quest-npcs">
      {entries.length === 0 && (
        <div className="npc-edit__hint">{t("shop.empty")}</div>
      )}
      {entries.map((e) => {
        const item = items.find((i) => i.id === e.itemId);
        const own = e.prices.length > 0;
        const shown = own ? e.prices : (item?.prices ?? []);
        return (
          <div key={e.itemId} className="quest-npcs__row">
            <span className="quest-npcs__name">
              {e.name}
              {e.notes && (
                <span className="npc-edit__hint" style={{ display: "block" }}>
                  {e.notes}
                </span>
              )}
            </span>
            <span
              className="quest-npcs__role"
              style={{
                font: "500 12.5px var(--font-mono)",
                color: own ? "var(--text-primary)" : "var(--text-secondary)",
              }}
              title={own ? t("shop.ownPrice") : t("shop.basePrice")}
            >
              {shown.length > 0
                ? formatPrices(shown, currencies)
                : t("shop.noPrice")}
              {!own && shown.length > 0 ? ` (${t("shop.basePrice")})` : ""}
            </span>
            <button
              type="button"
              className="quest-npcs__remove"
              onClick={() => edit(e)}
              aria-label={t("common.edit")}
              title={t("common.edit")}
            >
              <Pencil size={14} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="quest-npcs__remove"
              onClick={() => void remove(e.itemId)}
              aria-label={t("questNpcs.remove")}
              title={t("questNpcs.remove")}
            >
              <X size={15} strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
      {selectable.length > 0 && (
        <div className="quest-npcs" style={{ marginTop: 8 }}>
          <select
            className="npc-edit__select npc-edit__select--native"
            aria-label={t("shop.addItem")}
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          >
            <option value="">{t("shop.addItem")}</option>
            {selectable.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          {itemId && (
            <>
              <span className="label">{t("shop.priceHere")}</span>
              <PricesEditor
                currencies={currencies}
                value={prices}
                onChange={setPrices}
              />
              <input
                className="npc-edit__input"
                aria-label={t("inventory.notes")}
                placeholder={t("shop.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={() => void save()}>
                  {editing ? t("common.save") : t("npcTypes.add")}
                </button>
                <button className="btn btn-secondary" onClick={reset}>
                  {t("common.cancel")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
