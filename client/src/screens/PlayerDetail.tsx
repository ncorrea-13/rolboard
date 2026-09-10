import { useState } from "react";
import "./NpcDetail.css";
import { type PlayerCharacter } from "../data/domain";
import { EntityIdentity } from "../components/EntityIdentity";
import { StatusPill } from "../components/StatusPill";
import { Modal } from "../components/Modal";
import { openInObsidian } from "../lib/obsidian";
import { apiFetch } from "../lib/api";

interface PlayerDetailProps {
  player: PlayerCharacter;
  campaignId: string;
  vaultName: string;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
}

export function PlayerDetail({ player, campaignId, vaultName, onEdit, onBack, onDelete }: PlayerDetailProps) {
  const [noteOpen, setNoteOpen] = useState<{ title: string; fallback: string } | null>(null);
  const [noteHtml, setNoteHtml] = useState<string | null>(null);

  function openNote(path: string | undefined, title: string, fallback: string) {
    setNoteOpen({ title, fallback });
    setNoteHtml(null);
    if (!path) return;
    apiFetch<{ html: string }>(
      `/campaigns/${campaignId}/notes/render?path=${encodeURIComponent(path)}`,
    )
      .then((res) => setNoteHtml(res.html))
      .catch(() => setNoteHtml(null));
  }

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
            <button className="btn btn-secondary" onClick={() => openInObsidian(vaultName, player.obsidianPath)}>Abrir en Obsidian</button>
            <button className="btn btn-secondary" onClick={() => openNote(player.obsidianPath, player.characterName, "")}>Ver ficha</button>
            <button className="btn btn-secondary" onClick={onDelete}>Dar de baja</button>
            <button className="btn btn-primary" onClick={onEdit}>Editar</button>
          </div>
        </div>
      </div>

      <div className="npc-detail__body">
        <div className="npc-detail__col npc-detail__col--main">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="label">Trasfondo</span>
            {player.historiaPath && (
              <button
                className="btn btn-secondary"
                onClick={() => openNote(player.historiaPath, `Historia — ${player.characterName}`, player.backstory)}
              >
                Ver historia completa
              </button>
            )}
          </div>
          <p className="npc-detail__desc">{player.backstory}</p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 21 }}>
            <span className="label">Notas de progresión</span>
            {player.avancesPath && (
              <button
                className="btn btn-secondary"
                onClick={() => openNote(player.avancesPath, `Avances — ${player.characterName}`, player.progressionNotes)}
              >
                Ver avances
              </button>
            )}
          </div>
          <p className="npc-detail__desc">{player.progressionNotes}</p>
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
              <button className="btn btn-secondary" onClick={() => openInObsidian(vaultName, player.obsidianPath)}>Abrir en Obsidian</button>
            </div>
          </div>
        </div>
      </div>

      {noteOpen && (
        <Modal title={noteOpen.title} onClose={() => setNoteOpen(null)} size="large">
          {noteHtml ? (
            <div
              className="npc-detail__desc"
              dangerouslySetInnerHTML={{ __html: noteHtml }}
            />
          ) : (
            <p className="npc-detail__desc">{noteOpen.fallback}</p>
          )}
        </Modal>
      )}
    </div>
  );
}
