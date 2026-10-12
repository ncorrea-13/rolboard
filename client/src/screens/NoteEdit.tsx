import { useState } from "react";
import "./NpcEdit.css";
import type { LooseNote } from "../data/domain";
import { useT } from "../lib/i18n";
import { MarkdownField } from "../components/MarkdownField";

interface NoteEditProps {
  note: LooseNote;
  onSave: (values: Pick<LooseNote, "title" | "body" | "pending">) => void;
  onDiscard: () => void;
}

export function NoteEdit({ note, onSave, onDiscard }: NoteEditProps) {
  const t = useT();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [pending, setPending] = useState(note.pending);

  const dirty =
    title !== note.title || body !== note.body || pending !== note.pending;

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
            {note.id
              ? `${t("common.editing")} · ${note.title}`
              : t("noteEdit.new")}
          </span>
          {dirty && (
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {t("common.unsavedChanges")}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onDiscard}>
            {t("common.discard")}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({ title, body, pending })}
          >
            {t("common.save")}
          </button>
        </div>
      </div>
      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div>
            <span className="label">{t("noteEdit.title")}</span>
            <input
              className="npc-edit__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <MarkdownField
            label={`${t("noteEdit.body")} ${t("common.supportsMarkdown")}`}
            minHeight={320}
            value={body}
            onChange={setBody}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13.5,
            }}
          >
            <input
              type="checkbox"
              checked={pending}
              onChange={(e) => setPending(e.target.checked)}
            />
            {t("noteEdit.pending")}
          </label>
        </div>
      </div>
    </div>
  );
}
