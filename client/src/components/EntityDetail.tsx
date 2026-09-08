import type { ReactNode } from "react";
import "./EntityDetail.css";

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
  /** Sin `obsidian_path` (ej. quests) no hay nota en el vault — omitir el prop. */
  obsidianPath?: string;
}

/** Detalle genérico reusado por Arcos/Facciones/Locaciones/Quests/Jugadores —
 * mockeado hasta que cada entidad tenga su propio endpoint real en el backend. */
export function EntityDetail({ eyebrow, backLabel, onBack, title, subtitle, accentColor, status, fields, obsidianPath }: EntityDetailProps) {
  return (
    <div className="card entity-detail">
      <div className="entity-detail__header">
        <div className="entity-detail__breadcrumb">
          <button className="entity-detail__breadcrumb-link" onClick={onBack}>{backLabel}</button>
          <span>/</span>
          <span>{eyebrow}</span>
        </div>
        <div className="entity-detail__title-row">
          {accentColor ? (
            <span className="title-underline">
              <span className="display" style={{ fontSize: 22 }}>{title}</span>
              <span className="title-underline__bar" style={{ background: accentColor }} />
            </span>
          ) : (
            <span className="display" style={{ fontSize: 22 }}>{title}</span>
          )}
          {status}
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
              <span className="entity-detail__obsidian-path">{obsidianPath}</span>
              <button className="btn btn-secondary">Abrir en Obsidian</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
