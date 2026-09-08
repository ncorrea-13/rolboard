import { useState } from "react";
import type { SessionEntry } from "../data/mock";

interface NewSessionFormProps {
  nextNumber: number;
  onConfirm: (session: SessionEntry) => void;
  onCancel: () => void;
}

export function NewSessionForm({ nextNumber, onConfirm, onCancel }: NewSessionFormProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [text, setText] = useState("");

  function handleConfirm() {
    onConfirm({
      n: `S${String(nextNumber).padStart(2, "0")}`,
      date,
      text: text.trim() || "Sesión sin resumen todavía.",
      tags: "",
    });
  }

  return (
    <>
      <div>
        <span className="label">Sesión</span>
        <div className="npc-edit__input" style={{ marginTop: 6 }}>{`S${String(nextNumber).padStart(2, "0")}`}</div>
      </div>
      <div>
        <span className="label">Fecha</span>
        <input type="date" className="npc-edit__input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <span className="label">Resumen (opcional, se completa después de jugar)</span>
        <textarea
          className="npc-edit__textarea"
          placeholder="Qué pasó en la sesión…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleConfirm}>Iniciar sesión</button>
      </div>
    </>
  );
}
