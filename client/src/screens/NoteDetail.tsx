import "./NpcEdit.css";
import "./NpcDetail.css";
import type { LooseNote } from "../data/domain";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";

interface NoteDetailProps {
  note: LooseNote;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePending: () => void;
}

export function NoteDetail({
  note,
  onBack,
  onEdit,
  onDelete,
  onTogglePending,
}: NoteDetailProps) {
  const t = useT();
  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar">
        <div className="npc-edit__bar-left">
          <span className="status-dot" />
          <span
            style={{
              fontWeight: 500,
              fontSize: 13.5,
              color: "var(--text-primary)",
            }}
          >
            {note.title}
          </span>
          {note.pending && (
            <span className="npc-detail__appearance-chip">
              {t("notesList.pendingChip")}
            </span>
          )}
        </div>
        <div className="npc-edit__bar-actions">
          <button className="btn btn-danger-outline" onClick={onDelete}>
            {t("entityDetail.deactivate")}
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            {t("common.back")}
          </button>
          <button className="btn btn-secondary" onClick={onTogglePending}>
            {t(
              note.pending ? "noteDetail.markFiled" : "noteDetail.markPending",
            )}
          </button>
          <button className="btn btn-primary" onClick={onEdit}>
            {t("common.edit")}
          </button>
        </div>
      </div>
      <div className="npc-edit__body">
        <div className="npc-edit__col">
          {note.body ? (
            <MarkdownText className="npc-detail__desc" text={note.body} />
          ) : (
            <span style={{ color: "var(--text-secondary)" }}>
              {t("noteDetail.empty")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
