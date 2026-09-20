import { useState } from "react";
import "./NpcEdit.css";
import {
  statusLabel,
  statusColor,
  statusDotColor,
  type PlayerCharacter,
  type StatMap,
  type StatusKind,
} from "../data/domain";
import { SkillsEditor } from "../components/SkillsEditor";
import { ImageUploadField } from "../components/ImageUploadField";
import { entityImageUrl } from "../lib/images";
import { useT, useLang } from "../lib/i18n";

const statusOptions: StatusKind[] = ["alive", "missing", "dead", "paused"];

interface PlayerEditProps {
  player: PlayerCharacter;
  onSave: (patch: Partial<PlayerCharacter>) => void;
  onDiscard: () => void;
  imageVersion?: number;
  onUploadImage?: (file: File) => Promise<void>;
  onRemoveImage?: () => Promise<void>;
}

export function PlayerEdit({
  player,
  onSave,
  onDiscard,
  imageVersion = 0,
  onUploadImage,
  onRemoveImage,
}: PlayerEditProps) {
  const t = useT();
  const lang = useLang();
  const [playerName, setPlayerName] = useState(player.playerName);
  const [characterName, setCharacterName] = useState(player.characterName);
  const [race, setRace] = useState(player.race);
  const [charClass, setCharClass] = useState(player.class);
  const [status, setStatus] = useState<StatusKind>(player.status);
  const [backstory, setBackstory] = useState(player.backstory);
  const [progressionNotes, setProgressionNotes] = useState(
    player.progressionNotes,
  );
  const [attributes, setAttributes] = useState<StatMap>(player.attributes);
  const [skills, setSkills] = useState<StatMap>(player.skills);
  const [currentHp, setCurrentHp] = useState<number | undefined>(
    player.currentHp,
  );
  const [maxHp, setMaxHp] = useState<number | undefined>(player.maxHp);

  const dirty =
    playerName !== player.playerName ||
    characterName !== player.characterName ||
    race !== player.race ||
    charClass !== player.class ||
    status !== player.status ||
    backstory !== player.backstory ||
    progressionNotes !== player.progressionNotes ||
    JSON.stringify(attributes) !== JSON.stringify(player.attributes) ||
    JSON.stringify(skills) !== JSON.stringify(player.skills) ||
    currentHp !== player.currentHp ||
    maxHp !== player.maxHp;

  function handleSave() {
    onSave({
      playerName,
      characterName,
      race,
      class: charClass,
      status,
      backstory,
      progressionNotes,
      attributes,
      skills,
      currentHp,
      maxHp,
    });
  }

  const missingRace = race.trim() === "";

  return (
    <div className="card npc-edit">
      <div
        className="npc-edit__bar"
        style={{ boxShadow: "inset 4px 0 0 var(--accent-flame)" }}
      >
        <div className="npc-edit__bar-left">
          <span
            className="status-dot"
            style={{ background: "var(--accent-flame)" }}
          />
          <span
            style={{
              fontWeight: 500,
              fontSize: 13.5,
              color: "var(--text-primary)",
            }}
          >
            {player.id
              ? `${t("common.editing")} · ${player.characterName}`
              : t("playerEdit.new")}
          </span>
          {dirty && (
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {t("common.unsavedChanges")}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onDiscard}>
            {t("common.discard")}
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {t("common.save")}
          </button>
        </div>
      </div>

      <div className="npc-edit__body">
        <div className="npc-edit__col">
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">{t("playerEdit.characterName")}</span>
              <input
                className="npc-edit__input npc-edit__input--focus"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
              />
            </div>
            <div>
              <span className="label">{t("common.status")}</span>
              <select
                className="npc-edit__select npc-edit__select--native"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusKind)}
                style={{ color: statusColor[status] }}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[lang][s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="label">{t("playerEdit.player")}</span>
            <input
              className="npc-edit__input"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          <div className="npc-edit__grid-2">
            <div>
              <span className="label">{t("playerEdit.race")}</span>
              <input
                className="npc-edit__input"
                value={race}
                onChange={(e) => setRace(e.target.value)}
              />
            </div>
            <div>
              <span className="label">{t("playerEdit.class")}</span>
              <input
                className="npc-edit__input"
                value={charClass}
                onChange={(e) => setCharClass(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span className="label">
              {t("playerDetail.backstory")} {t("common.supportsMarkdown")}
            </span>
            <textarea
              className="npc-edit__textarea"
              value={backstory}
              onChange={(e) => setBackstory(e.target.value)}
            />
          </div>

          <div>
            <span className="label">
              {t("playerDetail.progressionNotes")}{" "}
              {t("common.supportsMarkdown")}
            </span>
            <textarea
              className="npc-edit__textarea"
              value={progressionNotes}
              onChange={(e) => setProgressionNotes(e.target.value)}
            />
          </div>

          <SkillsEditor
            label={t("characterSheet.attributes")}
            value={attributes}
            onChange={setAttributes}
          />
          <SkillsEditor
            label={t("characterSheet.skills")}
            value={skills}
            onChange={setSkills}
          />
        </div>

        <div className="npc-edit__col">
          {player.id && onUploadImage && onRemoveImage && (
            <ImageUploadField
              label={t("npcEdit.portrait")}
              imageUrl={entityImageUrl(
                "player-character",
                player.id,
                player.hasImage,
                imageVersion,
              )}
              onUpload={onUploadImage}
              onRemove={onRemoveImage}
            />
          )}
          <div className="npc-edit__grid-2">
            <div>
              <span className="label">{t("playerEdit.currentHp")}</span>
              <input
                className="npc-edit__input"
                type="number"
                value={currentHp ?? ""}
                onChange={(e) =>
                  setCurrentHp(
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </div>
            <div>
              <span className="label">{t("playerEdit.maxHp")}</span>
              <input
                className="npc-edit__input"
                type="number"
                value={maxHp ?? ""}
                onChange={(e) =>
                  setMaxHp(
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </div>
          </div>
          <div>
            <span className="label">{t("entityDetail.obsidianNote")}</span>
            <div
              className="npc-edit__select"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}
            >
              {player.obsidianPath}
            </div>
          </div>
          {(status === "dead" || missingRace) && (
            <div
              className="card npc-edit__warning"
              style={{ boxShadow: "inset 3px 0 0 var(--status-dead)" }}
            >
              <div className="npc-edit__warning-title">
                <span
                  className="status-dot"
                  style={{ background: statusDotColor[status] }}
                />
                {status === "dead"
                  ? t("playerEdit.markedDead")
                  : t("playerEdit.missingRace")}
              </div>
              <div className="npc-edit__warning-body">
                {t("npcEdit.warningBody")}
              </div>
            </div>
          )}
          <div className="npc-edit__note">{t("playerEdit.note")}</div>
        </div>
      </div>
    </div>
  );
}
