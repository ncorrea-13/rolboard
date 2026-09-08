import "./NpcDetail.css";
import { crystalColor, type Npc } from "../data/mock";
import { EntityIdentity } from "../components/EntityIdentity";
import { StatusPill } from "../components/StatusPill";

const links = [
  { role: "VINCULADO", name: "Ishara-nal", note: "spren · pacto no revelado", status: "alive" as const, color: "var(--crystal-spren)" },
  { role: "ALIADO", name: "Threnn el Contable", note: "le debe favores", status: "alive" as const, color: "var(--crystal-npc)" },
  { role: "RIVAL", name: "Maestro Corvain", note: "deuda impaga", status: "dead" as const, color: "var(--crystal-npc)" },
];

interface NpcDetailProps {
  npc: Npc;
  onEdit: () => void;
  onBack: () => void;
}

export function NpcDetail({ npc, onEdit, onBack }: NpcDetailProps) {
  const color = crystalColor[npc.crystal];

  return (
    <div className="card npc-detail">
      <div className="npc-detail__header">
        <div className="npc-detail__breadcrumb">
          <button className="npc-detail__breadcrumb-link" onClick={onBack}>NPCS</button>
          <span>/</span>
          <span className="npc-detail__breadcrumb-type">
            <span className="npc-list__type-mark" style={{ background: color, width: 3, height: 9, borderRadius: 2 }} />
            {npc.crystalLabel}
          </span>
        </div>
        <div className="npc-detail__identity">
          <EntityIdentity initials={npc.initials} name={npc.name} role={npc.role} color={color} size="header" />
          <StatusPill status={npc.status} />
          <div className="npc-detail__header-actions">
            <button className="btn btn-secondary">Abrir en Obsidian</button>
            <button className="btn btn-secondary">Ver nota renderizada</button>
            <button className="btn btn-primary" onClick={onEdit}>Editar</button>
          </div>
        </div>
      </div>

      <div className="npc-detail__body">
        <div className="npc-detail__col npc-detail__col--main">
          <span className="label">Descripción</span>
          <p className="npc-detail__desc">{npc.description}</p>
          <div className="npc-detail__stats">
            <div className="card npc-detail__stat">
              <span className="label">Primera aparición</span>
              <div className="npc-detail__stat-value">Sesión 3 · 28 jun</div>
            </div>
            <div className="card npc-detail__stat">
              <span className="label">Visto por última vez</span>
              <div className="npc-detail__stat-value">Sesión 7 · 24 ago</div>
            </div>
          </div>

          <span className="label" style={{ marginTop: 21, display: "block" }}>Vínculos</span>
          <div className="npc-detail__links">
            {links.map((l) => (
              <div key={l.role} className="card npc-detail__link">
                <span className="npc-detail__link-role">{l.role}</span>
                <span className="title-underline" style={{ flex: 1 }}>
                  <span className="npc-detail__link-name">
                    {l.name} <span className="npc-detail__link-note">· {l.note}</span>
                  </span>
                  <span className="title-underline__bar" style={{ background: l.color }} />
                </span>
                <StatusPill status={l.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="npc-detail__col npc-detail__col--side">
          <div>
            <span className="label">Ubicación actual</span>
            <div className="npc-detail__location">
              Roshar
              <br />
              &nbsp;└ Alethkar
              <br />
              &nbsp;&nbsp;&nbsp;└ Kholinar
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ <span style={{ color: "var(--crystal-location)", fontWeight: 500 }}>Templo del Muelle</span>
            </div>
          </div>
          <div>
            <span className="label">Facción</span>
            <div className="card npc-detail__faction">
              <span className="title-underline">
                <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-body-strong)" }}>Los Vigías de la Grieta</span>
                <span className="title-underline__bar" style={{ background: "var(--crystal-faction-quest)" }} />
              </span>
              <span className="npc-detail__faction-role">miembro</span>
            </div>
          </div>
          <div>
            <span className="label">Apariciones</span>
            <div className="npc-detail__appearances">
              <span className="npc-detail__appearance-chip">S03</span>
              <span className="npc-detail__appearance-chip">S05</span>
              <span className="npc-detail__appearance-chip npc-detail__appearance-chip--active">S07</span>
            </div>
          </div>
          <div>
            <span className="label">Quests relacionadas</span>
            <div className="card npc-detail__quest">
              <span className="title-underline" style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: "var(--text-body)" }}>Sellar la fisura</span>
                <span className="title-underline__bar" style={{ background: "var(--crystal-faction-quest)" }} />
              </span>
              <span className="status-dot" style={{ background: "var(--status-alive)" }} />
            </div>
          </div>
          <div>
            <span className="label">Nota de Obsidian</span>
            <div className="entity-detail__obsidian">
              <span className="entity-detail__obsidian-path">{npc.obsidianPath}</span>
              <button className="btn btn-secondary">Abrir en Obsidian</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
