import { useEffect, useState } from "react";
import {
  Check,
  Zap,
  Timer,
  X,
  Heart,
  Plus,
  Crosshair,
  ScrollText,
} from "lucide-react";
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
import { useT, type TranslationKey } from "../lib/i18n";
import { entityImageUrl } from "../lib/images";

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
  onSyncPlayerHp: (
    pcId: string,
    patch: { currentHp?: number; maxHp?: number },
  ) => void;
  imageVersion?: number;
}

const phases: {
  key: TurnType;
  isPc: boolean;
  titleKey: TranslationKey;
  Icon: typeof Zap;
}[] = [
  { key: "rapido", isPc: true, titleKey: "encounterDetail.fastPcs", Icon: Zap },
  {
    key: "rapido",
    isPc: false,
    titleKey: "encounterDetail.fastNpcs",
    Icon: Zap,
  },
  {
    key: "lento",
    isPc: true,
    titleKey: "encounterDetail.slowPcs",
    Icon: Timer,
  },
  {
    key: "lento",
    isPc: false,
    titleKey: "encounterDetail.slowNpcs",
    Icon: Timer,
  },
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
  imageVersion = 0,
}: EncounterDetailProps) {
  const t = useT();
  const [participants, setParticipants] = useState<EncounterParticipant[]>([]);
  const [acted, setActed] = useState<Set<string>>(new Set());
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
    apiFetch<ApiEncounterParticipant[]>(
      `/encounters/${encounter.id}/participants`,
    )
      .then((data) =>
        setParticipants((data ?? []).map(mapEncounterParticipant)),
      )
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
        if (merged.pcId && ("currentHp" in patch || "maxHp" in patch)) {
          onSyncPlayerHp(merged.pcId, {
            currentHp: merged.currentHp,
            maxHp: merged.maxHp,
          });
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
          body: JSON.stringify(
            participantToApiPayload({ ...p, turnType: undefined }),
          ),
        }),
      ),
    )
      .then(() => {
        setParticipants((prev) =>
          prev.map((p) => ({ ...p, turnType: undefined })),
        );
        onNextRound();
      })
      .catch((err) => console.error("Error reiniciando turnos:", err));
  }

  function nameFor(p: EncounterParticipant): string {
    if (p.pcId)
      return (
        playerCharacters.find((pc) => pc.id === p.pcId)?.characterName ??
        t("encounterDetail.kindPc")
      );
    if (p.npcId) return npcs.find((n) => n.id === p.npcId)?.name ?? "NPC";
    return p.displayName ?? t("encounterDetail.noName");
  }

  function identityColor(p: EncounterParticipant): string {
    if (p.pcId) return "var(--accent-teal)";
    if (p.npcId) {
      const npc = npcs.find((n) => n.id === p.npcId);
      return npc ? crystalColorFor(npc.crystal) : "var(--text-secondary)";
    }
    return "var(--text-secondary)";
  }

  function participantImageUrl(p: EncounterParticipant): string | undefined {
    if (p.pcId) {
      const pc = playerCharacters.find((c) => c.id === p.pcId);
      return entityImageUrl("player-character", p.pcId, pc?.hasImage, imageVersion);
    }
    if (p.npcId) {
      const npc = npcs.find((n) => n.id === p.npcId);
      return entityImageUrl("npc", p.npcId, npc?.hasImage, imageVersion);
    }
    return undefined;
  }

  function kindLabel(p: EncounterParticipant): string {
    if (p.pcId) return t("encounterDetail.kindPc");
    if (p.npcId) return "NPC";
    return "Ad-hoc";
  }

  function linkedSheet(
    p: EncounterParticipant,
  ): { attributes: StatMap; skills: StatMap } | undefined {
    if (p.pcId) return playerCharacters.find((pc) => pc.id === p.pcId);
    if (p.npcId) return npcs.find((n) => n.id === p.npcId);
    return undefined;
  }

  function renderParticipant(p: EncounterParticipant) {
    const isActed = acted.has(p.id);
    const color = identityColor(p);
    return (
      <div
        key={p.id}
        className={`encounter-card${isActed ? " encounter-card--acted" : ""}`}
      >
        <div className="encounter-card__top">
          <button
            className="encounter-card__check"
            onClick={() => toggleActed(p.id)}
            title={t("encounterDetail.actedTitle")}
          >
            {isActed && <Check size={13} strokeWidth={3} />}
          </button>
          {participantImageUrl(p) ? (
            <img
              className="encounter-card__avatar"
              src={participantImageUrl(p)}
              alt=""
            />
          ) : (
            <span
              className="status-dot"
              style={{ background: color, flex: "none" }}
            />
          )}
          <span className="encounter-card__name">{nameFor(p)}</span>
          <span className="encounter-card__kind" style={{ color }}>
            {kindLabel(p)}
          </span>
          <button
            className="encounter-card__remove"
            onClick={() => removeParticipant(p.id)}
            title={t("encounterDetail.removeTitle")}
          >
            <X size={13} />
          </button>
        </div>

        <div className="encounter-card__stats">
          <div className="encounter-card__hp">
            <div className="encounter-card__stat-head">
              <Heart
                size={16}
                style={{ color: hpColor(p.currentHp, p.maxHp) }}
              />
              <span className="encounter-card__stat-label">HP</span>
            </div>
            <div className="encounter-card__hp-row">
              <div className="encounter-card__hp-track">
                <div
                  className="encounter-card__hp-fill"
                  style={{
                    width: p.maxHp
                      ? `${Math.min(100, ((p.currentHp ?? 0) / p.maxHp) * 100)}%`
                      : "0%",
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
                      currentHp:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
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
                      maxHp:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="encounter-card__divider" />

          <div className="encounter-card__stat">
            <div className="encounter-card__stat-head">
              <Crosshair
                size={16}
                style={{ color: "var(--accent-obsidian)" }}
              />
              <span className="encounter-card__stat-label">INI</span>
            </div>
            <div className="encounter-card__ini-badge">
              <input
                className="encounter-card__stat-value"
                type="number"
                value={p.initiativeValue ?? ""}
                onChange={(e) =>
                  updateParticipant(p.id, {
                    initiativeValue:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
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
              <Zap size={11} /> {t("encounterDetail.fast")}
            </button>
            <button
              className={`encounter-card__toggle-btn${p.turnType === "lento" ? " encounter-card__toggle-btn--active" : ""}`}
              onClick={() =>
                updateParticipant(p.id, {
                  turnType: p.turnType === "lento" ? undefined : "lento",
                })
              }
            >
              <Timer size={11} /> {t("encounterDetail.slow")}
            </button>
          </div>
          {linkedSheet(p) ? (
            <button
              className="encounter-card__sheet-toggle"
              onClick={() => setSheetModalId(p.id)}
              title={t("encounterDetail.viewFullSheet")}
            >
              <ScrollText size={13} /> {t("npcDetail.viewSheet")}
            </button>
          ) : (
            <button
              className={`encounter-card__sheet-toggle${openSheets.has(p.id) ? " encounter-card__sheet-toggle--active" : ""}`}
              onClick={() => toggleSheet(p.id)}
              title={t("encounterDetail.sheetTitle")}
            >
              <ScrollText size={13} /> {t("npcDetail.sheetPrefix")}
            </button>
          )}
        </div>

        {!linkedSheet(p) && openSheets.has(p.id) && (
          <div className="encounter-card__sheet">
            <SkillsEditor
              label={t("characterSheet.attributes")}
              value={p.attributes}
              onChange={(next: StatMap) =>
                updateParticipant(p.id, { attributes: next })
              }
            />
            <SkillsEditor
              label={t("characterSheet.skills")}
              value={p.skills}
              onChange={(next: StatMap) =>
                updateParticipant(p.id, { skills: next })
              }
            />
          </div>
        )}
      </div>
    );
  }

  function byInitiativeDesc(a: EncounterParticipant, b: EncounterParticipant) {
    return (b.initiativeValue ?? -Infinity) - (a.initiativeValue ?? -Infinity);
  }

  const unassigned = participants
    .filter((p) => !p.turnType)
    .sort(byInitiativeDesc);
  const sheetModalParticipant = participants.find((p) => p.id === sheetModalId);
  const sheetModalSheet = sheetModalParticipant
    ? linkedSheet(sheetModalParticipant)
    : undefined;

  return (
    <>
      <EntityDetail
        eyebrow={t("encounterDetail.breadcrumb")}
        backLabel={t("encounterDetail.breadcrumb")}
        onBack={onBack}
        title={`${t("encountersList.round")} ${encounter.round}`}
        status={<EncounterStatusPill status={encounter.status} />}
        extraActions={
          <>
            {encounter.status !== "cerrado" && (
              <button className="btn btn-secondary" onClick={handleNextRound}>
                {t("encounterDetail.addRound")}
              </button>
            )}
            {encounter.status === "planificado" && (
              <button className="btn btn-success" onClick={onStart}>
                {t("encounterDetail.startCombat")}
              </button>
            )}
            {encounter.status === "activo" && (
              <button className="btn btn-danger" onClick={onClose}>
                {t("encounterDetail.closeCombat")}
              </button>
            )}
          </>
        }
        onDelete={onDelete}
        fields={[
          {
            label: `${t("encounterDetail.participants")} (${participants.length})`,
            value: (
              <div className="encounter-tracker">
                {unassigned.length > 0 && (
                  <div>
                    <div className="encounter-phase__header">
                      <span className="encounter-phase__title">
                        {t("encounterDetail.noTurnAssigned")}
                      </span>
                      <span className="encounter-phase__count">
                        ({unassigned.length})
                      </span>
                    </div>
                    <div className="encounter-phase__rows">
                      {unassigned.map(renderParticipant)}
                    </div>
                  </div>
                )}

                {phases.map((phase) => {
                  const rows = participants
                    .filter(
                      (p) =>
                        p.turnType === phase.key && !!p.pcId === phase.isPc,
                    )
                    .sort(byInitiativeDesc);
                  if (rows.length === 0) return null;
                  return (
                    <div key={phase.titleKey}>
                      <div className="encounter-phase__header">
                        <phase.Icon
                          size={13}
                          className="encounter-phase__icon"
                          style={{ color: "var(--accent-obsidian)" }}
                        />
                        <span className="encounter-phase__title">
                          {t(phase.titleKey)}
                        </span>
                        <span className="encounter-phase__count">
                          ({rows.length})
                        </span>
                      </div>
                      <div className="encounter-phase__rows">
                        {rows.map(renderParticipant)}
                      </div>
                    </div>
                  );
                })}

                {participants.length === 0 && (
                  <span style={{ color: "var(--text-secondary)" }}>
                    {t("encounterDetail.noParticipantsYet")}
                  </span>
                )}

                {!addOpen && (
                  <button
                    className="encounter-add-trigger"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus size={14} /> {t("encounterDetail.addFighter")}
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
                      <option value="pc">{t("encounterDetail.optPc")}</option>
                      <option value="custom">
                        {t("encounterDetail.optCustom")}
                      </option>
                    </select>
                    {addKind === "npc" && (
                      <select
                        className="npc-edit__select npc-edit__select--native"
                        value={addRefId}
                        onChange={(e) => setAddRefId(e.target.value)}
                      >
                        <option value="">
                          {t("encounterDetail.chooseNpc")}
                        </option>
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
                        <option value="">
                          {t("encounterDetail.choosePc")}
                        </option>
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
                        placeholder={t("encounterDetail.customNamePlaceholder")}
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
                      {t("common.add")}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setAddOpen(false)}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
      {sheetModalParticipant && sheetModalSheet && (
        <Modal
          title={`${t("npcDetail.sheetPrefix")} · ${nameFor(sheetModalParticipant)}`}
          onClose={() => setSheetModalId(null)}
          size="sheet"
        >
          <CharacterSheet
            attributes={sheetModalSheet.attributes}
            skills={sheetModalSheet.skills}
            hp={{
              current: sheetModalParticipant.currentHp,
              max: sheetModalParticipant.maxHp,
            }}
          />
        </Modal>
      )}
    </>
  );
}
