import { useState } from "react";

interface AdminSecretFormProps {
  onSubmit: (secret: string) => Promise<void>;
  onCancel: () => void;
}

export function AdminSecretForm({ onSubmit, onCancel }: AdminSecretFormProps) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!secret.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(secret.trim());
    } catch {
      setError("Clave incorrecta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div>
        <span className="label">Clave</span>
        <input
          className="npc-edit__input"
          type="password"
          autoFocus
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
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
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={!secret.trim() || submitting}
        >
          Confirmar
        </button>
      </div>
    </>
  );
}
