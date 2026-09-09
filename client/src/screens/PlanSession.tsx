import { useState } from "react";
import "./NpcEdit.css";
import type { Arc, Npc, Quest, SessionEntry } from "../data/mock";

interface PlanSessionProps {
  nextNumber: number;
  currentArc?: Arc;
  npcs: Npc[];
  quests: Quest[];
  onConfirm: (session: SessionEntry) => void;
  onCancel: () => void;
}

export function PlanSession({ nextNumber, currentArc, npcs, quests, onConfirm, onCancel }: PlanSessionProps) {
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [expectedNpcIds, setExpectedNpcIds] = useState<Set<string>>(new Set());
  const [expectedQuestIds, setExpectedQuestIds] = useState<Set<string>>(new Set());

  const sessionCode = `S${String(nextNumber).padStart(2, "0")}`;

  function toggleNpc(id: string) {
    setExpectedNpcIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleQuest(id: string) {
    setExpectedQuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm({
      n: sessionCode,
      date,
      text: text.trim() || "Sin notas de preparación todavía.",
      tags,
      played: false,
      expectedNpcIds: [...expectedNpcIds],
      expectedQuestIds: [...expectedQuestIds],
    });
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--accent-sky)" }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: "var(--accent-sky)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            Planificando · {sessionCode}{currentArc ? ` · ${currentArc.label}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleConfirm}>Planificar sesión</button>
        </div>
      </div>

      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">Sesión</span>
              <div className="npc-edit__input">{sessionCode}</div>
            </div>
            <div>
              <span className="label">Fecha tentativa (opcional)</span>
              <input type="date" className="npc-edit__input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <span className="label">Notas de preparación (admite Markdown)</span>
            <textarea
              className="npc-edit__textarea"
              style={{ minHeight: 160 }}
              placeholder="Qué querés que pase, ganchos preparados, escenas planeadas…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div>
            <span className="label">Tags</span>
            <input className="npc-edit__input" placeholder="#ej #tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>

        <div className="npc-edit__col">
          <div>
            <span className="label">NPCs esperados</span>
            {npcs.length > 0 ? (
              <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                {npcs.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`npc-edit__type-chip${expectedNpcIds.has(n.id) ? " npc-edit__type-chip--active" : ""}`}
                    onClick={() => toggleNpc(n.id)}
                  >
                    {n.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="npc-edit__hint">Sin NPCs cargados todavía en esta campaña.</div>
            )}
          </div>

          <div>
            <span className="label">Quests esperadas</span>
            {quests.length > 0 ? (
              <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                {quests.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className={`npc-edit__type-chip${expectedQuestIds.has(q.id) ? " npc-edit__type-chip--active" : ""}`}
                    onClick={() => toggleQuest(q.id)}
                  >
                    {q.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="npc-edit__hint">Sin quests cargadas todavía en esta campaña.</div>
            )}
          </div>

          <div className="npc-edit__note">
            La sesión queda marcada como "planificada" hasta que la abras y la confirmes como jugada, con fecha real
            y resumen.
          </div>
        </div>
      </div>
    </div>
  );
}
