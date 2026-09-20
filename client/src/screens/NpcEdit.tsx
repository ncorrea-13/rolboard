import { useEffect, useState } from "react";
import "./NpcEdit.css";
import {
  crystalColorFor,
  statusLabel,
  statusColor,
  locationBreadcrumb,
  type Npc,
  type StatMap,
  type StatusKind,
  type Location,
} from "../data/domain";
import { apiFetch } from "../lib/api";
import { entityImageUrl } from "../lib/images";
import { SkillsEditor } from "../components/SkillsEditor";
import { ImageUploadField } from "../components/ImageUploadField";
import {
  NpcTypesButton,
  type NpcTypesApi,
} from "../components/NpcTypesManager";
import { useT, useLang } from "../lib/i18n";
import type { CSSProperties } from "react";

const statusOptions: StatusKind[] = ["alive", "missing", "dead", "paused"];

interface NpcEditProps {
  npc: Npc;
  npcs: Npc[];
  locations: Location[];
  npcTypesApi: NpcTypesApi;
  onSave: (patch: Partial<Npc>) => void;
  onDiscard: () => void;
  imageVersion?: number;
  onUploadImage?: (file: File) => Promise<void>;
  onRemoveImage?: () => Promise<void>;
}

export function NpcEdit({
  npc,
  npcs,
  locations,
  npcTypesApi,
  onSave,
  onDiscard,
  imageVersion = 0,
  onUploadImage,
  onRemoveImage,
}: NpcEditProps) {
  const t = useT();
  const lang = useLang();
  const [name, setName] = useState(npc.name);
  const [description, setDescription] = useState(npc.description);
  const [status, setStatus] = useState<StatusKind>(npc.status);
  const [detailLevel, setDetailLevel] = useState<"full" | "minor">(
    npc.detailLevel,
  );
  const [crystal, setCrystal] = useState<string>(() =>
    npcTypesApi.types.some((x) => x.key === npc.crystal)
      ? npc.crystal
      : (npcTypesApi.types[0]?.key ?? npc.crystal),
  );
  const [linkRole, setLinkRole] = useState("");
  const [linkNpcId, setLinkNpcId] = useState("");
  const [existingLink, setExistingLink] = useState<{
    role: string;
    npcId: string;
  } | null>(null);
  const [locationId, setLocationId] = useState(npc.locationId ?? "");
  const [etnia, setEtnia] = useState(npc.etnia ?? "");
  const [tipoSpren, setTipoSpren] = useState(npc.tipoSpren ?? "");
  const [attributes, setAttributes] = useState<StatMap>(npc.attributes);
  const [skills, setSkills] = useState<StatMap>(npc.skills);

  useEffect(() => {
    if (!npc.id) return;
    apiFetch<{ to_npc_id: number; role: string }[]>(`/npcs/${npc.id}/relations`)
      .then((data) => {
        const first = (data ?? [])[0];
        if (!first) return;
        const link = { role: first.role, npcId: String(first.to_npc_id) };
        setExistingLink(link);
        setLinkRole(link.role);
        setLinkNpcId(link.npcId);
      })
      .catch((err) => console.error("Error cargando vínculo:", err));
  }, [npc.id]);

  const dirty =
    name !== npc.name ||
    description !== npc.description ||
    status !== npc.status ||
    detailLevel !== npc.detailLevel ||
    crystal !== npc.crystal ||
    locationId !== (npc.locationId ?? "") ||
    etnia !== (npc.etnia ?? "") ||
    tipoSpren !== (npc.tipoSpren ?? "") ||
    linkRole !== (existingLink?.role ?? "") ||
    linkNpcId !== (existingLink?.npcId ?? "") ||
    JSON.stringify(attributes) !== JSON.stringify(npc.attributes) ||
    JSON.stringify(skills) !== JSON.stringify(npc.skills);

  function syncLink(savedNpcId: string) {
    if (existingLink) {
      apiFetch(
        `/npcs/${savedNpcId}/relations/${existingLink.npcId}/${existingLink.role}`,
        {
          method: "DELETE",
        },
      ).catch((err) => console.error("Error borrando vínculo:", err));
    }
    if (linkNpcId) {
      apiFetch(`/npcs/${savedNpcId}/relations`, {
        method: "POST",
        body: JSON.stringify({
          to_npc_id: Number(linkNpcId),
          role: linkRole || "VINCULADO",
        }),
      }).catch((err) => console.error("Error guardando vínculo:", err));
    }
  }

  function handleSave() {
    onSave({
      name,
      description,
      status,
      detailLevel,
      crystal,
      locationId: locationId || undefined,
      etnia,
      tipoSpren,
      attributes,
      skills,
    });
    if (npc.id) syncLink(npc.id);
  }

  const linkTarget = npcs.find((n) => n.id === linkNpcId);
  const missingOrigin = locationId.trim() === "";

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
            {npc.id ? `${t("common.editing")} · ${npc.name}` : t("npcEdit.new")}
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
          <button className="btn btn-primary" onClick={handleSave}>
            {t("common.save")}
          </button>
        </div>
      </div>

      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">{t("common.name")}</span>
              <input
                className="npc-edit__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <span className="label">{t("common.status")}</span>
              <select
                className="npc-edit__select npc-edit__select--native"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusKind)}
                style={{ color: statusColor[status] }}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[lang][s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">{t("npcEdit.detailLevel")}</span>
              <select
                className="npc-edit__select npc-edit__select--native"
                value={detailLevel}
                onChange={(e) =>
                  setDetailLevel(e.target.value as "full" | "minor")
                }
              >
                <option value="full">{t("npcEdit.detailFull")}</option>
                <option value="minor">{t("npcEdit.detailMinor")}</option>
              </select>
            </div>
          </div>

          <div>
            <span className="label">{t("common.type")}</span>
            <div
              className="npc-edit__type-row"
              style={{ flexWrap: "wrap", alignItems: "center" }}
            >
              {npcTypesApi.types.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`npc-edit__type-chip${crystal === opt.key ? " npc-edit__type-chip--active" : ""}`}
                  style={{ "--c": opt.color } as CSSProperties}
                  onClick={() => setCrystal(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
              <NpcTypesButton api={npcTypesApi} />
            </div>
          </div>

          <div className="npc-edit__grid-2">
            {crystal === "spren" ? (
              <div>
                <span className="label">{t("npcEdit.sprenType")}</span>
                <input
                  className="npc-edit__input"
                  value={tipoSpren}
                  onChange={(e) => setTipoSpren(e.target.value)}
                  placeholder={t("npcEdit.sprenPlaceholder")}
                />
              </div>
            ) : (
              <div>
                <span className="label">{t("npcEdit.ethnicity")}</span>
                <input
                  className="npc-edit__input"
                  value={etnia}
                  onChange={(e) => setEtnia(e.target.value)}
                  placeholder={t("npcEdit.ethnicityPlaceholder")}
                />
              </div>
            )}
          </div>

          <div>
            <span className="label">
              {t("common.description")} {t("common.supportsMarkdown")}
            </span>
            <textarea
              className="npc-edit__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <span className="label">{t("npcEdit.linkWithNpc")}</span>
            <div className="npc-edit__grid-2">
              <input
                className="npc-edit__select npc-edit__select--native"
                placeholder={t("npcEdit.linkRolePlaceholder")}
                value={linkRole}
                onChange={(e) => setLinkRole(e.target.value)}
              />
              <select
                className="npc-edit__select npc-edit__select--native"
                value={linkNpcId}
                onChange={(e) => setLinkNpcId(e.target.value)}
                style={
                  linkTarget
                    ? {
                        borderBottom: `2px solid ${crystalColorFor(linkTarget.crystal)}`,
                      }
                    : undefined
                }
              >
                <option value="">{t("npcEdit.noLink")}</option>
                {npcs
                  .filter((n) => n.id !== npc.id)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <SkillsEditor
            label={t("characterSheet.attributes")}
            value={attributes}
            onChange={setAttributes}
          />
          <SkillsEditor
            label={t("characterSheet.skills")}
            value={skills}
            onChange={setSkills}
          />
        </div>

        <div className="npc-edit__col">
          {npc.id && onUploadImage && onRemoveImage && (
            <ImageUploadField
              label={t("npcEdit.portrait")}
              imageUrl={entityImageUrl(
                "npc",
                npc.id,
                npc.hasImage,
                imageVersion,
              )}
              onUpload={onUploadImage}
              onRemove={onRemoveImage}
            />
          )}
          <div>
            <span className="label">{t("npcList.colLocation")}</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              style={{ borderBottom: "2px solid var(--crystal-location)" }}
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
            <span className="label">{t("entityDetail.obsidianNote")}</span>
            <div
              className="npc-edit__select"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}
            >
              {npc.obsidianPath}
            </div>
          </div>
          {(status === "dead" || missingOrigin) && (
            <div className="callout callout-warning">
              <p className="callout-title">
                {status === "dead"
                  ? t("npcEdit.markedDead")
                  : t("npcEdit.missingOrigin")}
              </p>
              <p>{t("npcEdit.warningBody")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
