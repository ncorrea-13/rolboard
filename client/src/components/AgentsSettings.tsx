import { useEffect, useState } from "react";
import "./AgentsSettings.css";
import { useT } from "../lib/i18n";
import { askConfirm } from "../lib/confirm";
import { reportError } from "../lib/notify";
import {
  connectMcpClient,
  loadMcpClients,
  setMcpEnabled,
  type McpClient,
} from "../lib/agents";
import type { LocalSettings } from "../lib/localSettings";

/** Desktop only: lets AI apps on this computer reach the campaign. */
export function AgentsSettings({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (settings: LocalSettings) => void;
}) {
  const t = useT();
  const [clients, setClients] = useState<McpClient[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    loadMcpClients()
      .then(setClients)
      .catch((err) => reportError("toast.errorAgents", err));
  }, [enabled]);

  async function toggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      onChange(await setMcpEnabled(next));
    } catch (err) {
      reportError("toast.errorAgents", err);
    } finally {
      setBusy(false);
    }
  }

  async function connect(client: McpClient) {
    if (busy) return;
    const ok = await askConfirm(
      t("agents.confirm").replace("{client}", client.label),
    );
    if (!ok) return;
    setBusy(true);
    try {
      setClients(await connectMcpClient(client.id));
    } catch (err) {
      reportError("toast.errorConnectClient", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div style={{ minWidth: 0 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy}
            onChange={(e) => void toggle(e.target.checked)}
          />
          {t("agents.enable")}
        </label>
        <div className="npc-edit__hint">{t("agents.enableHint")}</div>
      </div>
      {enabled && (
        <div className="agents-list">
          {clients.map((c) => (
            <div className="agents-list__row" key={c.id}>
              <span className="agents-list__name">{c.label}</span>
              <span
                className={`agents-list__status${c.connected ? " agents-list__status--connected" : ""}`}
              >
                {!c.installed
                  ? t("agents.notInstalled")
                  : c.connected
                    ? t("agents.connected")
                    : ""}
              </span>
              <button
                className="btn btn-secondary agents-list__btn"
                type="button"
                disabled={busy || !c.installed}
                onClick={() => void connect(c)}
              >
                {c.connected ? t("agents.reconnect") : t("agents.connect")}
              </button>
            </div>
          ))}
          <div className="npc-edit__hint">{t("agents.restartHint")}</div>
        </div>
      )}
    </>
  );
}
