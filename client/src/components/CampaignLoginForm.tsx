import { useState } from "react";
import { useT } from "../lib/i18n";

interface CampaignLoginFormProps {
  onSubmit: (code: string) => Promise<void>;
  onCancel: () => void;
}

export function CampaignLoginForm({
  onSubmit,
  onCancel,
}: CampaignLoginFormProps) {
  const t = useT();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(code.trim());
    } catch {
      setError(t("login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div>
        <span className="label">{t("login.label")}</span>
        <input
          className="npc-edit__input"
          type="password"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
        />
        {error && (
          <div style={{ color: "var(--status-dead)", marginTop: 4 }}>
            {error}
          </div>
        )}
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
          {t("login.cancel")}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={!code.trim() || submitting}
        >
          {t("login.confirm")}
        </button>
      </div>
    </>
  );
}
