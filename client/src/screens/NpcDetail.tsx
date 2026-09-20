import { useEffect, useState } from "react";
import "./NpcDetail.css";
import {
  crystalColorFor,
  crystalLabelFor,
  questStatusColor,
  type Npc,
  type Quest,
} from "../data/domain";
import { CharacterSheet } from "../components/CharacterSheet";
import { EntityIdentity } from "../components/EntityIdentity";
import { StatusPill } from "../components/StatusPill";
import { Modal } from "../components/Modal";
import { openInObsidian } from "../lib/obsidian";
import { apiFetch } from "../lib/api";
import { entityImageUrl } from "../lib/images";
import { useT, useLang } from "../lib/i18n";
import { MarkdownText } from "../components/MarkdownText";
import type { CSSProperties } from "react";

interface NpcDetailProps {
  npc: Npc;
  npcs: Npc[];
  quests: Quest[];
  campaignId: string;
  vaultName: string;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
  imageVersion?: number;
}

export function NpcDetail({
  npc,
  npcs,
  quests,
  campaignId,
  vaultName,
  onEdit,
  onBack,
  onDelete,
  imageVersion = 0,
}: NpcDetailProps) {
  const t = useT();
  const lang = useLang();
  const color = crystalColorFor(npc.crystal);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteHtml, setNoteHtml] = useState<string | null>(null);

  function openNote() {
    setNoteOpen(true);
    setNoteHtml(null);
    if (!npc.obsidianPath) return;
    apiFetch<{ html: string }>(
      `/campaigns/${campaignId}/notes/render?path=${encodeURIComponent(npc.obsidianPath)}`,
    )
      .then((res) => setNoteHtml(res.html))
      .catch(() => setNoteHtml(null));
  }

  const [relations, setRelations] = useState<{ role: string; npcId: string }[]>(
    [],
  );

  useEffect(() => {
    apiFetch<{ to_npc_id: number; role: string }[]>(`/npcs/${npc.id}/relations`)
      .then((data) =>
        setRelations(
          (data ?? []).map((r) => ({
            role: r.role,
            npcId: String(r.to_npc_id),
          })),
        ),
      )
      .catch((err) => console.error("Error cargando vínculos:", err));
  }, [npc.id]);

  const links = relations
    .map((l) => ({ ...l, target: npcs.find((n) => n.id === l.npcId) }))
    .filter((l): l is typeof l & { target: Npc } => Boolean(l.target));
  const appearances = npc.appearances ?? [];
  const relatedQuests = quests.filter((q) =>
    (npc.relatedQuestIds ?? []).includes(q.id),
  );
  const locationParts = npc.location.split(" · ");

  return (
    <div className="card npc-detail">
      <div className="npc-detail__header">
        <div className="npc-detail__breadcrumb">
          <button className="npc-detail__breadcrumb-link" onClick={onBack}>
            {t("sidebar.npcs")}
          </button>
          <span>/</span>
          <span
            className="type-chip"
            style={{ "--c": color } as CSSProperties}
          >
            {crystalLabelFor(npc.crystal, lang)}
          </span>
        </div>
        <div className="npc-detail__identity">
          <EntityIdentity
            initials={npc.initials}
            name={npc.name}
            role={npc.role}
            color={color}
            size="header"
            imageUrl={entityImageUrl("npc", npc.id, npc.hasImage, imageVersion)}
          />
          <StatusPill status={npc.status} />
          <div className="npc-detail__header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => openInObsidian(vaultName, npc.obsidianPath)}
            >
              {t("entityDetail.openInObsidian")}
            </button>
            <button className="btn btn-secondary" onClick={openNote}>
              {t("entityDetail.viewRenderedNote")}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setSheetOpen(true)}
            >
              {t("npcDetail.viewSheet")}
            </button>
            <button className="btn btn-secondary" onClick={onDelete}>
              {t("entityDetail.deactivate")}
            </button>
            <button className="btn btn-primary" onClick={onEdit}>
              {t("common.edit")}
            </button>
          </div>
        </div>
      </div>

      <div className="npc-detail__body">
        <div className="npc-detail__col npc-detail__col--main">
          <span className="label">{t("common.description")}</span>
          <MarkdownText className="npc-detail__desc" text={npc.description} />
          {appearances.length > 0 && (
            <div className="npc-detail__stats">
              <div className="card npc-detail__stat">
                <span className="label">{t("npcDetail.firstAppearance")}</span>
                <div className="npc-detail__stat-value">{appearances[0]}</div>
              </div>
              <div className="card npc-detail__stat">
                <span className="label">{t("npcDetail.lastSeen")}</span>
                <div className="npc-detail__stat-value">
                  {appearances[appearances.length - 1]}
                </div>
              </div>
            </div>
          )}

          {links.length > 0 && (
            <>
              <span
                className="label"
                style={{ marginTop: 21, display: "block" }}
              >
                {t("npcDetail.links")}
              </span>
              <div className="npc-detail__links">
                {links.map((l) => (
                  <div
                    key={`${l.npcId}:${l.role}`}
                    className="card npc-detail__link"
                  >
                    <span className="npc-detail__link-role">{l.role}</span>
                    <span className="title-underline" style={{ flex: 1 }}>
                      <span className="npc-detail__link-name">
                        {l.target.name}{" "}
                        <span className="npc-detail__link-note">
                          · {l.target.role}
                        </span>
                      </span>
                      <span
                        className="title-underline__bar"
                        style={{ background: crystalColorFor(l.target.crystal) }}
                      />
                    </span>
                    <StatusPill status={l.target.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="npc-detail__col npc-detail__col--side">
          {entityImageUrl("npc", npc.id, npc.hasImage, imageVersion) && (
            <img
              className="npc-detail__portrait"
              src={entityImageUrl("npc", npc.id, npc.hasImage, imageVersion)}
              alt=""
            />
          )}
          <div>
            <span className="label">{t("npcList.colLocation")}</span>
            <div className="npc-detail__location">
              {locationParts.map((part, i) => (
                <span key={`${i}:${part}`}>
                  {i > 0 && <>{" ".repeat(i * 3)}└ </>}
                  {i === locationParts.length - 1 ? (
                    <span
                      style={{
                        color: "var(--crystal-location)",
                        fontWeight: 500,
                      }}
                    >
                      {part}
                    </span>
                  ) : (
                    part
                  )}
                  {i < locationParts.length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
          {appearances.length > 0 && (
            <div>
              <span className="label">{t("npcDetail.appearances")}</span>
              <div className="npc-detail__appearances">
                {appearances.map((a, i) => (
                  <span
                    key={`${i}:${a}`}
                    className={`npc-detail__appearance-chip${i === appearances.length - 1 ? " npc-detail__appearance-chip--active" : ""}`}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          {relatedQuests.length > 0 && (
            <div>
              <span className="label">{t("npcDetail.relatedQuests")}</span>
              {relatedQuests.map((q) => (
                <div key={q.id} className="card npc-detail__quest">
                  <span className="title-underline" style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: "var(--text-body)" }}>
                      {q.name}
                    </span>
                    <span
                      className="title-underline__bar"
                      style={{ background: "var(--crystal-faction-quest)" }}
                    />
                  </span>
                  <span
                    className="status-dot"
                    style={{ background: questStatusColor[q.status] }}
                  />
                </div>
              ))}
            </div>
          )}
          <div>
            <span className="label">{t("entityDetail.obsidianNote")}</span>
            <div className="entity-detail__obsidian">
              <span className="entity-detail__obsidian-path">
                {npc.obsidianPath}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => openInObsidian(vaultName, npc.obsidianPath)}
              >
                {t("entityDetail.openInObsidian")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {noteOpen && (
        <Modal title={npc.name} onClose={() => setNoteOpen(false)} size="large">
          {noteHtml ? (
            <div
              className="npc-detail__desc"
              dangerouslySetInnerHTML={{ __html: noteHtml }}
            />
          ) : (
            <MarkdownText className="npc-detail__desc" text={npc.description} />
          )}
        </Modal>
      )}

      {sheetOpen && (
        <Modal
          title={`${t("npcDetail.sheetPrefix")} · ${npc.name}`}
          onClose={() => setSheetOpen(false)}
          size="sheet"
        >
          <CharacterSheet attributes={npc.attributes} skills={npc.skills} />
        </Modal>
      )}
    </div>
  );
}
