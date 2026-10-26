import { useState } from "react";
import {
  WEB_CLIENTS,
  WEB_CLIENT_FILES,
  webLoginCommand,
  webSnippet,
  type WebClientId,
} from "../lib/agents";
import { useT } from "../lib/i18n";
import "./AgentsWebHelp.css";

export function AgentsWebHelp({ campaignId }: { campaignId: string | number }) {
  const t = useT();
  const [client, setClient] = useState<WebClientId>("claude-code");
  const [copied, setCopied] = useState(false);
  const text = webSnippet(client, window.location.origin, campaignId);
  const files = WEB_CLIENT_FILES[client];

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <details className="agents-web">
      <summary className="label">{t("agentsWeb.title")}</summary>
      <p className="npc-edit__hint">{t("agentsWeb.hint")}</p>
      <div className="npc-edit__hint">{t("agentsWeb.step1")}</div>
      <pre className="agents-web__code">
        <code>{webLoginCommand(window.location.origin, campaignId)}</code>
      </pre>
      <div className="npc-edit__hint">{t("agentsWeb.step2")}</div>
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
        {files.length === 0 ? (
          t("agentsWeb.runInTerminal")
        ) : (
          <>
            {t("agentsWeb.mergeInto")}
            {files.map((f) => (
              <code className="agents-web__file" key={f}>
                {f}
              </code>
            ))}
          </>
        )}
      </div>
      <button className="btn btn-secondary" type="button" onClick={copy}>
        {copied ? t("agentsWeb.copied") : t("agentsWeb.copy")}
      </button>
    </details>
  );
}
