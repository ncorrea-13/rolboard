import { useState } from "react";
import "./NpcEdit.css";
import {
  locationBreadcrumb,
  sessionCode,
  type Location,
  type LoreEntry,
  type Npc,
  type Secret,
  type SecretStatus,
  type Session,
} from "../data/domain";
import type { SecretValues } from "../lib/apiMappers";
import { useT } from "../lib/i18n";
import { MarkdownField } from "../components/MarkdownField";

interface SecretEditProps {
  secret: Secret;
  npcs: Npc[];
  locations: Location[];
  loreEntries: LoreEntry[];
  sessions: Session[];
  onSave: (values: SecretValues) => void;
  onDiscard: () => void;
}

export function SecretEdit({
  secret,
  npcs,
  locations,
  loreEntries,
  sessions,
  onSave,
  onDiscard,
}: SecretEditProps) {
  const t = useT();
  const [title, setTitle] = useState(secret.title);
  const [body, setBody] = useState(secret.body);
  const [status, setStatus] = useState<SecretStatus>(secret.status);
  const [sessionId, setSessionId] = useState(secret.revealedSessionId ?? "");
  const [npcId, setNpcId] = useState(secret.npcId ?? "");
  const [locationId, setLocationId] = useState(secret.locationId ?? "");
  const [loreEntryId, setLoreEntryId] = useState(secret.loreEntryId ?? "");
  const [knownBy, setKnownBy] = useState<string[]>(secret.knownByNpcIds);

  const dirty =
    title !== secret.title ||
    body !== secret.body ||
    status !== secret.status ||
    sessionId !== (secret.revealedSessionId ?? "") ||
    npcId !== (secret.npcId ?? "") ||
    locationId !== (secret.locationId ?? "") ||
    loreEntryId !== (secret.loreEntryId ?? "") ||
    knownBy.join(",") !== secret.knownByNpcIds.join(",");

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar">
        <div className="npc-edit__bar-left">
          <span className="status-dot" />
          <span className="npc-edit__title" role="heading" aria-level={1}>
            {secret.id
              ? `${t("common.editing")} · ${secret.title}`
              : t("secretEdit.new")}
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
                status,
                revealedSessionId:
                  status === "revealed" && sessionId ? sessionId : undefined,
                npcId: npcId || undefined,
                locationId: locationId || undefined,
                loreEntryId: loreEntryId || undefined,
                knownByNpcIds: knownBy,
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
            <label className="label" htmlFor="secret-title">
              {t("secretEdit.title")}
            </label>
            <input
              id="secret-title"
              className="npc-edit__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <MarkdownField
            label={`${t("secretEdit.body")} ${t("common.supportsMarkdown")}`}
            minHeight={280}
            value={body}
            onChange={setBody}
          />
        </div>
        <div className="npc-edit__col">
          <div className="npc-edit__grid-2">
            <div>
              <label className="label" htmlFor="secret-status">
                {t("common.status")}
              </label>
              <select
                id="secret-status"
                className="npc-edit__select npc-edit__select--native"
                value={status}
                onChange={(e) => setStatus(e.target.value as SecretStatus)}
              >
                <option value="hidden">{t("secret.hidden")}</option>
                <option value="revealed">{t("secret.revealed")}</option>
              </select>
            </div>
            {status === "revealed" && (
              <div>
                <label className="label" htmlFor="secret-session">
                  {t("secretEdit.revealedIn")}
                </label>
                <select
                  id="secret-session"
                  className="npc-edit__select npc-edit__select--native"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                >
                  <option value="">{t("secretEdit.noSession")}</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {sessionCode(s)}
                      {s.title ? ` · ${s.title}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="secret-npc">
              {t("secretEdit.aboutNpc")}
            </label>
            <select
              id="secret-npc"
              className="npc-edit__select npc-edit__select--native"
              value={npcId}
              onChange={(e) => setNpcId(e.target.value)}
            >
              <option value="">{t("secretEdit.none")}</option>
              {npcs.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="secret-location">
              {t("loreEdit.location")}
            </label>
            <select
              id="secret-location"
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
          <div>
            <label className="label" htmlFor="secret-lore">
              {t("secretEdit.loreEntry")}
            </label>
            <select
              id="secret-lore"
              className="npc-edit__select npc-edit__select--native"
              value={loreEntryId}
              onChange={(e) => setLoreEntryId(e.target.value)}
            >
              <option value="">{t("secretEdit.none")}</option>
              {loreEntries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="secret-known">
              {t("secretEdit.knownBy")}
            </label>
            <select
              id="secret-known"
              className="npc-edit__select npc-edit__select--native"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id && !knownBy.includes(id)) setKnownBy([...knownBy, id]);
              }}
            >
              <option value="">{t("secretEdit.addNpc")}</option>
              {npcs
                .filter((n) => !knownBy.includes(n.id))
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
            </select>
            {knownBy.length > 0 && (
              <div
                className="npc-edit__type-row"
                style={{ flexWrap: "wrap", marginTop: 8 }}
              >
                {knownBy.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="npc-edit__type-chip npc-edit__type-chip--active"
                    onClick={() => setKnownBy(knownBy.filter((x) => x !== id))}
                    title={t("secretEdit.remove")}
                  >
                    {npcs.find((n) => n.id === id)?.name ?? id} ×
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
