import { useEffect, useState } from "react";
import type { Campaign, CampaignStatus } from "../data/domain";
import { apiFetch } from "../lib/api";
import { useT } from "../lib/i18n";

interface CampaignSettingsFormProps {
  campaign: Campaign;
  onSave: (patch: {
    name: string;
    system: string;
    status: CampaignStatus;
    vaultPath: string;
  }) => Promise<void>;
  onSetAccessCode: (code: string) => Promise<void>;
  onCancel: () => void;
}

export function CampaignSettingsForm({
  campaign,
  onSave,
  onSetAccessCode,
  onCancel,
}: CampaignSettingsFormProps) {
  const t = useT();
  const [name, setName] = useState(campaign.name);
  const [system, setSystem] = useState(campaign.system);
  const [status, setStatus] = useState<CampaignStatus>(campaign.status);
  const [vaultPath, setVaultPath] = useState(campaign.vaultPath);
  const [vaultDirs, setVaultDirs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [accessCode, setAccessCode] = useState("");
  const [codeSaving, setCodeSaving] = useState(false);
  const [codeSaved, setCodeSaved] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<string[]>(`/admin/vault-dirs?campaignId=${campaign.id}`)
      .then(setVaultDirs)
      .catch((err) => console.error("Error listando directorios del vault:", err));
  }, [campaign.id]);

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), system: system.trim(), status, vaultPath });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCode() {
    if (!accessCode.trim() || codeSaving) return;
    setCodeSaving(true);
    setCodeError(null);
    setCodeSaved(false);
    try {
      await onSetAccessCode(accessCode.trim());
      setAccessCode("");
      setCodeSaved(true);
    } catch {
      setCodeError(t("adminSecret.error"));
    } finally {
      setCodeSaving(false);
    }
  }

  return (
    <>
      <div>
        <span className="label">{t("newCampaignForm.name")}</span>
        <input
          className="npc-edit__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <span className="label">{t("newCampaignForm.system")}</span>
        <input
          className="npc-edit__input"
          value={system}
          onChange={(e) => setSystem(e.target.value)}
        />
      </div>
      <div>
        <span className="label">{t("campaignSettings.status")}</span>
        <select
          className="npc-edit__input"
          value={status}
          onChange={(e) => setStatus(e.target.value as CampaignStatus)}
        >
          <option value="active">{t("campaignSettings.statusActive")}</option>
          <option value="paused">{t("campaignSettings.statusPaused")}</option>
          <option value="finished">{t("campaignSettings.statusFinished")}</option>
        </select>
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
          onClick={handleSave}
          disabled={!name.trim() || saving}
        >
          {t("campaignSettings.save")}
        </button>
      </div>

      <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid var(--border-subtle)" }} />

      <div>
        <span className="label">{t("campaignSettings.accessCodeTitle")}</span>
        <input
          className="npc-edit__input"
          type="password"
          placeholder={t("campaignSettings.accessCodePlaceholder")}
          value={accessCode}
          onChange={(e) => {
            setAccessCode(e.target.value);
            setCodeSaved(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSaveCode()}
        />
        {codeError && (
          <div style={{ color: "var(--status-dead)", marginTop: 4 }}>{codeError}</div>
        )}
        {codeSaved && (
          <div style={{ color: "var(--status-alive)", marginTop: 4 }}>
            {t("campaignSettings.accessCodeSaved")}
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <button
          className="btn btn-primary"
          onClick={handleSaveCode}
          disabled={!accessCode.trim() || codeSaving}
        >
          {t("campaignSettings.accessCodeSave")}
        </button>
      </div>
    </>
  );
}
