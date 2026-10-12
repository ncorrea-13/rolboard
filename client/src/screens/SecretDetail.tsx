import type { CSSProperties } from "react";
import "./NpcEdit.css";
import "./NpcDetail.css";
import {
  locationBreadcrumb,
  secretTone,
  sessionCode,
  type Location,
  type LoreEntry,
  type Npc,
  type Secret,
  type Session,
} from "../data/domain";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import { Link } from "../components/Link";

interface SecretDetailProps {
  secret: Secret;
  npcs: Npc[];
  locations: Location[];
  loreEntries: LoreEntry[];
  sessions: Session[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

export function SecretDetail({
  secret,
  npcs,
  locations,
  loreEntries,
  sessions,
  onBack,
  onEdit,
  onDelete,
  onToggleStatus,
}: SecretDetailProps) {
  const t = useT();
  const npc = npcs.find((n) => n.id === secret.npcId);
  const location = locations.find((l) => l.id === secret.locationId);
  const lore = loreEntries.find((e) => e.id === secret.loreEntryId);
  const session = sessions.find((s) => s.id === secret.revealedSessionId);
  const known = secret.knownByNpcIds
    .map((id) => npcs.find((n) => n.id === id))
    .filter(Boolean) as Npc[];
  const hidden = secret.status === "hidden";

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar">
        <div className="npc-edit__bar-left">
          <span
            className="status-dot"
            style={{ background: secretTone[secret.status] }}
          />
          <span className="npc-edit__title" role="heading" aria-level={1}>
            {secret.title}
          </span>
          <span
            className="type-chip"
            style={{ "--c": secretTone[secret.status] } as CSSProperties}
          >
            {t(hidden ? "secret.hidden" : "secret.revealed")}
          </span>
        </div>
        <div className="npc-edit__bar-actions">
          <button className="btn btn-danger-outline" onClick={onDelete}>
            {t("entityDetail.deactivate")}
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            {t("common.back")}
          </button>
          <button className="btn btn-secondary" onClick={onToggleStatus}>
            {t(hidden ? "secretDetail.reveal" : "secretDetail.hide")}
          </button>
          <button className="btn btn-primary" onClick={onEdit}>
            {t("common.edit")}
          </button>
        </div>
      </div>
      <div className="npc-edit__body">
        <div className="npc-edit__col">
          {secret.body ? (
            <MarkdownText className="npc-detail__desc" text={secret.body} />
          ) : (
            <span style={{ color: "var(--text-secondary)" }}>
              {t("secretDetail.empty")}
            </span>
          )}
        </div>
        <div className="npc-edit__col">
          {session && (
            <div>
              <span className="label">{t("secretEdit.revealedIn")}</span>
              <div>
                <Link route={{ name: "session-detail", sessionId: session.id }}>
                  {sessionCode(session)}
                  {session.title ? ` · ${session.title}` : ""}
                </Link>
              </div>
            </div>
          )}
          {(npc || location || lore) && (
            <div>
              <span className="label">{t("secretEdit.pointsTo")}</span>
              {npc && (
                <div>
                  <Link route={{ name: "npc-detail", npcId: npc.id }}>
                    {npc.name}
                  </Link>
                </div>
              )}
              {location && (
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
              )}
              {lore && (
                <div>
                  <Link route={{ name: "lore-detail", entryId: lore.id }}>
                    {lore.title}
                  </Link>
                </div>
              )}
            </div>
          )}
          <div>
            <span className="label">{t("secretEdit.knownBy")}</span>
            {known.length > 0 ? (
              <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                {known.map((n) => (
                  <Link
                    key={n.id}
                    className="npc-edit__type-chip"
                    route={{ name: "npc-detail", npcId: n.id }}
                  >
                    {n.name}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="npc-edit__hint">{t("secretDetail.nobody")}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
