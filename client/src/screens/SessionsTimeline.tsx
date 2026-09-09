import { useState } from "react";
import "./SessionsTimeline.css";
import type { Arc, SessionEntry } from "../data/mock";
import { Modal } from "../components/Modal";
import { EntityForm, type FormField } from "../components/EntityForm";

const sessionFields: FormField[] = [
  { key: "date", label: "Fecha", type: "text" },
  { key: "text", label: "Resumen", type: "textarea" },
  {
    key: "tags",
    label: "Tags (separados por espacio, ej. #kholinar #alianza)",
    type: "text",
  },
];

interface SessionsTimelineProps {
  arcs: Arc[];
  onRegisterSession: () => void;
  onEditSession: (
    arcId: string,
    sessionN: string,
    patch: Omit<SessionEntry, "n">,
  ) => void;
}

export function SessionsTimeline({
  arcs,
  onRegisterSession,
  onEditSession,
}: SessionsTimelineProps) {
  const totalSessions = arcs.reduce((acc, a) => acc + a.sessions.length, 0);
  const [editing, setEditing] = useState<{
    arcId: string;
    session: SessionEntry;
  } | null>(null);

  return (
    <div className="card sessions-timeline">
      <header className="sessions-timeline__header">
        <div>
          <div className="display" style={{ fontSize: 21 }}>
            Sesiones
          </div>
          <div className="sessions-timeline__subtitle">
            {totalSessions} sesiones en {arcs.length} arcos
          </div>
        </div>
        <button className="btn btn-primary" onClick={onRegisterSession}>
          Registrar sesión
        </button>
      </header>

      <div className="sessions-timeline__arcs">
        {arcs.map((arc) => (
          <div key={arc.id}>
            <div className="sessions-timeline__arc-head">
              <span
                className="status-dot"
                style={{
                  background: `var(--status-${arc.status === "paused" ? "paused-dot" : arc.status})`,
                }}
              />
              <span className="display" style={{ fontSize: 17.5 }}>
                {arc.label}
              </span>
              <span className="sessions-timeline__arc-meta">{arc.meta}</span>
              <span className="sessions-timeline__arc-rule" />
            </div>
            <div className="sessions-timeline__list">
              {arc.sessions.map((s) => (
                <div key={s.n} className="card sessions-timeline__item">
                  <div className="sessions-timeline__item-n">
                    <div className="sessions-timeline__item-code">{s.n}</div>
                    <div className="sessions-timeline__item-date">{s.date}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="sessions-timeline__item-text">{s.text}</div>
                    {s.tags && (
                      <div className="sessions-timeline__item-tags">
                        {s.tags}
                      </div>
                    )}
                  </div>
                  <span
                    className="sessions-timeline__item-open"
                    style={{ cursor: "pointer" }}
                    onClick={() => setEditing({ arcId: arc.id, session: s })}
                  >
                    Abrir
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal
          title={`Sesión ${editing.session.n}`}
          onClose={() => setEditing(null)}
        >
          <EntityForm
            fields={sessionFields}
            initialValues={{
              date: editing.session.date,
              text: editing.session.text,
              tags: editing.session.tags,
            }}
            submitLabel="Guardar"
            onConfirm={(values) => {
              onEditSession(editing.arcId, editing.session.n, {
                date: values.date,
                text: values.text,
                tags: values.tags,
              });
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
