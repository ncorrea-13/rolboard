import { useEffect, useEffectEvent, useState } from "react";
import { Cross } from "lucide-react";
import "../styles/list.css";
import "./NpcDetail.css";
import "./NpcEdit.css";
import { MarkdownText } from "../components/MarkdownText";
import { apiFetch } from "../lib/api";
import { useT } from "../lib/i18n";

// Keep in sync with maxWardailsLen in the server's handlers/campaigns.go.
const MAX_LENGTH = 20000;

interface WardailsProps {
  campaignId: string;
  notify: (message: string, type?: "success" | "error") => void;
}

export function Wardails({ campaignId, notify }: WardailsProps) {
  const t = useT();
  const [saved, setSaved] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFailed = useEffectEvent((err: unknown) => {
    console.error("Error cargando wardails:", err);
    notify(t("toast.errorLoading"), "error");
  });

  useEffect(() => {
    apiFetch<{ wardails: string }>(`/campaigns/${campaignId}`)
      .then((c) => setSaved(c.wardails ?? ""))
      .catch(loadFailed);
  }, [campaignId]);

  function startEditing() {
    setDraft(saved);
    setEditing(true);
  }

  function save() {
    setSaving(true);
    apiFetch(`/campaigns/${campaignId}/wardails`, {
      method: "PUT",
      body: JSON.stringify({ wardails: draft }),
    })
      .then(() => {
        setSaved(draft);
        setEditing(false);
        notify(t("wardails.saved"));
      })
      .catch((err) => {
        console.error("Error guardando wardails:", err);
        notify(t("wardails.errorSaving"), "error");
      })
      .finally(() => setSaving(false));
  }

  return (
    <div className="card list-page">
      <div className="list-page__header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Cross size={22} strokeWidth={1.75} style={{ color: "var(--accent-wardail)" }} />
          <div>
            <div className="display" style={{ fontSize: 21 }}>
              {t("wardails.title")}
            </div>
            <span className="list-page__count">{t("wardails.subtitle")}</span>
          </div>
        </div>
        {editing ? (
          <div className="list-page__header-actions">
            <button className="btn btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {t("common.save")}
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={startEditing}>
            {t("common.edit")}
          </button>
        )}
      </div>

      <div className="list-page__rows">
      {editing ? (
        <>
          <span className="label">
            {t("wardails.title")} {t("common.supportsMarkdown")}
          </span>
          <textarea
            className="npc-edit__textarea"
            style={{ minHeight: 260 }}
            maxLength={MAX_LENGTH}
            placeholder={t("wardails.placeholder")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </>
      ) : saved.trim() ? (
        <MarkdownText className="npc-detail__desc" text={saved} />
      ) : (
        <span style={{ color: "var(--text-secondary)" }}>{t("wardails.empty")}</span>
      )}
      </div>
    </div>
  );
}
