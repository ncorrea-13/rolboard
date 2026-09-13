import { useEffect, useState } from "react";
import { Check, Zap, Timer, X, Heart, Plus, Crosshair, ScrollText } from "lucide-react";
import "./EncounterDetail.css";
import { CharacterSheet } from "../components/CharacterSheet";
import { EntityDetail } from "../components/EntityDetail";
import { Modal } from "../components/Modal";
import { EncounterStatusPill } from "../components/StatusPill";
import { SkillsEditor } from "../components/SkillsEditor";
import { apiFetch } from "../lib/api";
import {
  mapEncounterParticipant,
  participantToApiPayload,
  type ApiEncounterParticipant,
} from "../lib/apiMappers";
import {
  crystalColorFor,
  type Encounter,
  type EncounterParticipant,
  type Npc,
  type PlayerCharacter,
  type StatMap,
  type TurnType,
} from "../data/domain";

type AddKind = "npc" | "pc" | "custom";

interface EncounterDetailProps {
  encounter: Encounter;
  npcs: Npc[];
  playerCharacters: PlayerCharacter[];
  onBack: () => void;
  onStart: () => void;
  onClose: () => void;
  onNextRound: () => void;
  onDelete: () => void;
  onSyncPlayerHp: (pcId: string, patch: { currentHp?: number; maxHp?: number }) => void;
}

const phases: { key: TurnType; isPc: boolean; title: string; Icon: typeof Zap }[] = [
  { key: "rapido", isPc: true, title: "Rápidos · PJs", Icon: Zap },
  { key: "rapido", isPc: false, title: "Rápidos · PNJs", Icon: Zap },
  { key: "lento", isPc: true, title: "Lentos · PJs", Icon: Timer },
  { key: "lento", isPc: false, title: "Lentos · PNJs", Icon: Timer },
];

function hpColor(current?: number, max?: number): string {
  if (current == null || !max) return "var(--text-secondary)";
  const pct = current / max;
  if (pct <= 0.25) return "var(--status-dead)";
  if (pct <= 0.5) return "var(--status-missing)";
  return "var(--status-alive)";
}

