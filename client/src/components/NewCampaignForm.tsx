import { useEffect, useState } from "react";
import type { Campaign } from "../data/domain";
import { apiFetch } from "../lib/api";
import { useT } from "../lib/i18n";

interface NewCampaignFormProps {
  onConfirm: (campaign: Omit<Campaign, "id">, vaultPath: string) => void;
  onCancel: () => void;
}

export function NewCampaignForm({ onConfirm, onCancel }: NewCampaignFormProps) {
  const t = useT();
  const [name, setName] = useState("");
  const [system, setSystem] = useState("");
  const [vaultPath, setVaultPath] = useState("");
  const [vaultDirs, setVaultDirs] = useState<string[]>([]);

  useEffect(() => {
    apiFetch<string[]>("/admin/vault-dirs")
      .then(setVaultDirs)
      .catch((err) => console.error("Error listando directorios del vault:", err));
  }, []);

  function handleConfirm() {
    if (!name.trim()) return;
    onConfirm(
      {
        name: name.trim(),
        system: system.trim() || "Sin sistema definido",
        status: "active",
        vaultPath,
        meta: "Sin arcos todavía",
        last: "recién creada",
      },
      vaultPath,
    );
  }

  return (
    <>
      <div>
        <span className="label">{t("newCampaignForm.name")}</span>
        <input
          className="npc-edit__input"
          placeholder={t("newCampaignForm.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <span className="label">{t("newCampaignForm.system")}</span>
        <input
          className="npc-edit__input"
          placeholder={t("newCampaignForm.systemPlaceholder")}
          value={system}
          onChange={(e) => setSystem(e.target.value)}
        />
      </div>
      <div>
        <span className="label">{t("newCampaignForm.vaultDir")}</span>
        <select
          className="npc-edit__input"
          value={vaultPath}
          onChange={(e) => setVaultPath(e.target.value)}
        >
          <option value="">{t("newCampaignForm.noVault")}</option>
          {vaultDirs.map((dir) => (
            <option key={dir} value={dir}>
              {dir}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 4,
        }}
      >
        <button className="btn btn-secondary" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={!name.trim()}
        >
          {t("newCampaignForm.confirm")}
        </button>
      </div>
    </>
  );
}
