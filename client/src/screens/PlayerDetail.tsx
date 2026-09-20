import { useState } from "react";
import "./NpcDetail.css";
import { type PlayerCharacter } from "../data/domain";
import { CharacterSheet } from "../components/CharacterSheet";
import { EntityIdentity } from "../components/EntityIdentity";
import { StatusPill } from "../components/StatusPill";
import { Modal } from "../components/Modal";
import { openInObsidian } from "../lib/obsidian";
import { apiFetch } from "../lib/api";
import { entityImageUrl } from "../lib/images";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";

interface PlayerDetailProps {
  player: PlayerCharacter;
  campaignId: string;
  vaultName: string;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
  imageVersion?: number;
}

export function PlayerDetail({ player, campaignId, vaultName, onEdit, onBack, onDelete, imageVersion = 0 }: PlayerDetailProps) {
  const t = useT();
  const [sheetOpen, setSheetOpen] = useState(false);
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
          <button className="npc-detail__breadcrumb-link" onClick={onBack}>{t("playerDetail.breadcrumb")}</button>
          <span>/</span>
          <span className="npc-detail__breadcrumb-type">{player.race}{player.class !== "—" ? ` · ${player.class}` : ""}</span>
        </div>
        <div className="npc-detail__identity">
          <EntityIdentity
            initials={player.characterName.slice(0, 2).toUpperCase()}
            name={player.characterName}
            role={`${t("playersList.playedBy")} ${player.playerName}`}
            color="var(--crystal-npc)"
            size="header"
            imageUrl={entityImageUrl("player-character", player.id, player.hasImage, imageVersion)}
          />
          <StatusPill status={player.status} />
          {(player.currentHp != null || player.maxHp != null) && (
            <span className="npc-detail__breadcrumb-type" style={{ fontFamily: "var(--font-mono)" }}>
              {player.currentHp ?? "—"} / {player.maxHp ?? "—"} HP
            </span>
          )}
          <div className="npc-detail__header-actions">
            <button className="btn btn-secondary" onClick={() => openInObsidian(vaultName, player.obsidianPath)}>{t("entityDetail.openInObsidian")}</button>
            <button className="btn btn-secondary" onClick={() => openNote(player.obsidianPath, player.characterName, "")}>{t("entityDetail.viewRenderedNote")}</button>
            <button className="btn btn-secondary" onClick={() => setSheetOpen(true)}>{t("npcDetail.viewSheet")}</button>
            <button className="btn btn-secondary" onClick={onDelete}>{t("entityDetail.deactivate")}</button>
            <button className="btn btn-primary" onClick={onEdit}>{t("common.edit")}</button>
          </div>
        </div>
      </div>

      <div className="npc-detail__body">
        <div className="npc-detail__col npc-detail__col--main">
          {(player.historiaPath || player.avancesPath) && (
            <div className="npc-detail__header-actions">
              {player.historiaPath && (
                <button
                  className="btn btn-secondary"
                  onClick={() => openNote(player.historiaPath, `${t("playerDetail.historyTitlePrefix")} — ${player.characterName}`, player.backstory)}
                >
                  {t("playerDetail.viewFullBackstory")}
                </button>
              )}
              {player.avancesPath && (
                <button
                  className="btn btn-secondary"
                  onClick={() => openNote(player.avancesPath, `${t("playerDetail.progressTitlePrefix")} — ${player.characterName}`, player.progressionNotes)}
                >
                  {t("playerDetail.viewProgression")}
                </button>
              )}
            </div>
          )}
          {player.backstory && (
            <>
              <span className="label">{t("playerDetail.backstory")}</span>
              <MarkdownText className="npc-detail__desc" text={player.backstory} />
            </>
          )}
          {player.progressionNotes && (
            <>
              <span className="label" style={{ marginTop: 21, display: "block" }}>{t("playerDetail.progressionNotes")}</span>
              <MarkdownText className="npc-detail__desc" text={player.progressionNotes} />
            </>
          )}
        </div>

        <div className="npc-detail__col npc-detail__col--side">
          {entityImageUrl("player-character", player.id, player.hasImage, imageVersion) && (
            <img
              className="npc-detail__portrait"
              src={entityImageUrl("player-character", player.id, player.hasImage, imageVersion)}
              alt=""
            />
          )}
          <div>
            <span className="label">{t("entityDetail.obsidianNote")}</span>
            <div className="entity-detail__obsidian">
              <span className="entity-detail__obsidian-path">{player.obsidianPath}</span>
              <div className="entity-detail__obsidian-actions">
                <button className="btn btn-secondary" onClick={() => openInObsidian(vaultName, player.obsidianPath)}>{t("entityDetail.openInObsidian")}</button>
              </div>
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
            <MarkdownText className="npc-detail__desc" text={noteOpen.fallback} />
          )}
        </Modal>
      )}

      {sheetOpen && (
        <Modal title={`${t("npcDetail.sheetPrefix")} · ${player.characterName}`} onClose={() => setSheetOpen(false)} size="sheet">
          <CharacterSheet
            attributes={player.attributes}
            skills={player.skills}
            hp={{ current: player.currentHp, max: player.maxHp }}
          />
        </Modal>
      )}
    </div>
  );
}
