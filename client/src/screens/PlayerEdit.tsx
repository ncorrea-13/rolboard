import { useState } from "react";
import "./NpcEdit.css";
import {
  statusLabel,
  statusColor,
  statusDotColor,
  type PlayerCharacter,
  type StatusKind,
  type Group,
} from "../data/domain";

const statusOptions: StatusKind[] = ["alive", "missing", "dead", "paused"];

interface PlayerEditProps {
  player: PlayerCharacter;
  groups: Group[];
  onSave: (patch: Partial<PlayerCharacter>) => void;
  onDiscard: () => void;
}

export function PlayerEdit({ player, groups, onSave, onDiscard }: PlayerEditProps) {
  const [playerName, setPlayerName] = useState(player.playerName);
  const [characterName, setCharacterName] = useState(player.characterName);
  const [race, setRace] = useState(player.race);
  const [charClass, setCharClass] = useState(player.class);
  const [status, setStatus] = useState<StatusKind>(player.status);
  const [faction, setFaction] = useState(player.faction);
  const [backstory, setBackstory] = useState(player.backstory);
  const [progressionNotes, setProgressionNotes] = useState(player.progressionNotes);

  const dirty =
    playerName !== player.playerName ||
    characterName !== player.characterName ||
    race !== player.race ||
    charClass !== player.class ||
    status !== player.status ||
    faction !== player.faction ||
    backstory !== player.backstory ||
    progressionNotes !== player.progressionNotes;

  function handleSave() {
    onSave({ playerName, characterName, race, class: charClass, status, faction, backstory, progressionNotes });
  }

  const missingRace = race.trim() === "";

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--accent-flame)" }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: "var(--accent-flame)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            {player.id ? `Editando · ${player.characterName}` : "Nuevo personaje"}
          </span>
          {dirty && (
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>cambios sin guardar</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onDiscard}>Descartar</button>
          <button className="btn btn-primary" onClick={handleSave}>Guardar</button>
        </div>
      </div>

      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">Nombre del personaje</span>
              <input
                className="npc-edit__input npc-edit__input--focus"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
              />
            </div>
            <div>
              <span className="label">Status</span>
              <select
                className="npc-edit__select npc-edit__select--native"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusKind)}
                style={{ color: statusColor[status] }}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="label">Jugador</span>
            <input className="npc-edit__input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
          </div>

          <div className="npc-edit__grid-2">
            <div>
              <span className="label">Raza</span>
              <input className="npc-edit__input" value={race} onChange={(e) => setRace(e.target.value)} />
            </div>
            <div>
              <span className="label">Clase</span>
              <input className="npc-edit__input" value={charClass} onChange={(e) => setCharClass(e.target.value)} />
            </div>
          </div>

          <div>
            <span className="label">Trasfondo</span>
            <textarea className="npc-edit__textarea" value={backstory} onChange={(e) => setBackstory(e.target.value)} />
          </div>

          <div>
            <span className="label">Notas de progresión</span>
            <textarea className="npc-edit__textarea" value={progressionNotes} onChange={(e) => setProgressionNotes(e.target.value)} />
          </div>

        </div>

        <div className="npc-edit__col">
          <div>
            <span className="label">Facción</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              style={{ borderBottom: "2px solid var(--crystal-faction-quest)" }}
              value={faction}
              onChange={(e) => setFaction(e.target.value)}
            >
              <option value="—">— sin facción —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Nota de Obsidian</span>
            <div className="npc-edit__select" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
              {player.obsidianPath}
            </div>
          </div>
          {(status === "dead" || missingRace) && (
            <div className="card npc-edit__warning" style={{ boxShadow: "inset 3px 0 0 var(--status-dead)" }}>
              <div className="npc-edit__warning-title">
                <span className="status-dot" style={{ background: statusDotColor[status] }} />
                {status === "dead" ? "Personaje marcado como muerto" : "Falta definir la raza"}
              </div>
              <div className="npc-edit__warning-body">Podés guardar igual; el campo queda marcado como incompleto en la ficha.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
