import { useState } from "react";
import { Plus, X } from "lucide-react";
import "./SkillsEditor.css";
import type { StatMap } from "../data/domain";

function parseValue(raw: string): string | number {
  if (raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

interface SkillsEditorProps {
  label: string;
  value: StatMap;
  onChange: (next: StatMap) => void;
}

export function SkillsEditor({ label, value, onChange }: SkillsEditorProps) {
  const [newKey, setNewKey] = useState("");
  const entries = Object.entries(value);

  function updateEntry(key: string, raw: string) {
    onChange({ ...value, [key]: parseValue(raw) });
  }

  function renameEntry(oldKey: string, newKeyName: string) {
    if (!newKeyName.trim() || newKeyName === oldKey) return;
    const next: StatMap = {};
    for (const [k, v] of Object.entries(value)) {
      next[k === oldKey ? newKeyName : k] = v;
    }
    onChange(next);
  }

  function removeEntry(key: string) {
    const next = { ...value };
    delete next[key];
    onChange(next);
  }

  function addEntry() {
    const key = newKey.trim();
    if (!key || key in value) return;
    onChange({ ...value, [key]: "" });
    setNewKey("");
  }

  return (
    <div className="skills-editor">
      <span className="label">{label}</span>
      <div className="skills-editor__rows">
        {entries.map(([key, val]) => (
          <div key={key} className="skills-editor__row">
            <input
              className="skills-editor__key"
              defaultValue={key}
              onBlur={(e) => renameEntry(key, e.target.value)}
            />
            <input
              className="skills-editor__value"
              value={val}
              onChange={(e) => updateEntry(key, e.target.value)}
            />
            <button className="skills-editor__remove" onClick={() => removeEntry(key)}>
              <X size={12} />
            </button>
          </div>
        ))}
        <div className="skills-editor__row">
          <input
            className="skills-editor__key"
            placeholder="Nuevo campo…"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEntry()}
          />
          <button className="skills-editor__add" onClick={addEntry}>
            <Plus size={12} /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
