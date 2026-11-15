import { Modal } from "./Modal";
import { useT } from "../lib/i18n";
import type { ConfirmOptions } from "../lib/confirm";

export function ConfirmDialog({
  message,
  options,
  onAnswer,
}: {
  message: string;
  options?: ConfirmOptions;
  onAnswer: (accepted: boolean) => void;
}) {
  const t = useT();
  return (
    <Modal
      title={options?.title ?? t("confirm.title")}
      onClose={() => onAnswer(false)}
    >
      <p style={{ whiteSpace: "pre-line", margin: "0 0 18px" }}>{message}</p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn-secondary" onClick={() => onAnswer(false)}>
          {options?.cancel ?? t("common.cancel")}
        </button>
        <button className="btn btn-danger" onClick={() => onAnswer(true)}>
          {options?.accept ?? t("confirm.accept")}
        </button>
      </div>
    </Modal>
  );
}
