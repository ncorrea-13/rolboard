import type { ReactNode } from "react";
import "./EntityDetail.css";
import { openInObsidian } from "../lib/obsidian";

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
  onEdit,
  onDelete,
}: EntityDetailProps) {
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
          {(onEdit || onDelete) && (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              {onEdit && (
                <button className="btn btn-secondary" onClick={onEdit}>
                  Editar
                </button>
              )}
              {onDelete && (
                <button className="btn btn-secondary" onClick={onDelete}>
                  Borrar
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
              <button
                className="btn btn-secondary"
                onClick={() => openInObsidian(obsidianPath)}
              >
                Abrir en Obsidian
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
