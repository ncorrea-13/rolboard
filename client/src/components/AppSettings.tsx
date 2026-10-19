import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { FolderField } from "./FolderField";
import { useT } from "../lib/i18n";
import { getAura, setAura } from "../lib/appearance";
import { reportError } from "../lib/notify";
import {
  loadSettings,
  pickFolder,
  type FolderKind,
  type LocalSettings,
} from "../lib/localSettings";

export function AppSettings({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [settings, setSettings] = useState<LocalSettings>({
    vaultsRoot: "",
    syncDir: "",
  });
  const [busy, setBusy] = useState(false);
  const [aura, setAuraState] = useState(getAura);

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch((err) => reportError("toast.errorLoading", err));
  }, []);

  async function pick(kind: FolderKind) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await pickFolder(kind);
      if (result.kind === "permission") {
        reportError("toast.vaultsRootPermission");
      } else if (result.kind === "picked") {
        setSettings(result.settings);
        if (kind === "sync-dir") window.location.reload();
      }
    } catch (err) {
      reportError(
        kind === "sync-dir" ? "toast.errorSyncDir" : "toast.errorVaultsRoot",
        err,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={t("appSettings.title")} onClose={onClose}>
      <div style={{ display: "grid", gap: 18, paddingTop: 16 }}>
        <FolderField
          label={t("vaultsRoot.label")}
          hint={t("vaultsRoot.hint")}
          value={settings.vaultsRoot}
          busy={busy}
          onPick={() => pick("vaults-root")}
        />
        <FolderField
          label={t("syncDir.label")}
          hint={t("syncDir.hint")}
          value={settings.syncDir}
          busy={busy}
          onPick={() => pick("sync-dir")}
        />
        <div style={{ minWidth: 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={aura}
              onChange={(e) => {
                setAuraState(e.target.checked);
                setAura(e.target.checked);
              }}
            />
            {t("appSettings.aura")}
          </label>
          <div className="npc-edit__hint">{t("appSettings.auraHint")}</div>
        </div>
      </div>
    </Modal>
  );
}
