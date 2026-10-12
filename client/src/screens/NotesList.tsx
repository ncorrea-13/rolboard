import { useState } from "react";
import "../styles/list.css";
import "./NpcEdit.css";
import { formatDate, type LooseNote } from "../data/domain";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import { Link } from "../components/Link";

interface NotesListProps {
  notes: LooseNote[];
  onCreate: () => void;
  onTogglePending: (note: LooseNote) => void;
}

export function NotesList({
  notes,
  onCreate,
  onTogglePending,
}: NotesListProps) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const pendingCount = notes.filter((n) => n.pending).length;
  const term = search.trim().toLowerCase();
  const filtered = notes.filter(
    (n) =>
      (!onlyPending || n.pending) &&
      (!term ||
        n.title.toLowerCase().includes(term) ||
        n.body.toLowerCase().includes(term)),
  );

  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display page-title" role="heading" aria-level={1}>
            {t("notesList.title")}
          </div>
          <span className="list-page__count">
            {notes.length} {t("notesList.count")} · {pendingCount}{" "}
            {t("notesList.pendingCount")}
          </span>
        </div>
        <div className="list-page__header-actions">
          <input
            className="list-page__search"
            placeholder={t("notesList.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("notesList.new")}
          </button>
        </div>
      </div>
      <div className="npc-edit__type-row" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`npc-edit__type-chip${!onlyPending ? " npc-edit__type-chip--active" : ""}`}
          onClick={() => setOnlyPending(false)}
        >
          {t("notesList.filterAll")}
        </button>
        <button
          type="button"
          className={`npc-edit__type-chip${onlyPending ? " npc-edit__type-chip--active" : ""}`}
          onClick={() => setOnlyPending(true)}
        >
          {t("notesList.filterPending")}
        </button>
      </div>
      <div className="list-page__rows">
        {filtered.length === 0 && (
          <span style={{ color: "var(--text-secondary)" }}>
            {t("notesList.empty")}
          </span>
        )}
        {[...filtered]
          .sort((a, b) => Number(b.pending) - Number(a.pending))
          .map((n) => (
            <div
              key={n.id}
              className={`list-page__row list-page__row--clickable${n.pending ? " note-row--pending" : ""}`}
            >
              <Link
                className="note-row__link"
                route={{ name: "note-detail", noteId: n.id }}
              >
                <div className="list-page__row-main">
                  <span className="list-page__row-title">
                    {n.pending && (
                      <span className="note-pin" aria-hidden="true" />
                    )}
                    {n.title}
                  </span>
                  {n.body && (
                    <div
                      className="list-page__row-sub list-page__row-sub--clamp-1"
                      style={{ marginTop: 6 }}
                    >
                      <MarkdownText inline text={n.body} />
                    </div>
                  )}
                </div>
                <span className="list-page__count">
                  {formatDate(n.updatedAt.slice(0, 10))}
                </span>
              </Link>
              <button
                type="button"
                className="note-row__toggle"
                onClick={() => onTogglePending(n)}
              >
                {t(n.pending ? "notesList.file" : "notesList.markPending")}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
