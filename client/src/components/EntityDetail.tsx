import { useState, type ReactNode } from "react";
import "./EntityDetail.css";
import "../screens/NpcDetail.css";
import { openInObsidian } from "../lib/obsidian";
import { apiFetch } from "../lib/api";
import { Modal } from "./Modal";

export interface DetailField {
  label: string;
  value: ReactNode;
}

interface EntityDetailProps {
  eyebrow: string;
  backLabel: string;
  onBack: () => void;
  title: string;
  subtitle?: string;
  accentColor?: string;
  status?: ReactNode;
  fields: DetailField[];
  obsidianPath?: string;
  vaultName?: string;
  campaignId?: string;
  extraActions?: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EntityDetail({
  eyebrow,
  backLabel,
  onBack,
  title,
  subtitle,
  accentColor,
  status,
  fields,
  obsidianPath,
  vaultName,
  campaignId,
  extraActions,
  onEdit,
  onDelete,
}: EntityDetailProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteHtml, setNoteHtml] = useState<string | null>(null);

  function openNote() {
    setNoteOpen(true);
    setNoteHtml(null);
    if (!campaignId || !obsidianPath) return;
    apiFetch<{ html: string }>(
      `/campaigns/${campaignId}/notes/render?path=${encodeURIComponent(obsidianPath)}`,
    )
      .then((res) => setNoteHtml(res.html))
      .catch(() => setNoteHtml(null));
  }
  return (
    <div className="card entity-detail">
      <div className="entity-detail__header">
        <div className="entity-detail__breadcrumb">
          <button className="entity-detail__breadcrumb-link" onClick={onBack}>
            {backLabel}
          </button>
          <span>/</span>
          <span>{eyebrow}</span>
        </div>
        <div className="entity-detail__title-row">
          {accentColor ? (
            <span className="title-underline">
              <span className="display" style={{ fontSize: 22 }}>
                {title}
              </span>
              <span
                className="title-underline__bar"
                style={{ background: accentColor }}
              />
            </span>
          ) : (
            <span className="display" style={{ fontSize: 22 }}>
              {title}
            </span>
          )}
          {status}
          {(extraActions || onEdit || onDelete) && (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              {extraActions}
              {onEdit && (
                <button className="btn btn-secondary" onClick={onEdit}>
                  Editar
                </button>
              )}
              {onDelete && (
                <button className="btn btn-secondary" onClick={onDelete}>
                  Dar de baja
                </button>
              )}
            </div>
          )}
        </div>
        {subtitle && <div className="entity-detail__subtitle">{subtitle}</div>}
      </div>
      <div className="entity-detail__fields">
        {fields.map((f) => (
          <div key={f.label}>
            <span className="label">{f.label}</span>
            <div className="entity-detail__field-value">{f.value}</div>
          </div>
        ))}
        {obsidianPath && (
          <div>
            <span className="label">Nota de Obsidian</span>
            <div className="entity-detail__obsidian">
              <span className="entity-detail__obsidian-path">
                {obsidianPath}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => openInObsidian(vaultName ?? "", obsidianPath)}
                >
                  Abrir en Obsidian
                </button>
                {campaignId && (
                  <button className="btn btn-secondary" onClick={openNote}>
                    Ver nota renderizada
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {noteOpen && (
        <Modal title={title} onClose={() => setNoteOpen(false)} size="large">
          {noteHtml ? (
            <div className="npc-detail__desc" dangerouslySetInnerHTML={{ __html: noteHtml }} />
          ) : (
            <p className="npc-detail__desc">Sin contenido para mostrar.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
