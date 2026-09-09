import { useState } from "react";
import type { Campaign } from "../data/mock";

interface NewCampaignFormProps {
  onConfirm: (campaign: Omit<Campaign, "id">) => void;
  onCancel: () => void;
}

export function NewCampaignForm({ onConfirm, onCancel }: NewCampaignFormProps) {
  const [name, setName] = useState("");
  const [system, setSystem] = useState("");

  function handleConfirm() {
    if (!name.trim()) return;
    onConfirm({
      name: name.trim(),
      system: system.trim() || "Sin sistema definido",
      status: "alive",
      meta: "Sin arcos todavía",
      last: "recién creada",
    });
  }

  return (
    <>
      <div>
        <span className="label">Nombre de la campaña</span>
        <input
          className="npc-edit__input"
          placeholder="ej. La Fisura de Kholinar"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <span className="label">Sistema</span>
        <input
          className="npc-edit__input"
          placeholder="ej. Cosmere RPG"
          value={system}
          onChange={(e) => setSystem(e.target.value)}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 4,
        }}
      >
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={!name.trim()}
        >
          Crear campaña
        </button>
      </div>
    </>
  );
}