export function EncounterDetail({
  encounter,
  npcs,
  playerCharacters,
  onBack,
  onStart,
  onClose,
  onNextRound,
  onDelete,
  onSyncPlayerHp,
}: EncounterDetailProps) {
  const [participants, setParticipants] = useState<EncounterParticipant[]>([]);
  const [acted, setActed] = useState<Set<string>>(new Set());
  // "Jugó su turno" y "rápido/lento" son estado de la ronda — se resetean al cambiar de ronda.
  const [seenRound, setSeenRound] = useState(encounter.round);
  if (seenRound !== encounter.round) {
    setSeenRound(encounter.round);
    setActed(new Set());
  }
  const [openSheets, setOpenSheets] = useState<Set<string>>(new Set());
  const [sheetModalId, setSheetModalId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<AddKind>("npc");
  const [addRefId, setAddRefId] = useState("");
  const [addName, setAddName] = useState("");

  function reload() {
    apiFetch<ApiEncounterParticipant[]>(`/encounters/${encounter.id}/participants`)
      .then((data) => setParticipants((data ?? []).map(mapEncounterParticipant)))
      .catch((err) => console.error("Error cargando participantes:", err));
  }

  useEffect(reload, [encounter.id]);

  function toggleSheet(id: string) {
    setOpenSheets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleActed(id: string) {
    setActed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addParticipant() {
    if (addKind === "custom" && !addName.trim()) return;
    if (addKind !== "custom" && !addRefId) return;
    // Al sumar un PJ, la vida arranca desde su ficha persistente — no de cero.
    const seedHp =
      addKind === "pc"
        ? (() => {
            const pc = playerCharacters.find((p) => p.id === addRefId);
            return { currentHp: pc?.currentHp, maxHp: pc?.maxHp };
          })()
        : {};
    const draft: EncounterParticipant = {
      id: "",
      encounterId: encounter.id,
      notes: "",
      attributes: {},
      skills: {},
      ...seedHp,
      ...(addKind === "custom"
        ? { displayName: addName }
        : addKind === "pc"
          ? { pcId: addRefId }
          : { npcId: addRefId }),
    };
    apiFetch(`/encounters/${encounter.id}/participants`, {
      method: "POST",
      body: JSON.stringify(participantToApiPayload(draft)),
    })
      .then(() => {
        setAddRefId("");
        setAddName("");
        reload();
      })
      .catch((err) => console.error("Error agregando participante:", err));
  }

  function updateParticipant(id: string, patch: Partial<EncounterParticipant>) {
    const current = participants.find((p) => p.id === id);
    if (!current) return;
    const merged = { ...current, ...patch };
    apiFetch(`/encounter-participants/${id}`, {
      method: "PUT",
      body: JSON.stringify(participantToApiPayload(merged)),
    })
      .then(() => {
        setParticipants((prev) => prev.map((p) => (p.id === id ? merged : p)));
        // La vida de un PJ es persistente — un cambio acá también actualiza su ficha.
        if (merged.pcId && ("currentHp" in patch || "maxHp" in patch)) {
          onSyncPlayerHp(merged.pcId, { currentHp: merged.currentHp, maxHp: merged.maxHp });
        }
      })
      .catch((err) => console.error("Error actualizando participante:", err));
  }

  function removeParticipant(id: string) {
    apiFetch(`/encounter-participants/${id}`, { method: "DELETE" })
      .then(() => setParticipants((prev) => prev.filter((p) => p.id !== id)))
      .catch((err) => console.error("Error sacando participante:", err));
  }

  function handleNextRound() {
    const withTurn = participants.filter((p) => p.turnType);
    Promise.all(
      withTurn.map((p) =>
        apiFetch(`/encounter-participants/${p.id}`, {
          method: "PUT",
          body: JSON.stringify(participantToApiPayload({ ...p, turnType: undefined })),
        }),
      ),
    )
      .then(() => {
        setParticipants((prev) => prev.map((p) => ({ ...p, turnType: undefined })));
        onNextRound();
      })
      .catch((err) => console.error("Error reiniciando turnos:", err));
  }

  function nameFor(p: EncounterParticipant): string {
    if (p.pcId) return playerCharacters.find((pc) => pc.id === p.pcId)?.characterName ?? "PJ";
    if (p.npcId) return npcs.find((n) => n.id === p.npcId)?.name ?? "NPC";
    return p.displayName ?? "Sin nombre";
  }

  function identityColor(p: EncounterParticipant): string {
    if (p.pcId) return "var(--accent-teal)";
    if (p.npcId) {
      const npc = npcs.find((n) => n.id === p.npcId);
      return npc ? crystalColorFor(npc.crystal) : "var(--text-secondary)";
    }
    return "var(--text-secondary)";
  }

  function kindLabel(p: EncounterParticipant): string {
    if (p.pcId) return "PJ";
    if (p.npcId) return "NPC";
    return "Ad-hoc";
  }

  function linkedSheet(p: EncounterParticipant): { attributes: StatMap; skills: StatMap } | undefined {
    if (p.pcId) return playerCharacters.find((pc) => pc.id === p.pcId);
    if (p.npcId) return npcs.find((n) => n.id === p.npcId);
    return undefined;
  }

  function renderParticipant(p: EncounterParticipant) {
    const isActed = acted.has(p.id);
    const color = identityColor(p);
    return (
      <div key={p.id} className={`encounter-card${isActed ? " encounter-card--acted" : ""}`}>
        <div className="encounter-card__top">
          <button
            className="encounter-card__check"
            onClick={() => toggleActed(p.id)}
            title="Jugó su turno esta ronda"
          >
            {isActed && <Check size={13} strokeWidth={3} />}
          </button>
          <span className="status-dot" style={{ background: color, flex: "none" }} />
          <span className="encounter-card__name">{nameFor(p)}</span>
          <span className="encounter-card__kind" style={{ color }}>
            {kindLabel(p)}
          </span>
          <button
            className="encounter-card__remove"
            onClick={() => removeParticipant(p.id)}
            title="Sacar del encuentro"
          >
            <X size={13} />
          </button>
        </div>

        <div className="encounter-card__stats">
          <div className="encounter-card__hp">
            <div className="encounter-card__stat-head">
              <Heart size={16} style={{ color: hpColor(p.currentHp, p.maxHp) }} />
              <span className="encounter-card__stat-label">HP</span>
            </div>
            <div className="encounter-card__hp-row">
              <div className="encounter-card__hp-track">
                <div
                  className="encounter-card__hp-fill"
                  style={{
                    width: p.maxHp ? `${Math.min(100, ((p.currentHp ?? 0) / p.maxHp) * 100)}%` : "0%",
                    background: hpColor(p.currentHp, p.maxHp),
                  }}
                />
              </div>
              <div className="encounter-card__hp-values">
                <input
                  className="encounter-card__hp-input"
                  type="number"
                  value={p.currentHp ?? ""}
                  onChange={(e) =>
                    updateParticipant(p.id, {
                      currentHp: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
                <span className="encounter-card__hp-sep">/</span>
                <input
                  className="encounter-card__hp-input"
                  type="number"
                  value={p.maxHp ?? ""}
                  onChange={(e) =>
                    updateParticipant(p.id, {
                      maxHp: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="encounter-card__divider" />

          <div className="encounter-card__stat">
            <div className="encounter-card__stat-head">
              <Crosshair size={16} style={{ color: "var(--accent-obsidian)" }} />
              <span className="encounter-card__stat-label">INI</span>
            </div>
            <div className="encounter-card__ini-badge">
              <input
                className="encounter-card__stat-value"
                type="number"
                value={p.initiativeValue ?? ""}
                onChange={(e) =>
                  updateParticipant(p.id, {
                    initiativeValue: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="encounter-card__bottom-row">
          <div className="encounter-card__toggle">
            <button
              className={`encounter-card__toggle-btn${p.turnType === "rapido" ? " encounter-card__toggle-btn--active" : ""}`}
              onClick={() =>
                updateParticipant(p.id, {
                  turnType: p.turnType === "rapido" ? undefined : "rapido",
                })
              }
            >
              <Zap size={11} /> Rápido
            </button>
            <button
              className={`encounter-card__toggle-btn${p.turnType === "lento" ? " encounter-card__toggle-btn--active" : ""}`}
              onClick={() =>
                updateParticipant(p.id, {
                  turnType: p.turnType === "lento" ? undefined : "lento",
                })
              }
            >
              <Timer size={11} /> Lento
            </button>
          </div>
          {linkedSheet(p) ? (
            <button
              className="encounter-card__sheet-toggle"
              onClick={() => setSheetModalId(p.id)}
              title="Ver ficha completa"
            >
              <ScrollText size={13} /> Ver ficha
            </button>
          ) : (
            <button
              className={`encounter-card__sheet-toggle${openSheets.has(p.id) ? " encounter-card__sheet-toggle--active" : ""}`}
              onClick={() => toggleSheet(p.id)}
              title="Ficha (atributos y habilidades)"
            >
              <ScrollText size={13} /> Ficha
            </button>
          )}
        </div>

        {!linkedSheet(p) && openSheets.has(p.id) && (
          <div className="encounter-card__sheet">
            <SkillsEditor
              label="Atributos"
              value={p.attributes}
              onChange={(next: StatMap) => updateParticipant(p.id, { attributes: next })}
            />
            <SkillsEditor
              label="Habilidades"
              value={p.skills}
              onChange={(next: StatMap) => updateParticipant(p.id, { skills: next })}
            />
          </div>
        )}
      </div>
    );
  }

  function byInitiativeDesc(a: EncounterParticipant, b: EncounterParticipant) {
    return (b.initiativeValue ?? -Infinity) - (a.initiativeValue ?? -Infinity);
  }

  const unassigned = participants.filter((p) => !p.turnType).sort(byInitiativeDesc);
  const sheetModalParticipant = participants.find((p) => p.id === sheetModalId);
  const sheetModalSheet = sheetModalParticipant ? linkedSheet(sheetModalParticipant) : undefined;

  return (
    <>
    <EntityDetail
      eyebrow="ENCUENTROS"
      backLabel="ENCUENTROS"
      onBack={onBack}
      title={`Ronda ${encounter.round}`}
      status={<EncounterStatusPill status={encounter.status} />}
      extraActions={
        <>
          {encounter.status !== "cerrado" && (
            <button className="btn btn-secondary" onClick={handleNextRound}>
              +1 ronda
            </button>
          )}
          {encounter.status === "planificado" && (
            <button className="btn btn-success" onClick={onStart}>
              Iniciar combate
            </button>
          )}
          {encounter.status === "activo" && (
            <button className="btn btn-danger" onClick={onClose}>
              Cerrar combate
            </button>
          )}
        </>
      }
      onDelete={onDelete}
      fields={[
        {
          label: `Participantes (${participants.length})`,
          value: (
            <div className="encounter-tracker">
              {unassigned.length > 0 && (
                <div>
                  <div className="encounter-phase__header">
                    <span className="encounter-phase__title">Sin turno asignado</span>
                    <span className="encounter-phase__count">({unassigned.length})</span>
                  </div>
                  <div className="encounter-phase__rows">
                    {unassigned.map(renderParticipant)}
                  </div>
                </div>
              )}

              {phases.map((phase) => {
                const rows = participants
                  .filter((p) => p.turnType === phase.key && !!p.pcId === phase.isPc)
                  .sort(byInitiativeDesc);
                if (rows.length === 0) return null;
                return (
                  <div key={phase.title}>
                    <div className="encounter-phase__header">
                      <phase.Icon size={13} className="encounter-phase__icon" style={{ color: "var(--accent-obsidian)" }} />
                      <span className="encounter-phase__title">{phase.title}</span>
                      <span className="encounter-phase__count">({rows.length})</span>
                    </div>
                    <div className="encounter-phase__rows">
                      {rows.map(renderParticipant)}
                    </div>
                  </div>
                );
              })}

              {participants.length === 0 && (
                <span style={{ color: "var(--text-secondary)" }}>
                  Sin participantes todavía.
                </span>
              )}

              {!addOpen && (
                <button className="encounter-add-trigger" onClick={() => setAddOpen(true)}>
                  <Plus size={14} /> Agregar peleador
                </button>
              )}

              {addOpen && (
                <div className="encounter-add">
                  <select
                    className="npc-edit__select npc-edit__select--native"
                    value={addKind}
                    onChange={(e) => {
                      setAddKind(e.target.value as AddKind);
                      setAddRefId("");
                      setAddName("");
                    }}
                  >
                    <option value="npc">NPC</option>
                    <option value="pc">Personaje</option>
                    <option value="custom">Enemigo genérico</option>
                  </select>
                  {addKind === "npc" && (
                    <select
                      className="npc-edit__select npc-edit__select--native"
                      value={addRefId}
                      onChange={(e) => setAddRefId(e.target.value)}
                    >
                      <option value="">Elegir NPC…</option>
                      {npcs.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {addKind === "pc" && (
                    <select
                      className="npc-edit__select npc-edit__select--native"
                      value={addRefId}
                      onChange={(e) => setAddRefId(e.target.value)}
                    >
                      <option value="">Elegir personaje…</option>
                      {playerCharacters.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.characterName}
                        </option>
                      ))}
                    </select>
                  )}
                  {addKind === "custom" && (
                    <input
                      className="npc-edit__input"
                      placeholder="Nombre (ej. Bandido 3)"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                    />
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      addParticipant();
                      setAddOpen(false);
                    }}
                  >
                    Agregar
                  </button>
                  <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ),
        },
      ]}
    />
    {sheetModalParticipant && sheetModalSheet && (
      <Modal title={`Ficha · ${nameFor(sheetModalParticipant)}`} onClose={() => setSheetModalId(null)} size="sheet">
        <CharacterSheet
          attributes={sheetModalSheet.attributes}
          skills={sheetModalSheet.skills}
          hp={{ current: sheetModalParticipant.currentHp, max: sheetModalParticipant.maxHp }}
        />
      </Modal>
    )}
    </>
  );
}
