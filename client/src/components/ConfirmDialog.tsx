import { Modal } from "./Modal";
import { useT } from "../lib/i18n";

export function ConfirmDialog({
  message,
  onAnswer,
}: {
  message: string;
  onAnswer: (accepted: boolean) => void;
}) {
  const t = useT();
  return (
    <Modal title={t("confirm.title")} onClose={() => onAnswer(false)}>
      <p style={{ whiteSpace: "pre-line", margin: "0 0 18px" }}>{message}</p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => onAnswer(false)}>
          {t("common.cancel")}
        </button>
        <button className="btn btn-danger" onClick={() => onAnswer(true)}>
          {t("confirm.accept")}
        </button>
      </div>
    </Modal>
  );
}
