import { useState } from "react";
import "./NpcDetail.css";
import { crystalColor, type Npc, type PlayerCharacter } from "../data/domain";
import { EntityIdentity } from "../components/EntityIdentity";
import { StatusPill } from "../components/StatusPill";
import { Modal } from "../components/Modal";
import { openInObsidian } from "../lib/obsidian";
import { apiFetch } from "../lib/api";

interface PlayerDetailProps {
  player: PlayerCharacter;
  npcs: Npc[];
  campaignId: string;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
}

export function PlayerDetail({ player, npcs, campaignId, onEdit, onBack, onDelete }: PlayerDetailProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteHtml, setNoteHtml] = useState<string | null>(null);

  function openNote() {
    setNoteOpen(true);
    if (!player.obsidianPath) return;
    apiFetch<{ html: string }>(
      `/campaigns/${campaignId}/notes/render?path=${encodeURIComponent(player.obsidianPath)}`,
    )
      .then((res) => setNoteHtml(res.html))
      .catch(() => setNoteHtml(null));
  }

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
            <button className="btn btn-secondary" onClick={openNote}>Ver nota renderizada</button>
            <button className="btn btn-secondary" onClick={onDelete}>Dar de baja</button>
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
          {noteHtml ? (
            <div
              className="npc-detail__desc"
              dangerouslySetInnerHTML={{ __html: noteHtml }}
            />
          ) : (
            <p className="npc-detail__desc">{player.backstory}</p>
          )}
        </Modal>
      )}
    </div>
  );
}
