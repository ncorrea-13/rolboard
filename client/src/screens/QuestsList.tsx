import { useState } from "react";
import "../styles/list.css";
import { crystalColor, type Quest } from "../data/domain";
import { QuestStatusPill } from "../components/StatusPill";
import { useT } from "../lib/i18n";

const priorityLabel = { 1: "P1", 2: "P2", 3: "P3" } as const;
const priorityColor = {
  1: "var(--status-dead)",
  2: "var(--accent-flame)",
  3: "var(--text-secondary)",
} as const;

interface QuestsListProps {
  quests: Quest[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function QuestsList({ quests, onSelect, onCreate }: QuestsListProps) {
  const t = useT();
  const [search, setSearch] = useState("");
  const q2 = search.trim().toLowerCase();
  const filtered = q2
    ? quests.filter(
        (q) =>
          q.name.toLowerCase().includes(q2) ||
          q.hook.toLowerCase().includes(q2),
      )
    : quests;
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>
            {t("questsList.title")}
          </div>
          <span className="list-page__count">{quests.length} {t("questsList.count")}</span>
        </div>
        <div className="list-page__header-actions">
          <input
            className="list-page__search"
            placeholder={t("questsList.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={onCreate}>
            {t("questsList.new")}
          </button>
        </div>
      </div>
      <div className="list-page__rows">
        {filtered.map((q) => (
          <div
            key={q.id}
            className="list-page__row list-page__row--clickable"
            onClick={() => onSelect(q.id)}
          >
            <div className="list-page__row-main">
              <span className="title-underline">
                <span className="list-page__row-title">{q.name}</span>
                <span
                  className="title-underline__bar"
                  style={{ background: crystalColor[q.crystal] }}
                />
              </span>
              <div className="list-page__row-sub list-page__row-sub--clamp-1" style={{ marginTop: 6 }}>
                {q.hook}
              </div>
            </div>
            <span
              className="list-page__badge"
              style={{
                color: priorityColor[q.priority],
                borderColor: priorityColor[q.priority],
              }}
            >
              {priorityLabel[q.priority]}
            </span>
            <QuestStatusPill status={q.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
