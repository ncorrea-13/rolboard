import { EntityDetail } from "../components/EntityDetail";
import { StatusPill } from "../components/StatusPill";
import { QuestStatusPill } from "../components/StatusPill";
import { ArcStatusPill } from "../components/StatusPill";
import { EntityIdentity } from "../components/EntityIdentity";
import {
  crystalColor,
  locationTypeLabel,
  type Arc,
  type Group,
  type Location,
  type Quest,
  type Npc,
} from "../data/mock";

interface EditableProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function ArcDetail({
  arc,
  onBack,
  onEdit,
  onDelete,
}: { arc: Arc; onBack: () => void } & EditableProps) {
  return (
    <EntityDetail
      eyebrow="ARCOS"
      backLabel="ARCOS"
      onBack={onBack}
      title={arc.label}
      status={<ArcStatusPill status={arc.status} />}
      obsidianPath={arc.obsidianPath}
      onEdit={onEdit}
      onDelete={onDelete}
      fields={[
        { label: "Resumen", value: arc.summary },
        { label: "Progreso", value: arc.meta },
        {
          label: `Sesiones (${arc.sessions.length})`,
          value: (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {arc.sessions.map((s) => (
                <div key={s.n} style={{ display: "flex", gap: 12 }}>
                  <span
                    style={{
                      font: "500 13px var(--font-mono)",
                      color: "var(--accent-sky)",
                      width: 40,
                    }}
                  >
                    {s.n}
                  </span>
                  <span style={{ flex: 1 }}>{s.text}</span>
                  <span
                    style={{
                      font: "400 12px var(--font-mono)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s.date}
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
  onBack,
  onSelectNpc,
  onEdit,
  onDelete,
}: {
  group: Group;
  npcs: Npc[];
  onBack: () => void;
  onSelectNpc: (id: string) => void;
} & EditableProps) {
  const members = npcs.filter((n) => n.faction === group.name);
  return (
    <EntityDetail
      eyebrow="FACCIONES"
      backLabel="FACCIONES"
      onBack={onBack}
      title={group.name}
      accentColor="var(--crystal-faction-quest)"
      obsidianPath={group.obsidianPath}
      onEdit={onEdit}
      onDelete={onDelete}
      fields={[
        { label: "Descripción", value: group.description },
        {
          label: `Miembros (${members.length} de ${group.memberCount} conocidos)`,
          value:
            members.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {members.map((n) => (
                  <div
                    key={n.id}
                    className="list-page__row"
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectNpc(n.id)}
                  >
                    <EntityIdentity
                      initials={n.initials}
                      name={n.name}
                      role={n.role}
                      color={crystalColor[n.crystal]}
                    />
                    <StatusPill status={n.status} />
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: "var(--text-secondary)" }}>
                Sin NPCs indexados con esta facción todavía.
              </span>
            ),
        },
      ]}
    />
  );
}

export function LocationDetail({
  location,
  allLocations,
  onBack,
  onEdit,
  onDelete,
}: {
  location: Location;
  allLocations: Location[];
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
        { label: "Gancho", value: quest.hook },
        { label: "Prioridad", value: priorityLabel[quest.priority] },
      ]}
    />
  );
}

