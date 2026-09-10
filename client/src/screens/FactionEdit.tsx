import { useState } from "react";
import "./NpcEdit.css";
import { type Group, type Npc } from "../data/domain";

interface FactionEditProps {
  group: Group;
  npcs: Npc[];
  onSave: (patch: Partial<Group>) => void;
  onDiscard: () => void;
}

export function FactionEdit({ group, npcs, onSave, onDiscard }: FactionEditProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [alineacion, setAlineacion] = useState(group.alineacion);
  const [liderNpcId, setLiderNpcId] = useState(group.liderNpcId ?? "");

  const dirty =
    name !== group.name ||
    description !== group.description ||
    alineacion !== group.alineacion ||
    liderNpcId !== (group.liderNpcId ?? "");

  function handleSave() {
    onSave({ name, description, alineacion, liderNpcId: liderNpcId || undefined });
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--crystal-faction-quest)" }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: "var(--crystal-faction-quest)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            {group.id ? `Editando · ${group.name}` : "Nueva facción"}
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
            <span className="label">Nombre</span>
            <input
              className="npc-edit__input npc-edit__input--focus"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <span className="label">Descripción</span>
            <textarea
              className="npc-edit__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="npc-edit__col">
          <div>
            <span className="label">Alineación</span>
            <input
              className="npc-edit__input"
              value={alineacion}
              onChange={(e) => setAlineacion(e.target.value)}
            />
          </div>
          <div>
            <span className="label">Líder</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              value={liderNpcId}
              onChange={(e) => setLiderNpcId(e.target.value)}
            >
              <option value="">Sin líder</option>
              {npcs.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
