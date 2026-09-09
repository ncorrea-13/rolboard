import { useState } from "react";
import "./NpcDetail.css";
import { crystalColor, type Npc, type PlayerCharacter } from "../data/mock";
import { EntityIdentity } from "../components/EntityIdentity";
import { StatusPill } from "../components/StatusPill";
import { Modal } from "../components/Modal";
import { openInObsidian } from "../lib/obsidian";

interface PlayerDetailProps {
  player: PlayerCharacter;
  npcs: Npc[];
  onEdit: () => void;
  onBack: () => void;
}

export function PlayerDetail({ player, npcs, onEdit, onBack }: PlayerDetailProps) {
  const [noteOpen, setNoteOpen] = useState(false);

  const links = (player.links ?? [])
    .map((l) => ({ ...l, target: npcs.find((n) => n.id === l.npcId) }))
    .filter((l): l is typeof l & { target: Npc } => Boolean(l.target));

  return (
    <div className="card npc-detail">
      <div className="npc-detail__header">
        <div className="npc-detail__breadcrumb">
          <button className="npc-detail__breadcrumb-link" onClick={onBack}>JUGADORES</button>
          <span>/</span>
          <span className="npc-detail__breadcrumb-type">{player.race}{player.class !== "—" ? ` · ${player.class}` : ""}</span>
        </div>
        <div className="npc-detail__identity">
          <EntityIdentity
            initials={player.characterName.slice(0, 2).toUpperCase()}
            name={player.characterName}
            role={`Jugado por ${player.playerName}`}
            color="var(--crystal-npc)"
            size="header"
          />
          <StatusPill status={player.status} />
          <div className="npc-detail__header-actions">
            <button className="btn btn-secondary" onClick={() => openInObsidian(player.obsidianPath)}>Abrir en Obsidian</button>
            <button className="btn btn-secondary" onClick={() => setNoteOpen(true)}>Ver nota renderizada</button>
            <button className="btn btn-primary" onClick={onEdit}>Editar</button>
          </div>
        </div>
      </div>

      <div className="npc-detail__body">
        <div className="npc-detail__col npc-detail__col--main">
          <span className="label">Trasfondo</span>
          <p className="npc-detail__desc">{player.backstory}</p>

          <span className="label" style={{ marginTop: 21, display: "block" }}>Notas de progresión</span>
          <p className="npc-detail__desc">{player.progressionNotes}</p>

          {links.length > 0 && (
            <>
              <span className="label" style={{ marginTop: 21, display: "block" }}>Vínculos</span>
              <div className="npc-detail__links">
                {links.map((l) => (
                  <div key={l.role} className="card npc-detail__link">
                    <span className="npc-detail__link-role">{l.role}</span>
                    <span className="title-underline" style={{ flex: 1 }}>
                      <span className="npc-detail__link-name">
                        {l.target.name} <span className="npc-detail__link-note">· {l.target.role}</span>
                      </span>
                      <span className="title-underline__bar" style={{ background: crystalColor[l.target.crystal] }} />
                    </span>
                    <StatusPill status={l.target.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="npc-detail__col npc-detail__col--side">
          {player.faction !== "—" && (
            <div>
              <span className="label">Facción</span>
              <div className="card npc-detail__faction">
                <span className="title-underline">
                  <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-body-strong)" }}>{player.faction}</span>
                  <span className="title-underline__bar" style={{ background: "var(--crystal-faction-quest)" }} />
                </span>
                <span className="npc-detail__faction-role">miembro</span>
              </div>
            </div>
          )}
          <div>
            <span className="label">Nota de Obsidian</span>
            <div className="entity-detail__obsidian">
              <span className="entity-detail__obsidian-path">{player.obsidianPath}</span>
              <button className="btn btn-secondary" onClick={() => openInObsidian(player.obsidianPath)}>Abrir en Obsidian</button>
            </div>
          </div>
        </div>
      </div>

      {noteOpen && (
        <Modal title={player.characterName} onClose={() => setNoteOpen(false)}>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 12 }}>
            Vista previa mockeada — el render real de la nota de Obsidian llega con el wiring a la API (endpoint
            <code> notes/render</code> ya implementado en el backend).
          </p>
          <p className="npc-detail__desc">{player.backstory}</p>
        </Modal>
      )}
    </div>
  );
}
