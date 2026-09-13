import { useEffect, useState } from "react";
import { EntityDetail } from "../components/EntityDetail";
import { StatusPill } from "../components/StatusPill";
import { QuestStatusPill } from "../components/StatusPill";
import { ArcStatusPill } from "../components/StatusPill";
import { EntityIdentity } from "../components/EntityIdentity";
import { MarkdownText } from "../components/MarkdownText";
import { apiFetch } from "../lib/api";
import {
  mapGroupMember,
  mapPCGroupMember,
  type ApiGroupMember,
  type ApiPCGroupMember,
} from "../lib/apiMappers";
import {
  crystalColor,
  formatDate,
  locationTypeLabel,
  sessionCode,
  type Arc,
  type Group,
  type Location,
  type Quest,
  type Npc,
  type PlayerCharacter,
  type Session,
} from "../data/domain";

interface EditableProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function ArcDetail({
  arc,
  sessions,
  vaultName,
  campaignId,
  onBack,
  onEdit,
  onDelete,
  onStart,
  onClose,
}: {
  arc: Arc;
  sessions: Session[];
  vaultName: string;
  campaignId: string;
  onBack: () => void;
  onStart: () => void;
  onClose: () => void;
} & EditableProps) {
  return (
    <EntityDetail
      eyebrow="ARCOS"
      backLabel="ARCOS"
      onBack={onBack}
      title={arc.label}
      status={<ArcStatusPill status={arc.status} />}
      extraActions={
        arc.status === "en_curso" ? (
          <button className="btn btn-danger" onClick={onClose}>
            Cerrar arco
          </button>
        ) : (
          arc.status !== "cerrado" && (
            <button className="btn btn-success" onClick={onStart}>
              Iniciar arco
            </button>
          )
        )
      }
      obsidianPath={arc.obsidianPath}
      vaultName={vaultName}
      campaignId={campaignId}
      onEdit={onEdit}
      onDelete={onDelete}
      fields={[
        { label: "Resumen", value: arc.summary },
        {
          label: `Sesiones (${sessions.length})`,
          value: (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sessions.map((s) => (
                <div key={s.id} style={{ display: "flex", gap: 12 }}>
                  <span
                    style={{
                      font: "500 13px var(--font-mono)",
                      color: "var(--accent-sky)",
                      width: 40,
                    }}
                  >
                    {sessionCode(s)}
                  </span>
                  <span style={{ flex: 1 }}>{s.summary}</span>
                  <span
                    style={{
                      font: "400 12px var(--font-mono)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {formatDate(s.date)}
                  </span>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}

export function FactionDetail({
  group,
  npcs,
  playerCharacters,
  vaultName,
  campaignId,
  onBack,
  onSelectNpc,
  onSelectPlayer,
  onEdit,
  onDelete,
}: {
  group: Group;
  npcs: Npc[];
  playerCharacters: PlayerCharacter[];
  vaultName: string;
  campaignId: string;
  onBack: () => void;
  onSelectNpc: (id: string) => void;
  onSelectPlayer: (id: string) => void;
} & EditableProps) {
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [pcMemberIds, setPcMemberIds] = useState<string[]>([]);
  const [addNpcId, setAddNpcId] = useState("");
  const [addPcId, setAddPcId] = useState("");

  function reloadMembers() {
    apiFetch<ApiGroupMember[]>(`/groups/${group.id}/members`)
      .then((data) => setMemberIds((data ?? []).map(mapGroupMember).map((m) => m.npcId)))
      .catch((err) => console.error("Error cargando miembros:", err));
  }

  useEffect(reloadMembers, [group.id]);

  function reloadPcMembers() {
    apiFetch<ApiPCGroupMember[]>(`/groups/${group.id}/pc-members`)
      .then((data) => setPcMemberIds((data ?? []).map(mapPCGroupMember).map((m) => m.pcId)))
      .catch((err) => console.error("Error cargando PJs miembros:", err));
  }

  useEffect(reloadPcMembers, [group.id]);

  function addMember() {
    if (!addNpcId) return;
    apiFetch(`/groups/${group.id}/members`, {
      method: "POST",
      body: JSON.stringify({ npc_id: Number(addNpcId) }),
    })
      .then(() => {
        setAddNpcId("");
        reloadMembers();
      })
      .catch((err) => console.error("Error agregando miembro:", err));
  }

  function removeMember(npcId: string) {
    apiFetch(`/groups/${group.id}/members/${npcId}`, { method: "DELETE" })
      .then(reloadMembers)
      .catch((err) => console.error("Error sacando miembro:", err));
  }

  function addPcMember() {
    if (!addPcId) return;
    apiFetch(`/groups/${group.id}/pc-members`, {
      method: "POST",
      body: JSON.stringify({ pc_id: Number(addPcId) }),
    })
      .then(() => {
        setAddPcId("");
        reloadPcMembers();
      })
      .catch((err) => console.error("Error agregando PJ:", err));
  }

  function removePcMember(pcId: string) {
    apiFetch(`/groups/${group.id}/pc-members/${pcId}`, { method: "DELETE" })
      .then(reloadPcMembers)
      .catch((err) => console.error("Error sacando PJ:", err));
  }

  const members = npcs.filter((n) => memberIds.includes(n.id));
  const addableNpcs = npcs.filter((n) => !memberIds.includes(n.id));
  const pcMembers = playerCharacters.filter((p) => pcMemberIds.includes(p.id));
  const addablePcs = playerCharacters.filter((p) => !pcMemberIds.includes(p.id));
  const lider = npcs.find((n) => n.id === group.liderNpcId);
  return (
    <EntityDetail
      eyebrow="FACCIONES"
      backLabel="FACCIONES"
      onBack={onBack}
      title={group.name}
      accentColor="var(--crystal-faction-quest)"
      obsidianPath={group.obsidianPath}
      vaultName={vaultName}
      campaignId={campaignId}
      onEdit={onEdit}
      onDelete={onDelete}
      fields={[
        { label: "Descripción", value: group.description },
        ...(group.alineacion ? [{ label: "Alineación", value: group.alineacion }] : []),
        ...(lider ? [{ label: "Líder", value: lider.name }] : []),
        {
          label: `Miembros (${members.length})`,
          value: (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((n) => (
                <div
                  key={n.id}
                  className="list-page__row"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div
                    style={{ flex: 1, cursor: "pointer" }}
                    onClick={() => onSelectNpc(n.id)}
                  >
                    <EntityIdentity
                      initials={n.initials}
                      name={n.name}
                      role={n.role}
                      color={crystalColor[n.crystal]}
                    />
                  </div>
                  <StatusPill status={n.status} />
                  <button className="btn btn-secondary" onClick={() => removeMember(n.id)}>
                    Sacar
                  </button>
                </div>
              ))}
              {members.length === 0 && (
                <span style={{ color: "var(--text-secondary)" }}>
                  Sin miembros todavía.
                </span>
              )}
              {addableNpcs.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <select
                    className="npc-edit__select npc-edit__select--native"
                    value={addNpcId}
                    onChange={(e) => setAddNpcId(e.target.value)}
                  >
                    <option value="">Agregar NPC…</option>
                    {addableNpcs.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-secondary" onClick={addMember} disabled={!addNpcId}>
                    Agregar
                  </button>
                </div>
              )}
            </div>
          ),
        },
        {
          label: `Jugadores (${pcMembers.length})`,
          value: (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pcMembers.map((p) => (
                <div
                  key={p.id}
                  className="list-page__row"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div
                    style={{ flex: 1, cursor: "pointer" }}
                    onClick={() => onSelectPlayer(p.id)}
                  >
                    <EntityIdentity
                      initials={p.characterName.slice(0, 2).toUpperCase()}
                      name={p.characterName}
                      role={`Jugado por ${p.playerName}`}
                      color="var(--crystal-npc)"
                    />
                  </div>
                  <StatusPill status={p.status} />
                  <button className="btn btn-secondary" onClick={() => removePcMember(p.id)}>
                    Sacar
                  </button>
                </div>
              ))}
              {pcMembers.length === 0 && (
                <span style={{ color: "var(--text-secondary)" }}>
                  Sin jugadores todavía.
                </span>
              )}
              {addablePcs.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <select
                    className="npc-edit__select npc-edit__select--native"
                    value={addPcId}
                    onChange={(e) => setAddPcId(e.target.value)}
                  >
                    <option value="">Agregar jugador…</option>
                    {addablePcs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.characterName}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-secondary" onClick={addPcMember} disabled={!addPcId}>
                    Agregar
                  </button>
                </div>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}

export function LocationDetail({
  location,
  allLocations,
  vaultName,
  campaignId,
  onBack,
  onEdit,
  onDelete,
}: {
  location: Location;
  allLocations: Location[];
  vaultName: string;
  campaignId: string;
  onBack: () => void;
} & EditableProps) {
  const breadcrumb: Location[] = [];
  let current: Location | undefined = location;
  while (current) {
    breadcrumb.unshift(current);
    current = allLocations.find((l) => l.id === current!.parentId);
  }
  const children = allLocations.filter((l) => l.parentId === location.id);

  return (
    <EntityDetail
      eyebrow="LOCACIONES"
      backLabel="LOCACIONES"
      onBack={onBack}
      title={location.name}
      accentColor="var(--crystal-location)"
      subtitle={locationTypeLabel[location.locationType]}
      obsidianPath={location.obsidianPath}
      vaultName={vaultName}
      campaignId={campaignId}
      onEdit={onEdit}
      onDelete={onDelete}
      fields={[
        {
          label: "Jerarquía",
          value: breadcrumb.map((l) => l.name).join(" › "),
        },
        { label: "Descripción", value: location.description },
        {
          label: `Sub-locaciones (${children.length})`,
          value:
            children.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {children.map((c) => (
                  <div key={c.id}>
                    {c.name}{" "}
                    <span style={{ color: "var(--text-secondary)" }}>
                      · {locationTypeLabel[c.locationType]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: "var(--text-secondary)" }}>
                Sin sub-locaciones registradas.
              </span>
            ),
        },
      ]}
    />
  );
}

export function QuestDetail({
  quest,
  onBack,
  onEdit,
  onDelete,
}: { quest: Quest; onBack: () => void } & EditableProps) {
  const priorityLabel = { 1: "Alta", 2: "Media", 3: "Baja" } as const;
  return (
    <EntityDetail
      eyebrow="QUESTS"
      backLabel="QUESTS"
      onBack={onBack}
      title={quest.name}
      accentColor={crystalColor[quest.crystal]}
      status={<QuestStatusPill status={quest.status} />}
      onEdit={onEdit}
      onDelete={onDelete}
      fields={[
        { label: "Gancho", value: <MarkdownText text={quest.hook} /> },
        { label: "Prioridad", value: priorityLabel[quest.priority] },
        ...(quest.notes
          ? [{ label: "Notas del DM", value: <MarkdownText text={quest.notes} /> }]
          : []),
      ]}
    />
  );
}

