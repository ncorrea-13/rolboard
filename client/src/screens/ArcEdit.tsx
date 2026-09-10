import { useState } from "react";
import "./NpcEdit.css";
import { type Arc, type ArcStatus } from "../data/domain";

const statusOptions: { value: ArcStatus; label: string }[] = [
  { value: "planificado", label: "Planificado" },
  { value: "en_curso", label: "En curso" },
  { value: "cerrado", label: "Cerrado" },
];

interface ArcEditProps {
  arc: Arc;
  onSave: (patch: Partial<Arc>) => void;
  onDiscard: () => void;
}

export function ArcEdit({ arc, onSave, onDiscard }: ArcEditProps) {
  const [label, setLabel] = useState(arc.label);
  const [summary, setSummary] = useState(arc.summary);
  const [order, setOrder] = useState(String(arc.order || ""));
  const [subarcOrder, setSubarcOrder] = useState(
    arc.subarcOrder != null ? String(arc.subarcOrder) : "",
  );
  const [status, setStatus] = useState<ArcStatus>(arc.status);
  const [obsidianPath, setObsidianPath] = useState(arc.obsidianPath);

  const dirty =
    label !== arc.label ||
    summary !== arc.summary ||
    order !== String(arc.order || "") ||
    subarcOrder !== (arc.subarcOrder != null ? String(arc.subarcOrder) : "") ||
    status !== arc.status ||
    obsidianPath !== arc.obsidianPath;

  function handleSave() {
    onSave({
      label,
      summary,
      order: Number(order) || arc.order,
      subarcOrder: subarcOrder.trim() ? Number(subarcOrder) : undefined,
      status,
      obsidianPath,
    });
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--accent-obsidian)" }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: "var(--accent-obsidian)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            {arc.id ? `Editando · ${arc.label}` : "Nuevo arco"}
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
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">Nombre del arco</span>
              <input
                className="npc-edit__input npc-edit__input--focus"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ej. Arco III · La Marea Alta"
              />
            </div>
            <div>
              <span className="label">Número de arco</span>
              <input
                className="npc-edit__input"
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              />
            </div>
            <div>
              <span className="label">Subarco (opcional, ej. 1 para "Arco {order || "N"}.1")</span>
              <input
                className="npc-edit__input"
                type="number"
                value={subarcOrder}
                onChange={(e) => setSubarcOrder(e.target.value)}
                placeholder="vacío = arco principal"
              />
            </div>
          </div>

          <div>
            <span className="label">Resumen</span>
            <textarea
              className="npc-edit__textarea"
              style={{ minHeight: 200 }}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
        </div>

        <div className="npc-edit__col">
          <div>
            <span className="label">Estado</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              value={status}
              onChange={(e) => setStatus(e.target.value as ArcStatus)}
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Ruta en Obsidian</span>
            <input
              className="npc-edit__input"
              value={obsidianPath}
              onChange={(e) => setObsidianPath(e.target.value)}
              placeholder="Arcos/Arco 3 - La Marea Alta.md"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
