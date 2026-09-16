import { useState } from "react";
import "./NpcEdit.css";
import { type Group, type Npc } from "../data/domain";
import { ImageUploadField } from "../components/ImageUploadField";
import { entityImageUrl } from "../lib/images";
import { useT } from "../lib/i18n";

interface FactionEditProps {
  group: Group;
  npcs: Npc[];
  onSave: (patch: Partial<Group>) => void;
  onDiscard: () => void;
  imageVersion?: number;
  onUploadImage?: (file: File) => Promise<void>;
  onRemoveImage?: () => Promise<void>;
}

export function FactionEdit({
  group,
  npcs,
  onSave,
  onDiscard,
  imageVersion = 0,
  onUploadImage,
  onRemoveImage,
}: FactionEditProps) {
  const t = useT();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [alineacion, setAlineacion] = useState(group.alineacion);
  const [liderNpcId, setLiderNpcId] = useState(group.liderNpcId ?? "");

  const dirty =
    name !== group.name ||
    description !== group.description ||
    alineacion !== group.alineacion ||
    liderNpcId !== (group.liderNpcId ?? "");

  function handleSave() {
    onSave({ name, description, alineacion, liderNpcId: liderNpcId || undefined });
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--crystal-faction-quest)" }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: "var(--crystal-faction-quest)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            {group.id ? `${t("common.editing")} · ${group.name}` : t("factionEdit.new")}
          </span>
          {dirty && (
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{t("common.unsavedChanges")}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onDiscard}>{t("common.discard")}</button>
          <button className="btn btn-primary" onClick={handleSave}>{t("common.save")}</button>
        </div>
      </div>

      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div>
            <span className="label">{t("common.name")}</span>
            <input
              className="npc-edit__input npc-edit__input--focus"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <span className="label">{t("common.description")}</span>
            <textarea
              className="npc-edit__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="npc-edit__col">
          {group.id && onUploadImage && onRemoveImage && (
            <ImageUploadField
              label={t("factionEdit.image")}
              imageUrl={entityImageUrl("group", group.id, group.hasImage, imageVersion)}
              onUpload={onUploadImage}
              onRemove={onRemoveImage}
            />
          )}
          <div>
            <span className="label">{t("factionDetail.alignment")}</span>
            <input
              className="npc-edit__input"
              value={alineacion}
              onChange={(e) => setAlineacion(e.target.value)}
            />
          </div>
          <div>
            <span className="label">{t("factionDetail.leader")}</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              value={liderNpcId}
              onChange={(e) => setLiderNpcId(e.target.value)}
            >
              <option value="">{t("factionEdit.noLeader")}</option>
              {npcs.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
