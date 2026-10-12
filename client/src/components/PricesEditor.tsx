import { X } from "lucide-react";
import "../screens/NpcEdit.css";
import "./QuestNpcs.css";
import type { Currency, ItemPrice } from "../data/domain";
import { useT } from "../lib/i18n";

interface PricesEditorProps {
  currencies: Currency[];
  value: ItemPrice[];
  onChange: (next: ItemPrice[]) => void;
}

export function PricesEditor({
  currencies,
  value,
  onChange,
}: PricesEditorProps) {
  const t = useT();

  if (currencies.length === 0) {
    return <div className="npc-edit__hint">{t("economy.noCurrenciesYet")}</div>;
  }

  const unused = currencies.filter(
    (c) => !value.some((p) => p.currencyId === c.id),
  );

  function update(index: number, patch: Partial<ItemPrice>) {
    onChange(value.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <div className="quest-npcs">
      {value.map((p, index) => (
        <div key={`${p.currencyId}-${index}`} className="quest-npcs__row">
          <select
            className="npc-edit__select npc-edit__select--native quest-npcs__name"
            aria-label={t("economy.currency")}
            value={p.currencyId}
            onChange={(e) => update(index, { currencyId: e.target.value })}
          >
            {currencies
              .filter(
                (c) =>
                  c.id === p.currencyId ||
                  !value.some((x) => x.currencyId === c.id),
              )
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <input
            className="npc-edit__input quest-npcs__role"
            type="number"
            min={0}
            step="any"
            aria-label={t("economy.amount")}
            value={Number.isFinite(p.amount) ? p.amount : ""}
            onChange={(e) =>
              update(index, {
                amount: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
          />
          <button
            type="button"
            className="quest-npcs__remove"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            aria-label={t("questNpcs.remove")}
            title={t("questNpcs.remove")}
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      {unused.length > 0 && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ alignSelf: "flex-start" }}
          onClick={() =>
            onChange([...value, { currencyId: unused[0].id, amount: 0 }])
          }
        >
          {t("economy.addPrice")}
        </button>
      )}
    </div>
  );
}
