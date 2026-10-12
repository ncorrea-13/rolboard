import { useState } from "react";
import "./NpcDetail.css";
import { type Item, type PlayerCharacter } from "../data/domain";
import { CharacterSheet } from "../components/CharacterSheet";
import { EntityIdentity } from "../components/EntityIdentity";
import { StatusPill } from "../components/StatusPill";
import { Modal } from "../components/Modal";
import { openInObsidian } from "../lib/obsidian";
import { apiFetch } from "../lib/api";
import { entityImageUrl } from "../lib/images";
import { useT } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import { Tabs } from "../components/Tabs";
import { Inventory } from "../components/Inventory";

type PlayerTab = "summary" | "history" | "progression" | "sheet" | "inventory";
const TAB_STORAGE_KEY = "rolboard.playerDetailTab";

function readStoredTab(): PlayerTab | null {
  try {
    const v = localStorage.getItem(TAB_STORAGE_KEY);
    return v === "summary" ||
      v === "history" ||
      v === "progression" ||
      v === "sheet" ||
      v === "inventory"
      ? v
      : null;
  } catch {
    return null;
  }
}

interface PlayerDetailProps {
  player: PlayerCharacter;
  campaignId: string;
  items: Item[];
  vaultName: string;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
  imageVersion?: number;
}

export function PlayerDetail({
  player,
  campaignId,
  items,
  vaultName,
  onEdit,
  onBack,
  onDelete,
  imageVersion = 0,
}: PlayerDetailProps) {
  const t = useT();
  const [tab, setTab] = useState<PlayerTab>(() => readStoredTab() ?? "summary");
  const [noteOpen, setNoteOpen] = useState<{
    title: string;
    fallback: string;
  } | null>(null);
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

  const hasSheet =
    Object.keys(player.attributes).length > 0 ||
    Object.keys(player.skills).length > 0 ||
    player.currentHp != null ||
    player.maxHp != null;
  const tabs: { key: PlayerTab; label: string }[] = [
    { key: "summary", label: t("playerDetail.tabSummary") },
  ];
  if (player.backstory || player.historiaPath)
    tabs.push({ key: "history", label: t("playerDetail.tabHistory") });
  if (player.progressionNotes || player.avancesPath)
    tabs.push({ key: "progression", label: t("playerDetail.tabProgression") });
  if (hasSheet) tabs.push({ key: "sheet", label: t("playerDetail.tabSheet") });
  tabs.push({ key: "inventory", label: t("playerDetail.tabInventory") });
  const activeTab = tabs.some((x) => x.key === tab) ? tab : "summary";

  function selectTab(next: PlayerTab) {
    setTab(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      return;
    }
  }

  return (
    <div className="card npc-detail">
      <div className="npc-detail__header">
        <div className="npc-detail__breadcrumb">
          <button className="npc-detail__breadcrumb-link" onClick={onBack}>
            {t("playerDetail.breadcrumb")}
          </button>
          <span>/</span>
          <span className="npc-detail__breadcrumb-type">
            {player.race}
            {player.class !== "—" ? ` · ${player.class}` : ""}
          </span>
        </div>
        <div className="npc-detail__identity">
          <EntityIdentity
            initials={player.characterName.slice(0, 2).toUpperCase()}
            name={player.characterName}
            role={`${t("playersList.playedBy")} ${player.playerName}`}
            color="var(--crystal-npc)"
            size="header"
            imageUrl={entityImageUrl(
              "player-character",
              player.id,
              player.hasImage,
              imageVersion,
            )}
          />
          <StatusPill status={player.status} />
          {(player.currentHp != null || player.maxHp != null) && (
            <span
              className="npc-detail__breadcrumb-type"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {player.currentHp ?? "—"} / {player.maxHp ?? "—"} HP
            </span>
          )}
          <div className="npc-detail__header-actions">
            <button className="btn btn-danger-outline" onClick={onDelete}>
              {t("entityDetail.deactivate")}
            </button>
            {player.obsidianPath && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => openInObsidian(vaultName, player.obsidianPath)}
                >
                  {t("entityDetail.openInObsidian")}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    openNote(player.obsidianPath, player.characterName, "")
                  }
                >
                  {t("entityDetail.viewRenderedNote")}
                </button>
              </>
            )}
            <button className="btn btn-primary" onClick={onEdit}>
              {t("common.edit")}
            </button>
          </div>
        </div>
      </div>

      <div className="npc-detail__body">
        <div className="npc-detail__col npc-detail__col--main">
          {tabs.length > 1 && (
            <Tabs tabs={tabs} active={activeTab} onChange={selectTab} />
          )}
          {activeTab === "summary" &&
            (player.description ? (
              <MarkdownText
                className="npc-detail__desc"
                text={player.description}
              />
            ) : (
              <span style={{ color: "var(--text-secondary)" }}>
                {t("playerDetail.emptyDescription")}
              </span>
            ))}
          {activeTab === "history" && (
            <>
              {player.historiaPath && (
                <div className="npc-detail__header-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      openNote(
                        player.historiaPath,
                        `${t("playerDetail.historyTitlePrefix")} — ${player.characterName}`,
                        player.backstory,
                      )
                    }
                  >
                    {t("playerDetail.viewFullBackstory")}
                  </button>
                </div>
              )}
              <MarkdownText
                className="npc-detail__desc"
                text={player.backstory}
              />
            </>
          )}
          {activeTab === "progression" && (
            <>
              {player.avancesPath && (
                <div className="npc-detail__header-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      openNote(
                        player.avancesPath,
                        `${t("playerDetail.progressTitlePrefix")} — ${player.characterName}`,
                        player.progressionNotes,
                      )
                    }
                  >
                    {t("playerDetail.viewProgression")}
                  </button>
                </div>
              )}
              <MarkdownText
                className="npc-detail__desc"
                text={player.progressionNotes}
              />
            </>
          )}
          {activeTab === "inventory" && (
            <Inventory
              kind="player-characters"
              ownerId={player.id}
              items={items}
            />
          )}
          {activeTab === "sheet" && (
            <CharacterSheet
              attributes={player.attributes}
              skills={player.skills}
              hp={{ current: player.currentHp, max: player.maxHp }}
            />
          )}
        </div>

        <div className="npc-detail__col npc-detail__col--side">
          {entityImageUrl(
            "player-character",
            player.id,
            player.hasImage,
            imageVersion,
          ) && (
            <img
              className="npc-detail__portrait"
              src={entityImageUrl(
                "player-character",
                player.id,
                player.hasImage,
                imageVersion,
              )}
              alt=""
            />
          )}
          {player.obsidianPath && (
            <div>
              <span className="label">{t("entityDetail.obsidianNote")}</span>
              <div className="entity-detail__obsidian">
                <span className="entity-detail__obsidian-path">
                  {player.obsidianPath}
                </span>
                <div className="entity-detail__obsidian-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      openInObsidian(vaultName, player.obsidianPath)
                    }
                  >
                    {t("entityDetail.openInObsidian")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {noteOpen && (
        <Modal
          title={noteOpen.title}
          onClose={() => setNoteOpen(null)}
          size="large"
        >
          {noteHtml ? (
            <div
              className="npc-detail__desc"
              dangerouslySetInnerHTML={{ __html: noteHtml }}
            />
          ) : (
            <MarkdownText
              className="npc-detail__desc"
              text={noteOpen.fallback}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
