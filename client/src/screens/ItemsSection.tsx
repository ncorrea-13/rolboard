import { useMemo, useState, type CSSProperties } from "react";
import "./NpcList.css";
import { Tabs } from "../components/Tabs";
import { Modal } from "../components/Modal";
import { MarkdownField } from "../components/MarkdownField";
import { MarkdownText } from "../components/MarkdownText";
import { PricesEditor } from "../components/PricesEditor";
import { EntityImageField } from "../components/EntityImageField";
import { usePendingImage } from "../hooks/usePendingImage";
import { entityImageUrl } from "../lib/images";
import {
  formatPrices,
  type Currency,
  type Item,
  type ItemPrice,
  type Location,
} from "../data/domain";
import type { CurrencyValues, ItemValues } from "../lib/apiMappers";
import { useT } from "../lib/i18n";
import { CurrenciesView } from "./CurrenciesView";
import { withViewTransition } from "../lib/motion";

type ItemsTab = "items" | "currencies";
const TAB_STORAGE_KEY = "rolboard.itemsTab";

function readStoredTab(): ItemsTab {
  try {
    return localStorage.getItem(TAB_STORAGE_KEY) === "currencies"
      ? "currencies"
      : "items";
  } catch {
    return "items";
  }
}

interface ItemsSectionProps {
  items: Item[];
  currencies: Currency[];
  locations: Location[];
  onSaveItem: (
    id: string | null,
    values: ItemValues,
    image?: File,
  ) => Promise<boolean>;
  onDeleteItem: (id: string) => Promise<boolean>;
  onUploadItemImage: (id: string, file: File) => Promise<void>;
  onRemoveItemImage: (id: string) => Promise<void>;
  imageVersion?: number;
  onSaveCurrency: (
    id: string | null,
    values: CurrencyValues,
  ) => Promise<boolean>;
  onDeleteCurrency: (id: string) => Promise<boolean>;
}

