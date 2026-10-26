import { useState } from "react";
import {
  WEB_CLIENTS,
  WEB_CLIENT_CONFIG,
  webSnippet,
  type WebClientId,
} from "../lib/agents";
import { useT } from "../lib/i18n";
import "./AgentsWebHelp.css";

/** Copy-paste config to connect a client on this computer to this campaign. */
export function AgentsWebHelp({ campaignId }: { campaignId: string | number }) {
  const t = useT();
  const [client, setClient] = useState<WebClientId>("claude-code");
  const [copied, setCopied] = useState(false);
  const text = webSnippet(client, window.location.origin, campaignId);
  const file = WEB_CLIENT_CONFIG[client];

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // The snippet stays selectable, so copying by hand still works.
    }
  }

  return (
    <details className="agents-web">
      <summary className="label">{t("agentsWeb.title")}</summary>
      <p className="npc-edit__hint">{t("agentsWeb.hint")}</p>
      <select
        className="npc-edit__input"
        value={client}
        onChange={(e) => setClient(e.target.value as WebClientId)}
        aria-label={t("agentsWeb.client")}
      >
        {WEB_CLIENTS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <pre className="agents-web__code">
        <code>{text}</code>
      </pre>
      <div className="npc-edit__hint">
        {file
          ? t("agentsWeb.mergeInto").replace("{file}", file)
          : t("agentsWeb.runInTerminal")}
      </div>
      <button className="btn btn-secondary" type="button" onClick={copy}>
        {copied ? t("agentsWeb.copied") : t("agentsWeb.copy")}
      </button>
    </details>
  );
}
