import { useState } from "react";
import "./NpcEdit.css";
import {
  locationBreadcrumb,
  type Arc,
  type Location,
  type LoreCategory,
  type LoreEntry,
} from "../data/domain";
import { useT } from "../lib/i18n";
import { MarkdownField } from "../components/MarkdownField";

type LoreValues = Pick<
  LoreEntry,
  "title" | "body" | "categoryId" | "arcId" | "locationId"
>;

interface LoreEditProps {
  entry: LoreEntry;
  categories: LoreCategory[];
  arcs: Arc[];
  locations: Location[];
  onSave: (values: LoreValues) => void;
  onDiscard: () => void;
}

export function LoreEdit({
  entry,
  categories,
  arcs,
  locations,
  onSave,
  onDiscard,
}: LoreEditProps) {
  const t = useT();
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);
  const [categoryId, setCategoryId] = useState(entry.categoryId ?? "");
  const [arcId, setArcId] = useState(entry.arcId ?? "");
  const [locationId, setLocationId] = useState(entry.locationId ?? "");

  const dirty =
    title !== entry.title ||
    body !== entry.body ||
    categoryId !== (entry.categoryId ?? "") ||
    arcId !== (entry.arcId ?? "") ||
    locationId !== (entry.locationId ?? "");

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar">
        <div className="npc-edit__bar-left">
          <span className="status-dot" />
          <span
            style={{
              fontWeight: 500,
              fontSize: 13.5,
              color: "var(--text-primary)",
            }}
          >
            {entry.id
              ? `${t("common.editing")} · ${entry.title}`
              : t("loreEdit.new")}
          </span>
          {dirty && (
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {t("common.unsavedChanges")}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onDiscard}>
            {t("common.discard")}
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              onSave({
                title,
                body,
                categoryId: categoryId || undefined,
                arcId: arcId || undefined,
                locationId: locationId || undefined,
              })
            }
          >
            {t("common.save")}
          </button>
        </div>
      </div>
      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div>
            <span className="label">{t("loreEdit.title")}</span>
            <input
              className="npc-edit__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <MarkdownField
            label={`${t("loreEdit.body")} ${t("common.supportsMarkdown")}`}
            minHeight={320}
            value={body}
            onChange={setBody}
          />
        </div>
        <div className="npc-edit__col">
          <div>
            <span className="label">{t("loreEdit.category")}</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{t("loreEdit.noCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">{t("loreEdit.arc")}</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              value={arcId}
              onChange={(e) => setArcId(e.target.value)}
            >
              <option value="">{t("sessionsTimeline.noArc")}</option>
              {arcs.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">{t("loreEdit.location")}</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">{t("npcEdit.noLocation")}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {locationBreadcrumb(l, locations)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
