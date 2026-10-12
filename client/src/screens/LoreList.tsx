import { useMemo, useState, type CSSProperties } from "react";
import "./NpcList.css";
import "../styles/list.css";
import type { Arc, Location, LoreCategory, LoreEntry } from "../data/domain";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import { Link } from "../components/Link";
import { excerpt } from "../lib/excerpt";
import { entityImageUrl } from "../lib/images";
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
  imageVersion?: number;
}

export function LoreList({
  entries,
  categories,
  categoriesApi,
  arcs,
  locations,
  onCreate,
  imageVersion = 0,
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

  const groups = [
    ...categories.map((category) => ({
      category: category as LoreCategory | undefined,
      items: paged.filter((e) => e.categoryId === category.id),
    })),
    {
      category: undefined as LoreCategory | undefined,
      items: paged.filter(
        (e) => !categories.some((c) => c.id === e.categoryId),
      ),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="card npc-list">
      <div className="npc-list__header">
        <div className="display page-title" role="heading" aria-level={1}>
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

      {filtered.length === 0 && (
        <div className="npc-list__empty">{t("loreList.empty")}</div>
      )}

      <div className="lore-columns">
        {groups.map(({ category, items }) => (
          <section key={category?.id ?? "none"} className="lore-group">
            <div className="group-head">
              {category && (
                <>
                  <span
                    className="status-dot"
                    style={{ background: category.color }}
                  />
                  <span className="display group-head__title">
                    {category.label}
                  </span>
                  <span className="group-head__count">{items.length}</span>
                </>
              )}
              <span className="group-head__rule" />
            </div>
            <div className="lore-grid">
              {items.map((e) => {
                const arc = arcs.find((a) => a.id === e.arcId);
                const location = locations.find((l) => l.id === e.locationId);
                const links = [arc?.label, location?.name]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <Link
                    key={e.id}
                    className="lore-entry"
                    route={{ name: "lore-detail", entryId: e.id }}
                  >
                    {e.hasImage && (
                      <img
                        className="lore-entry__image"
                        src={entityImageUrl(
                          "lore",
                          e.id,
                          e.hasImage,
                          imageVersion,
                        )}
                        alt=""
                      />
                    )}
                    <span className="display lore-entry__title">{e.title}</span>
                    {e.body && (
                      <span className="lore-entry__excerpt">
                        <MarkdownText inline text={excerpt(e.body)} />
                      </span>
                    )}
                    {links && (
                      <span className="lore-entry__links">{links}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

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
