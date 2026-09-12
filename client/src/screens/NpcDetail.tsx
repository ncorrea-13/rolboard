import { useEffect, useState } from "react";
import "./NpcDetail.css";
import { crystalColor, type Npc, type Quest } from "../data/domain";
import { CharacterSheet } from "../components/CharacterSheet";
import { EntityIdentity } from "../components/EntityIdentity";
import { StatusPill } from "../components/StatusPill";
import { Modal } from "../components/Modal";
import { openInObsidian } from "../lib/obsidian";
import { apiFetch } from "../lib/api";

interface NpcDetailProps {
  npc: Npc;
  npcs: Npc[];
  quests: Quest[];
  campaignId: string;
  vaultName: string;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
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
}: NpcDetailProps) {
  const color = crystalColor[npc.crystal];
  const [sheetOpen, setSheetOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteHtml, setNoteHtml] = useState<string | null>(null);

  function openNote() {
    setNoteOpen(true);
    if (!npc.obsidianPath) return;
    apiFetch<{ html: string }>(
      `/campaigns/${campaignId}/notes/render?path=${encodeURIComponent(npc.obsidianPath)}`,
    )
      .then((res) => setNoteHtml(res.html))
      .catch(() => setNoteHtml(null));
  }

  const [relations, setRelations] = useState<{ role: string; npcId: string }[]>([]);

  useEffect(() => {
    apiFetch<{ to_npc_id: number; role: string }[]>(`/npcs/${npc.id}/relations`)
      .then((data) =>
        setRelations((data ?? []).map((r) => ({ role: r.role, npcId: String(r.to_npc_id) }))),
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
            NPCS
          </button>
          <span>/</span>
          <span className="npc-detail__breadcrumb-type">
            <span
              className="npc-list__type-mark"
              style={{
                background: color,
                width: 3,
                height: 9,
                borderRadius: 2,
              }}
            />
            {npc.crystalLabel}
          </span>
        </div>
        <div className="npc-detail__identity">
          <EntityIdentity
            initials={npc.initials}
            name={npc.name}
            role={npc.role}
            color={color}
            size="header"
          />
          <StatusPill status={npc.status} />
          <div className="npc-detail__header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => openInObsidian(vaultName, npc.obsidianPath)}
            >
              Abrir en Obsidian
            </button>
            <button
              className="btn btn-secondary"
              onClick={openNote}
            >
              Ver nota renderizada
            </button>
            <button className="btn btn-secondary" onClick={() => setSheetOpen(true)}>
              Ver ficha
            </button>
            <button className="btn btn-secondary" onClick={onDelete}>
              Dar de baja
            </button>
            <button className="btn btn-primary" onClick={onEdit}>
              Editar
            </button>
          </div>
        </div>
      </div>

      <div className="npc-detail__body">
        <div className="npc-detail__col npc-detail__col--main">
          <span className="label">Descripción</span>
          <p className="npc-detail__desc">{npc.description}</p>
          {appearances.length > 0 && (
            <div className="npc-detail__stats">
              <div className="card npc-detail__stat">
                <span className="label">Primera aparición</span>
                <div className="npc-detail__stat-value">{appearances[0]}</div>
              </div>
              <div className="card npc-detail__stat">
                <span className="label">Visto por última vez</span>
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
                Vínculos
              </span>
              <div className="npc-detail__links">
                {links.map((l) => (
                  <div key={l.role} className="card npc-detail__link">
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
                        style={{ background: crystalColor[l.target.crystal] }}
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
          <div>
            <span className="label">Ubicación actual</span>
            <div className="npc-detail__location">
              {locationParts.map((part, i) => (
                <span key={part}>
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
              <span className="label">Apariciones</span>
              <div className="npc-detail__appearances">
                {appearances.map((a, i) => (
                  <span
                    key={a}
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
              <span className="label">Quests relacionadas</span>
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
                    style={{ background: "var(--status-alive)" }}
                  />
                </div>
              ))}
            </div>
          )}
          <div>
            <span className="label">Nota de Obsidian</span>
            <div className="entity-detail__obsidian">
              <span className="entity-detail__obsidian-path">
                {npc.obsidianPath}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => openInObsidian(vaultName, npc.obsidianPath)}
              >
                Abrir en Obsidian
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
            <p className="npc-detail__desc">{npc.description}</p>
          )}
        </Modal>
      )}

      {sheetOpen && (
        <Modal title={`Ficha · ${npc.name}`} onClose={() => setSheetOpen(false)} size="sheet">
          <CharacterSheet attributes={npc.attributes} skills={npc.skills} />
        </Modal>
      )}
    </div>
  );
}
