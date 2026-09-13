import { useState } from "react";
import { useT } from "../lib/i18n";

interface NewSessionFormProps {
  nextNumber: number;
  onConfirm: (values: { date: string; summary: string }) => void;
  onCancel: () => void;
}

export function NewSessionForm({
  nextNumber,
  onConfirm,
  onCancel,
}: NewSessionFormProps) {
  const t = useT();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [text, setText] = useState("");

  function handleConfirm() {
    onConfirm({
      date,
      summary: text.trim() || t("newSessionForm.defaultSummary"),
    });
  }

  return (
    <>
      <div>
        <span className="label">{t("newSessionForm.session")}</span>
        <div
          className="npc-edit__input"
          style={{ marginTop: 6 }}
        >{`S${String(nextNumber).padStart(2, "0")}`}</div>
      </div>
      <div>
        <span className="label">{t("newSessionForm.date")}</span>
        <input
          type="date"
          className="npc-edit__input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div>
        <span className="label">{t("newSessionForm.summaryLabel")}</span>
        <textarea
          className="npc-edit__textarea"
          placeholder={t("newSessionForm.summaryPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
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
        <button className="btn btn-primary" onClick={handleConfirm}>
          {t("newSessionForm.confirm")}
        </button>
      </div>
    </>
  );
}
