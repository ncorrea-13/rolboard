import { useState } from "react";
import "./NpcEdit.css";
import { locationTypeLabel, type Location } from "../data/domain";

const typeOptions = Object.entries(locationTypeLabel) as [Location["locationType"], string][];

interface LocationEditProps {
  location: Location;
  locations: Location[];
  onSave: (patch: Partial<Location>) => void;
  onDiscard: () => void;
}

export function LocationEdit({ location, locations, onSave, onDiscard }: LocationEditProps) {
  const [name, setName] = useState(location.name);
  const [locationType, setLocationType] = useState(location.locationType);
  const [parentId, setParentId] = useState(location.parentId ?? "");
  const [description, setDescription] = useState(location.description);

  const dirty =
    name !== location.name ||
    locationType !== location.locationType ||
    parentId !== (location.parentId ?? "") ||
    description !== location.description;

  function handleSave() {
    onSave({ name, locationType, parentId: parentId || undefined, description });
  }

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--crystal-location)" }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: "var(--crystal-location)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            {location.id ? `Editando · ${location.name}` : "Nueva locación"}
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
            <span className="label">Tipo</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as Location["locationType"])}
            >
              {typeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Ubicación padre</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">— sin padre —</option>
              {locations
                .filter((l) => l.id !== location.id)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
