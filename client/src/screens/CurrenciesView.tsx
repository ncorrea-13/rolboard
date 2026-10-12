import { useState } from "react";
import "./NpcList.css";
import { Modal } from "../components/Modal";
import {
  locationBreadcrumb,
  type Currency,
  type Location,
} from "../data/domain";
import type { CurrencyValues } from "../lib/apiMappers";
import { useT } from "../lib/i18n";

interface CurrenciesViewProps {
  currencies: Currency[];
  locations: Location[];
  onSave: (id: string | null, values: CurrencyValues) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

function CurrencyModal({
  currency,
  base,
  locations,
  onSave,
  onDelete,
  onClose,
}: {
  currency: Currency | null;
  base?: Currency;
  locations: Location[];
  onSave: (values: CurrencyValues) => Promise<boolean>;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(currency?.name ?? "");
  const [symbol, setSymbol] = useState(currency?.symbol ?? "");
  const [rate, setRate] = useState(
    currency?.rateToBase != null ? String(currency.rateToBase) : "",
  );
  const [isBase, setIsBase] = useState(currency?.isBase ?? false);
  const [locationIds, setLocationIds] = useState<string[]>(
    currency?.locationIds ?? [],
  );
  const [saving, setSaving] = useState(false);

  const parsedRate =
    rate.trim() === "" ? undefined : Number(rate.replace(",", "."));
  const rateValid =
    isBase ||
    parsedRate === undefined ||
    (Number.isFinite(parsedRate) && parsedRate > 0);
  const canSave = name.trim() !== "" && rateValid && !saving;

  async function save() {
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      symbol: symbol.trim(),
      rateToBase: isBase ? undefined : parsedRate,
      isBase,
      locationIds,
    });
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal
      title={currency ? t("currencies.edit") : t("currencies.new")}
      onClose={onClose}
      size="sheet"
    >
      <div className="npc-edit__grid-2">
        <div>
          <label className="label" htmlFor="currency-name">
            {t("items.name")}
          </label>
          <input
            id="currency-name"
            className="npc-edit__input"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="currency-symbol">
            {t("currencies.symbol")}
          </label>
          <input
            id="currency-symbol"
            className="npc-edit__input"
            value={symbol}
            maxLength={8}
            onChange={(e) => setSymbol(e.target.value)}
          />
        </div>
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13.5,
        }}
      >
        <input
          type="checkbox"
          checked={isBase}
          onChange={(e) => setIsBase(e.target.checked)}
        />
        {t("currencies.isBase")}
      </label>
      {!isBase && (
        <div>
          <label className="label" htmlFor="currency-rate">
            {t("currencies.rate")}
            {base ? ` (${t("currencies.rateIn")} ${base.name})` : ""}
          </label>
          <input
            id="currency-rate"
            className="npc-edit__input"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
          <div className="npc-edit__hint">{t("currencies.rateHint")}</div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="currency-locations">
          {t("currencies.circulatesIn")}
        </label>
        <select
          id="currency-locations"
          className="npc-edit__select npc-edit__select--native"
          value=""
          onChange={(e) => {
            const id = e.target.value;
            if (id && !locationIds.includes(id))
              setLocationIds([...locationIds, id]);
          }}
        >
          <option value="">{t("currencies.addLocation")}</option>
          {locations
            .filter((l) => !locationIds.includes(l.id))
            .map((l) => (
              <option key={l.id} value={l.id}>
                {locationBreadcrumb(l, locations)}
              </option>
            ))}
        </select>
        {locationIds.length > 0 && (
          <div
            className="npc-edit__type-row"
            style={{ flexWrap: "wrap", marginTop: 8 }}
          >
            {locationIds.map((id) => (
              <button
                key={id}
                type="button"
                className="npc-edit__type-chip npc-edit__type-chip--active"
                onClick={() =>
                  setLocationIds(locationIds.filter((x) => x !== id))
                }
                title={t("questNpcs.remove")}
              >
                {locations.find((l) => l.id === id)?.name ?? id} ×
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <div>
          {onDelete && (
            <button className="btn btn-danger-outline" onClick={onDelete}>
              {t("entityDetail.deactivate")}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => void save()}
            disabled={!canSave}
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function CurrenciesView({
  currencies,
  locations,
  onSave,
  onDelete,
}: CurrenciesViewProps) {
  const t = useT();
  const [editing, setEditing] = useState<Currency | "new" | null>(null);
  const base = currencies.find((c) => c.isBase);

  return (
    <div className="card npc-list">
      <div className="npc-list__header">
        <div className="display page-title" role="heading" aria-level={1}>
          {t("currencies.title")}{" "}
          <span className="npc-list__count">· {currencies.length}</span>
        </div>
        <div className="npc-list__actions">
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            {t("currencies.new")}
          </button>
        </div>
      </div>

      {currencies.length === 0 && (
        <div className="npc-list__empty">{t("currencies.empty")}</div>
      )}

      <div className="coin-grid">
        {currencies.map((c) => {
          const places = c.locationIds
            .map((id) => locations.find((l) => l.id === id)?.name)
            .filter(Boolean) as string[];
          return (
            <button
              key={c.id}
              type="button"
              className={`coin-card${c.isBase ? " coin-card--base" : ""}`}
              onClick={() => setEditing(c)}
            >
              <span className="coin-card__coin">{c.symbol}</span>
              <span className="coin-card__body">
                <span className="display coin-card__name">{c.name}</span>
                <span className="coin-card__rate">
                  {c.isBase
                    ? t("currencies.base")
                    : `${t("currencies.rate")}: ${c.rateToBase ?? "—"}`}
                </span>
                {places.length > 0 && (
                  <span className="coin-card__places">{places.join(", ")}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {editing && (
        <CurrencyModal
          key={editing === "new" ? "new" : editing.id}
          currency={editing === "new" ? null : editing}
          base={base}
          locations={locations}
          onSave={(values) =>
            onSave(editing === "new" ? null : editing.id, values)
          }
          onDelete={
            editing === "new"
              ? undefined
              : async () => {
                  if (await onDelete(editing.id)) setEditing(null);
                }
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
