import { useState } from "react";
import "./NpcEdit.css";
import { type Quest, type QuestStatus } from "../data/domain";

const statusOptions: { value: QuestStatus; label: string }[] = [
  { value: "active", label: "Activa" },
  { value: "on_hold", label: "En pausa" },
  { value: "completed", label: "Completada" },
  { value: "failed", label: "Fallida" },
];

const priorityOptions: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: "Alta" },
  { value: 2, label: "Media" },
  { value: 3, label: "Baja" },
];

interface QuestEditProps {
  quest: Quest;
  onSave: (patch: Partial<Quest>) => void;
  onDiscard: () => void;
}

export function QuestEdit({ quest, onSave, onDiscard }: QuestEditProps) {
  const [name, setName] = useState(quest.name);
  const [hook, setHook] = useState(quest.hook);
  const [status, setStatus] = useState<QuestStatus>(quest.status);
  const [priority, setPriority] = useState<1 | 2 | 3>(quest.priority);
  const [notes, setNotes] = useState(quest.notes);

  const dirty =
    name !== quest.name ||
    hook !== quest.hook ||
    status !== quest.status ||
    priority !== quest.priority ||
    notes !== quest.notes;

  function handleSave() {
    onSave({ name, hook, status, priority, notes });
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--crystal-faction-quest)" }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: "var(--crystal-faction-quest)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            {quest.id ? `Editando · ${quest.name}` : "Nueva quest"}
          </span>
          {dirty && (
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>cambios sin guardar</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onDiscard}>Descartar</button>
          <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
        </div>
      </div>

      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div>
            <span className="label">Título</span>
            <input
              className="npc-edit__input npc-edit__input--focus"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <span className="label">Gancho narrativo (admite Markdown)</span>
            <textarea
              className="npc-edit__textarea"
              style={{ minHeight: 140 }}
              value={hook}
              onChange={(e) => setHook(e.target.value)}
            />
          </div>

          <div>
            <span className="label">Notas del DM (privadas, admite Markdown)</span>
            <textarea
              className="npc-edit__textarea"
              style={{ minHeight: 160 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="npc-edit__col">
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">Estado</span>
              <select
                className="npc-edit__select npc-edit__select--native"
                value={status}
                onChange={(e) => setStatus(e.target.value as QuestStatus)}
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">Prioridad</span>
              <select
                className="npc-edit__select npc-edit__select--native"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)}
              >
                {priorityOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
