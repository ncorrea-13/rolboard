import { useMemo, useState, type CSSProperties } from "react";
import "./NpcList.css";
import type { Arc, Location, LoreCategory, LoreEntry } from "../data/domain";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import { Link } from "../components/Link";
import {
  NpcTypesButton,
  type NpcTypesApi,
  type NpcTypesTexts,
} from "../components/NpcTypesManager";

const LORE_TEXTS: NpcTypesTexts = {
  manage: "loreCategories.manage",
  title: "loreCategories.title",
  hint: "loreCategories.hint",
  newPlaceholder: "loreCategories.newPlaceholder",
  confirmDelete: "loreCategories.confirmDelete",
};

const PAGE_SIZE = 25;

interface LoreListProps {
  entries: LoreEntry[];
  categories: LoreCategory[];
  categoriesApi: NpcTypesApi;
  arcs: Arc[];
  locations: Location[];
  onCreate: () => void;
}

export function LoreList({
  entries,
  categories,
  categoriesApi,
  arcs,
  locations,
  onCreate,
}: LoreListProps) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(),
  );
  const [page, setPage] = useState(1);

  function toggleCategory(id: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (
        q &&
        !e.title.toLowerCase().includes(q) &&
        !e.body.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (
        activeCategories.size > 0 &&
        !(e.categoryId && activeCategories.has(e.categoryId))
      ) {
        return false;
      }
      return true;
    });
  }, [entries, search, activeCategories]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="card npc-list">
      <div className="npc-list__header">
        <div className="display" style={{ fontSize: 21 }}>
          {t("loreList.title")}{" "}
          <span className="npc-list__count">
            · {filtered.length} / {entries.length}
          </span>
        </div>
        <div className="npc-list__actions">
          <input
            className="npc-list__search"
            placeholder={t("loreList.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <NpcTypesButton api={categoriesApi} texts={LORE_TEXTS} />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("loreList.new")}
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="npc-list__filters">
          <span className="npc-list__filter-label">
            {t("loreList.categoryFilterLabel")}
          </span>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`npc-list__filter-chip${activeCategories.has(c.id) ? " npc-list__filter-chip--active" : ""}`}
              style={{ "--c": c.color } as CSSProperties}
              onClick={() => toggleCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="npc-list__row npc-list__row--lore npc-list__row--head">
        <span>{t("loreList.colTitle")}</span>
        <span>{t("loreList.colCategory")}</span>
        <span>{t("loreList.colLinks")}</span>
      </div>

      {filtered.length === 0 && (
        <div className="npc-list__empty">{t("loreList.empty")}</div>
      )}

      {paged.map((e) => {
        const category = categories.find((c) => c.id === e.categoryId);
        const arc = arcs.find((a) => a.id === e.arcId);
        const location = locations.find((l) => l.id === e.locationId);
        const links = [arc?.label, location?.name].filter(Boolean).join(" · ");
        return (
          <Link
            key={e.id}
            className="npc-list__row npc-list__row--lore npc-list__row--data"
            route={{ name: "lore-detail", entryId: e.id }}
          >
            <div className="npc-list__lore-main">
              <span className="npc-list__lore-title">{e.title}</span>
              {e.body && (
                <div className="npc-list__lore-sub">
                  <MarkdownText inline text={e.body} />
                </div>
              )}
            </div>
            <span className="npc-list__type">
              {category && (
                <span
                  className="type-chip"
                  style={{ "--c": category.color } as CSSProperties}
                >
                  {category.label}
                </span>
              )}
            </span>
            <span className="npc-list__cell">{links}</span>
          </Link>
        );
      })}

      {pageCount > 1 && (
        <div className="npc-list__pagination">
          <button
            className="btn btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            {t("npcList.prev")}
          </button>
          <span className="npc-list__pagination-label">
            {t("npcList.page")} {currentPage} {t("npcList.of")} {pageCount}
          </span>
          <button
            className="btn btn-secondary"
            disabled={currentPage >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            {t("npcList.next")}
          </button>
        </div>
      )}
    </div>
  );
}
