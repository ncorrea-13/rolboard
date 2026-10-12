import { Fragment, useState } from "react";
import "../styles/list.css";
import {
  crystalColor,
  questStatusColor,
  questStatusLabel,
  type Quest,
  type QuestStatus,
} from "../data/domain";
import { useLang, useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import { Link } from "../components/Link";
import { entityImageUrl } from "../lib/images";

const statusOrder: QuestStatus[] = ["active", "on_hold", "completed", "failed"];
const priorityLabel = { 1: "P1", 2: "P2", 3: "P3" } as const;
const priorityColor = {
  1: "color-mix(in srgb, var(--status-dead) 70%, var(--text-primary))",
  2: "var(--accent-flame)",
  3: "var(--text-secondary)",
} as const;

interface QuestsListProps {
  quests: Quest[];
  onCreate: () => void;
  onSetStatus: (id: string, status: QuestStatus) => void;
  imageVersion?: number;
}

export function QuestsList({
  quests,
  onCreate,
  onSetStatus,
  imageVersion = 0,
}: QuestsListProps) {
  const t = useT();
  const lang = useLang();
  const [search, setSearch] = useState("");
  const q2 = search.trim().toLowerCase();
  const filtered = q2
    ? quests.filter(
        (q) =>
          q.name.toLowerCase().includes(q2) ||
          q.hook.toLowerCase().includes(q2),
      )
    : quests;
  const ordered = [...filtered].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
  );
  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div>
          <div className="display page-title" role="heading" aria-level={1}>
            {t("questsList.title")}
          </div>
          <span className="list-page__count">
            {quests.length} {t("questsList.count")}
          </span>
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
        {ordered.map((q, i) => (
          <Fragment key={q.id}>
            {(i === 0 || ordered[i - 1].status !== q.status) && (
              <div className="group-head">
                <span
                  className="status-dot"
                  style={{ background: questStatusColor[q.status] }}
                />
                <span className="display group-head__title">
                  {questStatusLabel[lang][q.status]}
                </span>
                <span className="group-head__count">
                  {ordered.filter((x) => x.status === q.status).length}
                </span>
                <span className="group-head__rule" />
              </div>
            )}
            <div
              className={`list-page__row list-page__row--clickable quest-row${q.status === "completed" ? " quest-row--done" : ""}`}
            >
              <button
                type="button"
                className="quest-check"
                aria-pressed={q.status === "completed"}
                title={t(
                  q.status === "completed"
                    ? "questsList.reopen"
                    : "questsList.complete",
                )}
                aria-label={t(
                  q.status === "completed"
                    ? "questsList.reopen"
                    : "questsList.complete",
                )}
                onClick={() =>
                  onSetStatus(
                    q.id,
                    q.status === "completed" ? "active" : "completed",
                  )
                }
              />
              <Link
                className="quest-row__link"
                route={{ name: "entity-detail", kind: "quest", id: q.id }}
              >
                {q.hasImage && (
                  <img
                    className="list-page__thumbnail"
                    src={entityImageUrl(
                      "quest",
                      q.id,
                      q.hasImage,
                      imageVersion,
                    )}
                    alt=""
                  />
                )}
                <div className="list-page__row-main">
                  <span className="title-underline">
                    <span className="list-page__row-title">{q.name}</span>
                    <span
                      className="title-underline__bar"
                      style={{ background: crystalColor[q.crystal] }}
                    />
                  </span>
                  <div
                    className="list-page__row-sub list-page__row-sub--clamp-1"
                    style={{ marginTop: 6 }}
                  >
                    <MarkdownText inline text={q.hook} />
                  </div>
                </div>
                {priorityLabel[q.priority] && (
                  <span
                    className="list-page__badge"
                    style={{
                      color: priorityColor[q.priority],
                      borderColor: priorityColor[q.priority],
                    }}
                  >
                    {priorityLabel[q.priority]}
                  </span>
                )}
              </Link>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
