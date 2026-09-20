import { useEffect, useState } from "react";
import { EntityDetail } from "../components/EntityDetail";
import { StatusPill } from "../components/StatusPill";
import { QuestStatusPill } from "../components/StatusPill";
import { ArcStatusPill } from "../components/StatusPill";
import { EntityIdentity } from "../components/EntityIdentity";
import { MarkdownText } from "../components/MarkdownText";
import { apiFetch } from "../lib/api";
import { entityImageUrl } from "../lib/images";
import {
  mapGroupMember,
  mapPCGroupMember,
  type ApiGroupMember,
  type ApiPCGroupMember,
} from "../lib/apiMappers";
import {
  crystalColor,
  crystalColorFor,
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
import { useT, useLang } from "../lib/i18n";

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
  const t = useT();
  return (
    <EntityDetail
      eyebrow={t("entityDetails.arcosBreadcrumb")}
      backLabel={t("entityDetails.arcosBreadcrumb")}
      onBack={onBack}
      title={arc.label}
      status={<ArcStatusPill status={arc.status} />}
      extraActions={
        arc.status === "en_curso" ? (
          <button className="btn btn-danger" onClick={onClose}>
            {t("arcDetail.closeArc")}
          </button>
        ) : (
          arc.status !== "cerrado" && (
            <button className="btn btn-success" onClick={onStart}>
              {t("arcDetail.startArc")}
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
        {
          label: t("common.summary"),
          value: <MarkdownText text={arc.summary} />,
        },
        {
          label: `${t("arcDetail.sessions")} (${sessions.length})`,
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
                  <span style={{ flex: 1 }}>
                    <MarkdownText inline text={s.summary} />
                  </span>
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
  imageVersion = 0,
}: {
  group: Group;
  npcs: Npc[];
  playerCharacters: PlayerCharacter[];
  vaultName: string;
  campaignId: string;
  onBack: () => void;
  onSelectNpc: (id: string) => void;
  onSelectPlayer: (id: string) => void;
  imageVersion?: number;
} & EditableProps) {
  const t = useT();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [pcMemberIds, setPcMemberIds] = useState<string[]>([]);
  const [addNpcId, setAddNpcId] = useState("");
  const [addPcId, setAddPcId] = useState("");

  function reloadMembers() {
    apiFetch<ApiGroupMember[]>(`/groups/${group.id}/members`)
      .then((data) =>
        setMemberIds((data ?? []).map(mapGroupMember).map((m) => m.npcId)),
      )
      .catch((err) => console.error("Error cargando miembros:", err));
  }

  useEffect(reloadMembers, [group.id]);

  function reloadPcMembers() {
    apiFetch<ApiPCGroupMember[]>(`/groups/${group.id}/pc-members`)
      .then((data) =>
        setPcMemberIds((data ?? []).map(mapPCGroupMember).map((m) => m.pcId)),
      )
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
  const addablePcs = playerCharacters.filter(
    (p) => !pcMemberIds.includes(p.id),
  );
  const lider = npcs.find((n) => n.id === group.liderNpcId);
  return (
    <EntityDetail
      eyebrow={t("entityDetails.faccionesBreadcrumb")}
      backLabel={t("entityDetails.faccionesBreadcrumb")}
      onBack={onBack}
      title={group.name}
      accentColor="var(--crystal-faction-quest)"
      imageUrl={entityImageUrl("group", group.id, group.hasImage, imageVersion)}
      obsidianPath={group.obsidianPath}
      vaultName={vaultName}
      campaignId={campaignId}
      onEdit={onEdit}
      onDelete={onDelete}
      fields={[
        {
          label: t("common.description"),
          value: <MarkdownText text={group.description} />,
        },
        ...(group.alineacion
          ? [{ label: t("factionDetail.alignment"), value: group.alineacion }]
          : []),
        ...(lider
          ? [{ label: t("factionDetail.leader"), value: lider.name }]
          : []),
        {
          label: `${t("factionDetail.members")} (${members.length})`,
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
                      color={crystalColorFor(n.crystal)}
                      imageUrl={entityImageUrl(
                        "npc",
                        n.id,
                        n.hasImage,
                        imageVersion,
                      )}
                    />
                  </div>
                  <StatusPill status={n.status} />
                  <button
                    className="btn btn-secondary"
                    onClick={() => removeMember(n.id)}
                  >
                    {t("factionDetail.remove")}
                  </button>
                </div>
              ))}
              {members.length === 0 && (
                <span style={{ color: "var(--text-secondary)" }}>
                  {t("factionDetail.noMembers")}
                </span>
              )}
              {addableNpcs.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <select
                    className="npc-edit__select npc-edit__select--native"
                    value={addNpcId}
                    onChange={(e) => setAddNpcId(e.target.value)}
                  >
                    <option value="">
                      {t("factionDetail.addNpcPlaceholder")}
                    </option>
                    {addableNpcs.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={addMember}
                    disabled={!addNpcId}
                  >
                    {t("common.add")}
                  </button>
                </div>
              )}
            </div>
          ),
        },
        {
          label: `${t("factionDetail.players")} (${pcMembers.length})`,
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
                      role={`${t("playersList.playedBy")} ${p.playerName}`}
                      color="var(--crystal-npc)"
                      imageUrl={entityImageUrl(
                        "player-character",
                        p.id,
                        p.hasImage,
                        imageVersion,
                      )}
                    />
                  </div>
                  <StatusPill status={p.status} />
                  <button
                    className="btn btn-secondary"
                    onClick={() => removePcMember(p.id)}
                  >
                    {t("factionDetail.remove")}
                  </button>
                </div>
              ))}
              {pcMembers.length === 0 && (
                <span style={{ color: "var(--text-secondary)" }}>
                  {t("factionDetail.noPlayers")}
                </span>
              )}
              {addablePcs.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <select
                    className="npc-edit__select npc-edit__select--native"
                    value={addPcId}
                    onChange={(e) => setAddPcId(e.target.value)}
                  >
                    <option value="">
                      {t("factionDetail.addPlayerPlaceholder")}
                    </option>
                    {addablePcs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.characterName}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={addPcMember}
                    disabled={!addPcId}
                  >
                    {t("common.add")}
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
  imageVersion = 0,
}: {
  location: Location;
  allLocations: Location[];
  vaultName: string;
  campaignId: string;
  onBack: () => void;
  imageVersion?: number;
} & EditableProps) {
  const t = useT();
  const lang = useLang();
  const breadcrumb: Location[] = [];
  let current: Location | undefined = location;
  while (current) {
    breadcrumb.unshift(current);
    current = allLocations.find((l) => l.id === current!.parentId);
  }
  const children = allLocations.filter((l) => l.parentId === location.id);

  return (
    <EntityDetail
      eyebrow={t("entityDetails.locacionesBreadcrumb")}
      backLabel={t("entityDetails.locacionesBreadcrumb")}
      onBack={onBack}
      title={location.name}
      accentColor="var(--crystal-location)"
      imageUrl={entityImageUrl(
        "location",
        location.id,
        location.hasImage,
        imageVersion,
      )}
      subtitle={locationTypeLabel[lang][location.locationType]}
      obsidianPath={location.obsidianPath}
      vaultName={vaultName}
      campaignId={campaignId}
      onEdit={onEdit}
      onDelete={onDelete}
      fields={[
        {
          label: t("locationDetail.hierarchy"),
          value: breadcrumb.map((l) => l.name).join(" › "),
        },
        {
          label: t("common.description"),
          value: <MarkdownText text={location.description} />,
        },
        {
          label: `${t("locationDetail.subLocations")} (${children.length})`,
          value:
            children.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {children.map((c) => (
                  <div key={c.id}>
                    {c.name}{" "}
                    <span style={{ color: "var(--text-secondary)" }}>
                      · {locationTypeLabel[lang][c.locationType]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: "var(--text-secondary)" }}>
                {t("locationDetail.noSubLocations")}
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
  const t = useT();
  const priorityLabel = {
    1: t("questDetail.priorityHigh"),
    2: t("questDetail.priorityMedium"),
    3: t("questDetail.priorityLow"),
  } as const;
  return (
    <EntityDetail
      eyebrow={t("sidebar.quests")}
      backLabel={t("sidebar.quests")}
      onBack={onBack}
      title={quest.name}
      accentColor={crystalColor[quest.crystal]}
      status={<QuestStatusPill status={quest.status} />}
      onEdit={onEdit}
      onDelete={onDelete}
      fields={[
        {
          label: t("questDetail.hook"),
          value: <MarkdownText text={quest.hook} />,
        },
        {
          label: t("questDetail.priority"),
          value: priorityLabel[quest.priority],
        },
        ...(quest.notes
          ? [
              {
                label: t("questDetail.notes"),
                value: <MarkdownText text={quest.notes} />,
              },
            ]
          : []),
      ]}
    />
  );
}
