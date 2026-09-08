import { useState } from "react";
import "./NpcEdit.css";
import { crystalColor, statusLabel, statusColor, statusDotColor, type CrystalType, type Npc, type StatusKind } from "../data/mock";

const typeOptions: { label: string; crystal: CrystalType }[] = [
  { label: "NPC", crystal: "npc" },
  { label: "Spren / cognitiva", crystal: "spren" },
  { label: "Referencia", crystal: "location" },
];

const statusOptions: StatusKind[] = ["alive", "missing", "dead", "paused"];

interface NpcEditProps {
  npc: Npc;
  onSave: (patch: Partial<Npc>) => void;
  onDiscard: () => void;
}

export function NpcEdit({ npc, onSave, onDiscard }: NpcEditProps) {
  const [name, setName] = useState(npc.name);
  const [description, setDescription] = useState(npc.description);
  const [status, setStatus] = useState<StatusKind>(npc.status);
  const [crystal, setCrystal] = useState<CrystalType>(npc.crystal);

  const dirty = name !== npc.name || description !== npc.description || status !== npc.status || crystal !== npc.crystal;

  function handleSave() {
    const crystalLabel = typeOptions.find((t) => t.crystal === crystal)?.label ?? npc.crystalLabel;
    onSave({ name, description, status, crystal, crystalLabel });
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--accent-flame)" }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: "var(--accent-flame)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>Editando · {npc.name}</span>
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
              <span className="label">Nombre</span>
              <input className="npc-edit__input npc-edit__input--focus" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="npc-edit__hint">Campo con foco: anillo ámbar de 1px, nunca glow.</div>
            </div>
            <div>
              <span className="label">Status</span>
              <select
                className="npc-edit__select npc-edit__select--native"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusKind)}
                style={{ color: statusColor[status] }}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="label">Tipo</span>
            <div className="npc-edit__type-row">
              {typeOptions.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className={`npc-edit__type-chip${crystal === t.crystal ? " npc-edit__type-chip--active" : ""}`}
                  onClick={() => setCrystal(t.crystal)}
                >
                  <span className="npc-edit__type-mark" style={{ background: crystalColor[t.crystal] }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Descripción</span>
            <textarea className="npc-edit__textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <span className="label">Vínculo con otro NPC</span>
            <div className="npc-edit__grid-2">
              <div className="npc-edit__select">
                Vinculado<span className="npc-edit__chevron">⌄</span>
              </div>
              <div className="npc-edit__select" style={{ borderBottom: "2px solid var(--crystal-spren)" }}>
                Ishara-nal<span className="npc-edit__chevron">⌄</span>
              </div>
            </div>
            <div className="npc-edit__hint">
              El selector hereda el color de cristal del tipo elegido — se ve que el vínculo es con un spren sin leer
              la etiqueta.
            </div>
          </div>
        </div>

        <div className="npc-edit__col">
          <div>
            <span className="label">Ubicación actual</span>
            <div className="npc-edit__select" style={{ borderBottom: "2px solid var(--crystal-location)" }}>
              {npc.location}
              <span className="npc-edit__chevron">⌄</span>
            </div>
          </div>
          <div>
            <span className="label">Facción</span>
            <div className="npc-edit__select" style={{ borderBottom: "2px solid var(--crystal-faction-quest)" }}>
              {npc.faction}
              <span className="npc-edit__chevron">⌄</span>
            </div>
          </div>
          <div>
            <span className="label">Nota de Obsidian</span>
            <div className="npc-edit__select" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
              {npc.obsidianPath}
            </div>
          </div>
          <div className="card npc-edit__warning" style={{ boxShadow: "inset 3px 0 0 var(--status-dead)" }}>
            <div className="npc-edit__warning-title">
              <span className="status-dot" style={{ background: statusDotColor[status] }} />
              {status === "dead" ? "NPC marcado como muerto" : "Falta la ubicación de origen"}
            </div>
            <div className="npc-edit__warning-body">Podés guardar igual; el campo queda marcado como incompleto en la ficha.</div>
          </div>
          <div className="npc-edit__note">
            Decisión: edición en la misma vista, no modal. Un modal taparía la ficha justo cuando estás copiando datos
            de ella en vivo, y los vínculos necesitan el ancho completo.
          </div>
        </div>
      </div>
    </div>
  );
}
