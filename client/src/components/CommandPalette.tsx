import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "./CommandPalette.css";
import { Modal } from "./Modal";
import { useT, type TranslationKey } from "../lib/i18n";
import { searchItems, type SearchItem, type SearchKind } from "../lib/search";

const KIND_TONE: Record<SearchKind, string> = {
  npc: "var(--crystal-npc)",
  player: "var(--status-dead)",
  location: "var(--crystal-location)",
  faction: "var(--crystal-faction-quest)",
  arc: "var(--accent-sky)",
  quest: "var(--accent-teal)",
  session: "var(--status-alive)",
  encounter: "var(--accent-flame)",
  lore: "var(--accent-lime)",
  secret: "var(--accent-sun)",
  note: "var(--accent-orchid)",
  item: "var(--accent-cyan)",
  currency: "var(--accent-cyan)",
  event: "var(--accent-lime)",
};

interface CommandPaletteProps {
  items: SearchItem[];
  onSelect: (item: SearchItem) => void;
  onClose: () => void;
}

export function CommandPalette({
  items,
  onSelect,
  onClose,
}: CommandPaletteProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchItems(items, query), [items, query]);
  const current = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${current}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [current, results]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(current + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(current - 1, 0));
    } else if (e.key === "Enter" && results[current]) {
      e.preventDefault();
      onSelect(results[current]);
    }
  }

  return (
    <Modal title={t("search.title")} onClose={onClose} size="sheet">
      <input
        className="npc-edit__input palette__input"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="palette-results"
        aria-label={t("search.placeholder")}
        placeholder={t("search.placeholder")}
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <div
        id="palette-results"
        className="palette__results"
        role="listbox"
        ref={listRef}
      >
        {!query.trim() && (
          <div className="palette__empty">{t("search.hint")}</div>
        )}
        {query.trim() && results.length === 0 && (
          <div className="palette__empty">{t("search.empty")}</div>
        )}
        {results.map((r, i) => (
          <button
            key={r.key}
            type="button"
            role="option"
            aria-selected={i === current}
            data-index={i}
            className={`palette__row${i === current ? " palette__row--active" : ""}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => onSelect(r)}
          >
            <span
              className="type-chip"
              style={{ "--c": KIND_TONE[r.kind] } as CSSProperties}
            >
              {t(`search.kind.${r.kind}` as TranslationKey)}
            </span>
            <span className="palette__title">{r.title}</span>
            {r.subtitle && (
              <span className="palette__subtitle">{r.subtitle}</span>
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}
