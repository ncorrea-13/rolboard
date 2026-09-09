import { useState } from "react";
import "./NpcEdit.css";
import type { Arc, Npc, Quest, SessionEntry } from "../data/mock";
import { MarkdownText } from "../components/MarkdownText";

interface SessionEditProps {
  arc: Arc;
  session: SessionEntry;
  npcs: Npc[];
  quests: Quest[];
  onSave: (patch: Omit<SessionEntry, "n">) => void;
  onBack: () => void;
  autoConfirm?: boolean;
}

export function SessionEdit({ arc, session, npcs, quests, onSave, onBack, autoConfirm }: SessionEditProps) {
  const [date, setDate] = useState(session.date);
  const [text, setText] = useState(session.text);
  const [tags, setTags] = useState(session.tags);
  const [confirmingPlay, setConfirmingPlay] = useState(!session.played && Boolean(autoConfirm));
  const [playDate, setPlayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recap, setRecap] = useState("");
  const [playTags, setPlayTags] = useState(session.tags);

  const expectedNpcs = npcs.filter((n) => (session.expectedNpcIds ?? []).includes(n.id));
  const expectedQuests = quests.filter((q) => (session.expectedQuestIds ?? []).includes(q.id));

  function handleSave() {
    onSave({ date, text, tags, played: session.played, prepNotes: session.prepNotes, expectedNpcIds: session.expectedNpcIds, expectedQuestIds: session.expectedQuestIds });
  }

  function handleConfirmPlayed() {
    onSave({
      date: playDate,
      text: recap.trim() || "Sesión sin resumen todavía.",
      tags: playTags,
      played: true,
      prepNotes: session.prepNotes ?? text,
      expectedNpcIds: session.expectedNpcIds,
      expectedQuestIds: session.expectedQuestIds,
    });
  }

  if (confirmingPlay) {
    return (
      <div className="card npc-edit">
        <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--status-alive)" }}>
          <div className="npc-edit__bar-left">
            <span className="status-dot" style={{ background: "var(--status-alive)" }} />
            <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
              Confirmando como jugada · Sesión {session.n} · {arc.label}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => (autoConfirm ? onBack() : setConfirmingPlay(false))}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleConfirmPlayed}>Confirmar como jugada</button>
          </div>
        </div>

        <div className="npc-edit__body" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="npc-edit__col">
            <span className="label">Planificado</span>
            <div className="npc-edit__grid-2" style={{ marginTop: 10 }}>
              <div>
                <span className="label">Sesión</span>
                <div className="npc-edit__input">{session.n}</div>
              </div>
              <div>
                <span className="label">Fecha tentativa</span>
                <div className="npc-edit__input">{session.date || "sin definir"}</div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <span className="label">Notas de preparación (admite Markdown)</span>
              <MarkdownText className="npc-detail__desc" text={session.text} />
            </div>

            {expectedNpcs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="label">NPCs esperados</span>
                <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                  {expectedNpcs.map((n) => (
                    <span key={n.id} className="npc-edit__type-chip">{n.name}</span>
                  ))}
                </div>
              </div>
            )}

            {expectedQuests.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="label">Quests esperadas</span>
                <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                  {expectedQuests.map((q) => (
                    <span key={q.id} className="npc-edit__type-chip">{q.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="npc-edit__col">
            <span className="label">Lo que pasó</span>
            <div className="npc-edit__grid-2" style={{ marginTop: 10 }}>
              <div>
                <span className="label">Fecha real</span>
                <input type="date" className="npc-edit__input" value={playDate} onChange={(e) => setPlayDate(e.target.value)} />
              </div>
              <div>
                <span className="label">Tags</span>
                <input className="npc-edit__input" value={playTags} onChange={(e) => setPlayTags(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <span className="label">Resumen de lo jugado (admite Markdown)</span>
              <textarea
                className="npc-edit__textarea"
                style={{ minHeight: 220 }}
                placeholder="Qué pasó realmente…"
                value={recap}
                onChange={(e) => setRecap(e.target.value)}
              />
            </div>
            <div className="npc-edit__note">Las notas de preparación quedan guardadas aparte, no se pisan.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: `inset 4px 0 0 var(--${session.played ? "status-alive" : "accent-sky"})` }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: session.played ? "var(--status-alive)" : "var(--accent-sky)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            Sesión {session.n} · {arc.label} {session.played ? "· jugada" : "· planificada"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onBack}>Volver</button>
          <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
        </div>
      </div>

      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">Sesión</span>
              <div className="npc-edit__input">{session.n}</div>
            </div>
            <div>
              <span className="label">Fecha</span>
              <input className="npc-edit__input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <span className="label">{session.played ? "Resumen" : "Notas de preparación"} (admite Markdown)</span>
            <textarea className="npc-edit__textarea" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div>
            <span className="label">Tags</span>
            <input className="npc-edit__input" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>

          {session.played && session.prepNotes && (
            <div>
              <span className="label" style={{ marginTop: 21, display: "block" }}>Notas de preparación originales</span>
              <MarkdownText className="npc-detail__desc" text={session.prepNotes} />
            </div>
          )}
        </div>

        <div className="npc-edit__col">
          {expectedNpcs.length > 0 && (
            <div>
              <span className="label">NPCs esperados</span>
              <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                {expectedNpcs.map((n) => (
                  <span key={n.id} className="npc-edit__type-chip">{n.name}</span>
                ))}
              </div>
            </div>
          )}

          {expectedQuests.length > 0 && (
            <div>
              <span className="label">Quests esperadas</span>
              <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                {expectedQuests.map((q) => (
                  <span key={q.id} className="npc-edit__type-chip">{q.name}</span>
                ))}
              </div>
            </div>
          )}

          {!session.played && (
            <button className="btn btn-primary" onClick={() => setConfirmingPlay(true)}>Marcar como jugada</button>
          )}
        </div>
      </div>
    </div>
  );
}