function ItemModal({
  item,
  items,
  currencies,
  onSave,
  onDelete,
  onClose,
  imageVersion,
  onUploadImage,
  onRemoveImage,
}: {
  item: Item | null;
  items: Item[];
  currencies: Currency[];
  onSave: (values: ItemValues, image?: File) => Promise<boolean>;
  onDelete?: () => void;
  onClose: () => void;
  imageVersion?: number;
  onUploadImage?: (file: File) => Promise<void>;
  onRemoveImage?: () => Promise<void>;
}) {
  const t = useT();
  const pendingImage = usePendingImage();
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [rarity, setRarity] = useState(item?.rarity ?? "");
  const [weight, setWeight] = useState(
    item?.weight != null ? String(item.weight) : "",
  );
  const [description, setDescription] = useState(item?.description ?? "");
  const [effect, setEffect] = useState(item?.effect ?? "");
  const [prices, setPrices] = useState<ItemPrice[]>(item?.prices ?? []);
  const [saving, setSaving] = useState(false);

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const rarities = [...new Set(items.map((i) => i.rarity).filter(Boolean))];
  const parsedWeight = weight.trim() === "" ? undefined : Number(weight);
  const weightValid =
    parsedWeight === undefined ||
    (Number.isFinite(parsedWeight) && parsedWeight >= 0);
  const canSave = name.trim() !== "" && weightValid && !saving;

  async function save() {
    setSaving(true);
    const ok = await onSave(
      {
        name: name.trim(),
        description,
        effect,
        category: category.trim(),
        rarity: rarity.trim(),
        weight: parsedWeight,
        prices,
      },
      pendingImage.file,
    );
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal
      title={item ? t("items.editItem") : t("items.newItem")}
      onClose={onClose}
      size="sheet"
    >
      <div>
        <label className="label" htmlFor="item-name">
          {t("items.name")}
        </label>
        <input
          id="item-name"
          className="npc-edit__input"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <EntityImageField
        kind="item"
        label={t("items.image")}
        entity={item ?? { id: "" }}
        pending={pendingImage}
        imageVersion={imageVersion}
        onUpload={onUploadImage}
        onRemove={onRemoveImage}
      />
      <div className="npc-edit__grid-2">
        <div>
          <label className="label" htmlFor="item-category">
            {t("items.category")}
          </label>
          <input
            id="item-category"
            className="npc-edit__input"
            list="item-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="item-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="item-rarity">
            {t("items.rarity")}
          </label>
          <input
            id="item-rarity"
            className="npc-edit__input"
            list="item-rarities"
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
          />
          <datalist id="item-rarities">
            {rarities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="item-weight">
          {t("items.weight")}
        </label>
        <input
          id="item-weight"
          className="npc-edit__input"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </div>
      <MarkdownField
        label={`${t("common.description")} ${t("common.supportsMarkdown")}`}
        minHeight={100}
        value={description}
        onChange={setDescription}
      />
      <MarkdownField
        label={`${t("items.effect")} ${t("common.supportsMarkdown")}`}
        minHeight={80}
        value={effect}
        onChange={setEffect}
      />
      <div>
        <span className="label">{t("items.prices")}</span>
        <div style={{ marginTop: 6 }}>
          <PricesEditor
            currencies={currencies}
            value={prices}
            onChange={setPrices}
          />
        </div>
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

function ItemsList({
  items,
  currencies,
  onSave,
  onDelete,
  onUploadImage,
  onRemoveImage,
  imageVersion = 0,
}: {
  items: Item[];
  currencies: Currency[];
  onSave: ItemsSectionProps["onSaveItem"];
  onDelete: ItemsSectionProps["onDeleteItem"];
  onUploadImage: ItemsSectionProps["onUploadItemImage"];
  onRemoveImage: ItemsSectionProps["onRemoveItemImage"];
  imageVersion?: number;
}) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(),
  );
  const [editing, setEditing] = useState<Item | "new" | null>(null);

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (activeCategories.size === 0 || activeCategories.has(i.category)) &&
        (!q ||
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.effect.toLowerCase().includes(q)),
    );
  }, [items, search, activeCategories]);

  function toggle(category: string) {
    withViewTransition(() => {
      setActiveCategories((prev) => {
        const next = new Set(prev);
        if (next.has(category)) next.delete(category);
        else next.add(category);
        return next;
      });
    }, "filter");
  }

  return (
    <div className="card npc-list">
      <div className="npc-list__header">
        <div className="display page-title" role="heading" aria-level={1}>
          {t("items.title")}{" "}
          <span className="npc-list__count">
            · {filtered.length} / {items.length}
          </span>
        </div>
        <div className="npc-list__actions">
          <input
            className="npc-list__search"
            aria-label={t("items.searchPlaceholder")}
            placeholder={t("items.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            {t("items.newItem")}
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="npc-list__filters">
          <span className="npc-list__filter-label">
            {t("items.categoryFilterLabel")}
          </span>
          {categories.map((c) => (
            <button
              key={c}
              className={`npc-list__filter-chip${activeCategories.has(c) ? " npc-list__filter-chip--active" : ""}`}
              style={{ "--c": "var(--accent-cyan)" } as CSSProperties}
              onClick={() => toggle(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="npc-list__empty">{t("items.empty")}</div>
      )}

      <div className="item-grid">
        {filtered.map((i) => {
          const prices = formatPrices(i.prices, currencies);
          const imageUrl = entityImageUrl(
            "item",
            i.id,
            i.hasImage,
            imageVersion,
          );
          return (
            <button
              key={i.id}
              type="button"
              className="item-card vt"
              style={{ "--vt": `item-${i.id}` } as CSSProperties}
              onClick={() => setEditing(i)}
            >
              {imageUrl && (
                <img className="item-card__image" src={imageUrl} alt="" />
              )}
              {i.category && (
                <span className="item-card__category">{i.category}</span>
              )}
              <span className="display item-card__name">{i.name}</span>
              {(i.effect || i.description) && (
                <span className="item-card__effect">
                  <MarkdownText inline text={i.effect || i.description} />
                </span>
              )}
              {(i.rarity || prices) && (
                <span className="item-card__foot">
                  <span className="item-card__rarity">{i.rarity}</span>
                  <span className="item-card__prices">{prices}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {editing && (
        <ItemModal
          key={editing === "new" ? "new" : editing.id}
          item={
            editing === "new"
              ? null
              : (items.find((i) => i.id === editing.id) ?? editing)
          }
          items={items}
          currencies={currencies}
          imageVersion={imageVersion}
          onUploadImage={
            editing === "new"
              ? undefined
              : (file) => onUploadImage(editing.id, file)
          }
          onRemoveImage={
            editing === "new" ? undefined : () => onRemoveImage(editing.id)
          }
          onSave={(values, image) =>
            onSave(editing === "new" ? null : editing.id, values, image)
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

export function ItemsSection({
  items,
  currencies,
  locations,
  onSaveItem,
  onDeleteItem,
  onUploadItemImage,
  onRemoveItemImage,
  imageVersion,
  onSaveCurrency,
  onDeleteCurrency,
}: ItemsSectionProps) {
  const t = useT();
  const [tab, setTab] = useState<ItemsTab>(readStoredTab);

  function selectTab(next: ItemsTab) {
    setTab(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      return;
    }
  }

  return (
    <div>
      <Tabs
        tabs={[
          { key: "items", label: t("items.tabItems") },
          { key: "currencies", label: t("items.tabCurrencies") },
        ]}
        active={tab}
        onChange={selectTab}
      />
      {tab === "items" ? (
        <ItemsList
          items={items}
          currencies={currencies}
          onSave={onSaveItem}
          onDelete={onDeleteItem}
          onUploadImage={onUploadItemImage}
          onRemoveImage={onRemoveItemImage}
          imageVersion={imageVersion}
        />
      ) : (
        <CurrenciesView
          currencies={currencies}
          locations={locations}
          onSave={onSaveCurrency}
          onDelete={onDeleteCurrency}
        />
      )}
    </div>
  );
}
