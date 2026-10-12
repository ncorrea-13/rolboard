import { useEffect, useState } from "react";
import { X } from "lucide-react";
import "../screens/NpcEdit.css";
import "./QuestNpcs.css";
import { apiFetch } from "../lib/api";
import { reportError } from "../lib/notify";
import { useT } from "../lib/i18n";
import { mapInventoryEntry, type ApiInventoryEntry } from "../lib/apiMappers";
import type { InventoryEntry, Item } from "../data/domain";

interface InventoryProps {
  kind: "player-characters" | "npcs";
  ownerId: string;
  items: Item[];
}

export function Inventory({ kind, ownerId, items }: InventoryProps) {
  const t = useT();
  const base = `/${kind}/${ownerId}/items`;
  const [entries, setEntries] = useState<InventoryEntry[]>([]);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    let stale = false;
    apiFetch<ApiInventoryEntry[]>(base)
      .then((data) => {
        if (!stale) setEntries((data ?? []).map(mapInventoryEntry));
      })
      .catch((err) => reportError("toast.errorLoading", err));
    return () => {
      stale = true;
    };
  }, [base]);

  async function save(id: string, name: string, qty: number, notes: string) {
    try {
      await apiFetch(`${base}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ quantity: qty, notes }),
      });
      setEntries((prev) =>
        [
          ...prev.filter((e) => e.itemId !== id),
          { itemId: id, name, quantity: qty, notes },
        ].sort((a, b) => a.name.localeCompare(b.name)),
      );
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

  async function add() {
    const item = items.find((i) => i.id === itemId);
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    if (!item) return;
    await save(item.id, item.name, qty, "");
    setItemId("");
    setQuantity("1");
  }

  const available = items.filter(
    (i) => !entries.some((e) => e.itemId === i.id),
  );

  return (
    <div className="quest-npcs">
      {entries.length === 0 && (
        <div className="npc-edit__hint">{t("inventory.empty")}</div>
      )}
      {entries.map((e) => (
        <div key={e.itemId} className="quest-npcs__row">
          <span className="quest-npcs__name">{e.name}</span>
          <input
            className="npc-edit__input"
            style={{ width: 72, flex: "none", marginTop: 0 }}
            type="number"
            min={1}
            aria-label={t("inventory.quantity")}
            defaultValue={e.quantity}
            onBlur={(ev) => {
              const qty = Math.max(1, Math.floor(Number(ev.target.value) || 1));
              if (qty !== e.quantity) void save(e.itemId, e.name, qty, e.notes);
            }}
          />
          <input
            className="npc-edit__input quest-npcs__role"
            aria-label={t("inventory.notes")}
            placeholder={t("inventory.notesPlaceholder")}
            defaultValue={e.notes}
            onBlur={(ev) => {
              if (ev.target.value !== e.notes)
                void save(e.itemId, e.name, e.quantity, ev.target.value);
            }}
          />
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
      ))}
      {available.length > 0 && (
        <div className="quest-npcs__row quest-npcs__row--add">
          <select
            className="npc-edit__select npc-edit__select--native quest-npcs__name"
            aria-label={t("inventory.addItem")}
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          >
            <option value="">{t("inventory.addItem")}</option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <input
            className="npc-edit__input"
            style={{ width: 72, flex: "none", marginTop: 0 }}
            type="number"
            min={1}
            aria-label={t("inventory.quantity")}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void add()}
            disabled={!itemId}
          >
            {t("npcTypes.add")}
          </button>
        </div>
      )}
    </div>
  );
}
