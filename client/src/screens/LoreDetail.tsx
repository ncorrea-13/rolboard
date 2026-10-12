import "./NpcEdit.css";
import "./NpcDetail.css";
import type { Arc, Location, LoreCategory, LoreEntry } from "../data/domain";
import { locationBreadcrumb } from "../data/domain";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import { Link } from "../components/Link";

interface LoreDetailProps {
  entry: LoreEntry;
  category?: LoreCategory;
  arc?: Arc;
  location?: Location;
  locations: Location[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function LoreDetail({
  entry,
  category,
  arc,
  location,
  locations,
  onBack,
  onEdit,
  onDelete,
}: LoreDetailProps) {
  const t = useT();
  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar">
        <div className="npc-edit__bar-left">
          <span
            className="status-dot"
            style={category ? { background: category.color } : undefined}
          />
          <span
            style={{
              fontWeight: 500,
              fontSize: 13.5,
              color: "var(--text-primary)",
            }}
          >
            {entry.title}
          </span>
          {category && (
            <span className="npc-detail__appearance-chip">
              {category.label}
            </span>
          )}
        </div>
        <div className="npc-edit__bar-actions">
          <button className="btn btn-danger-outline" onClick={onDelete}>
            {t("entityDetail.deactivate")}
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            {t("common.back")}
          </button>
          <button className="btn btn-primary" onClick={onEdit}>
            {t("common.edit")}
          </button>
        </div>
      </div>
      <div className="npc-edit__body">
        <div className="npc-edit__col">
          {entry.body ? (
            <MarkdownText className="npc-detail__desc" text={entry.body} />
          ) : (
            <span style={{ color: "var(--text-secondary)" }}>
              {t("loreDetail.empty")}
            </span>
          )}
        </div>
        <div className="npc-edit__col">
          {arc && (
            <div>
              <span className="label">{t("loreEdit.arc")}</span>
              <div>
                <Link
                  route={{ name: "entity-detail", kind: "arc", id: arc.id }}
                >
                  {arc.label}
                </Link>
              </div>
            </div>
          )}
          {location && (
            <div>
              <span className="label">{t("loreEdit.location")}</span>
              <div>
                <Link
                  route={{
                    name: "entity-detail",
                    kind: "location",
                    id: location.id,
                  }}
                >
                  {locationBreadcrumb(location, locations)}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
