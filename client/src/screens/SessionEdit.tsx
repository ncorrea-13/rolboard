import { useEffect, useState } from "react";
import "./NpcEdit.css";
import { sessionCode, type Arc, type Session } from "../data/domain";
import { MarkdownText } from "../components/MarkdownText";
import { apiFetch } from "../lib/api";

interface SessionEditProps {
  arc?: Arc;
  session: Session;
  onSave: (patch: Partial<Session>) => void;
  onBack: () => void;
  autoConfirm?: boolean;
}

export function SessionEdit({ arc, session, onSave, onBack, autoConfirm }: SessionEditProps) {
  const played = session.sessionType !== "planning";
  const [date, setDate] = useState(session.date);
  const [text, setText] = useState(session.summary);
  const [confirmingPlay, setConfirmingPlay] = useState(!played && Boolean(autoConfirm));
  const [playDate, setPlayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recap, setRecap] = useState("");

  const [expectedNpcs, setExpectedNpcs] = useState<{ npc_id: number; name: string }[]>([]);
  const [expectedQuests, setExpectedQuests] = useState<{ quest_id: number; title: string }[]>([]);

  useEffect(() => {
    apiFetch<{ npc_id: number; name: string }[]>(`/sessions/${session.id}/npcs`)
      .then((data) => setExpectedNpcs(data ?? []))
      .catch((err) => console.error("Error cargando NPCs esperados:", err));
    apiFetch<{ quest_id: number; title: string }[]>(`/sessions/${session.id}/quests`)
      .then((data) => setExpectedQuests(data ?? []))
      .catch((err) => console.error("Error cargando quests esperadas:", err));
  }, [session.id]);

  function handleSave() {
    onSave({ date, summary: text });
  }

  function handleConfirmPlayed() {
    onSave({
      date: playDate,
      summary: recap.trim() || "Sesión sin resumen todavía.",
      prepNotes: session.prepNotes || session.summary,
      sessionType: "session",
    });
  }

  if (confirmingPlay) {
    return (
      <div className="card npc-edit">
        <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--status-alive)" }}>
          <div className="npc-edit__bar-left">
            <span className="status-dot" style={{ background: "var(--status-alive)" }} />
            <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
              Confirmando como jugada · Sesión {sessionCode(session)} {arc ? `· ${arc.label}` : ""}
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
                <div className="npc-edit__input">{sessionCode(session)}</div>
              </div>
              <div>
                <span className="label">Fecha tentativa</span>
                <div className="npc-edit__input">{session.date || "sin definir"}</div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <span className="label">Notas de preparación (admite Markdown)</span>
              <MarkdownText className="npc-detail__desc" text={session.summary} />
            </div>

            {expectedNpcs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="label">NPCs esperados</span>
                <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                  {expectedNpcs.map((n) => (
                    <span key={n.npc_id} className="npc-edit__type-chip">{n.name}</span>
                  ))}
                </div>
              </div>
            )}

            {expectedQuests.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="label">Quests esperadas</span>
                <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                  {expectedQuests.map((q) => (
                    <span key={q.quest_id} className="npc-edit__type-chip">{q.title}</span>
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
      <div className="npc-edit__bar" style={{ boxShadow: `inset 4px 0 0 var(--${played ? "status-alive" : "accent-sky"})` }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: played ? "var(--status-alive)" : "var(--accent-sky)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            Sesión {sessionCode(session)} {arc ? `· ${arc.label}` : ""} {played ? "· jugada" : "· planificada"}
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
              <div className="npc-edit__input">{sessionCode(session)}</div>
            </div>
            <div>
              <span className="label">Fecha</span>
              <input className="npc-edit__input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <span className="label">{played ? "Resumen" : "Notas de preparación"} (admite Markdown)</span>
            <textarea className="npc-edit__textarea" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          {played && session.prepNotes && (
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
                  <span key={n.npc_id} className="npc-edit__type-chip">{n.name}</span>
                ))}
              </div>
            </div>
          )}

          {expectedQuests.length > 0 && (
            <div>
              <span className="label">Quests esperadas</span>
              <div className="npc-edit__type-row" style={{ flexWrap: "wrap" }}>
                {expectedQuests.map((q) => (
                  <span key={q.quest_id} className="npc-edit__type-chip">{q.title}</span>
                ))}
              </div>
            </div>
          )}

          {!played && (
            <button className="btn btn-primary" onClick={() => setConfirmingPlay(true)}>Marcar como jugada</button>
          )}
        </div>
      </div>
    </div>
  );
}
