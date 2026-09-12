import { useEffect, useState } from "react";
import "./NpcEdit.css";
import {
  crystalColor,
  statusLabel,
  statusColor,
  statusDotColor,
  locationBreadcrumb,
  type CrystalType,
  type Npc,
  type StatMap,
  type StatusKind,
  type Location,
} from "../data/domain";
import { apiFetch } from "../lib/api";
import { SkillsEditor } from "../components/SkillsEditor";

const typeOptions: { label: string; crystal: CrystalType }[] = [
  { label: "NPC", crystal: "npc" },
  { label: "Spren / cognitiva", crystal: "spren" },
];

const statusOptions: StatusKind[] = ["alive", "missing", "dead", "paused"];

interface NpcEditProps {
  npc: Npc;
  npcs: Npc[];
  locations: Location[];
  onSave: (patch: Partial<Npc>) => void;
  onDiscard: () => void;
}

export function NpcEdit({ npc, npcs, locations, onSave, onDiscard }: NpcEditProps) {
  const [name, setName] = useState(npc.name);
  const [description, setDescription] = useState(npc.description);
  const [status, setStatus] = useState<StatusKind>(npc.status);
  const [detailLevel, setDetailLevel] = useState<"full" | "minor">(npc.detailLevel);
  const [crystal, setCrystal] = useState<CrystalType>(npc.crystal);
  const [linkRole, setLinkRole] = useState("");
  const [linkNpcId, setLinkNpcId] = useState("");
  const [existingLink, setExistingLink] = useState<{ role: string; npcId: string } | null>(null);
  const [locationId, setLocationId] = useState(npc.locationId ?? "");
  const [etnia, setEtnia] = useState(npc.etnia ?? "");
  const [tipoSpren, setTipoSpren] = useState(npc.tipoSpren ?? "");
  const [attributes, setAttributes] = useState<StatMap>(npc.attributes);
  const [skills, setSkills] = useState<StatMap>(npc.skills);

  useEffect(() => {
    if (!npc.id) return;
    apiFetch<{ to_npc_id: number; role: string }[]>(`/npcs/${npc.id}/relations`)
      .then((data) => {
        const first = (data ?? [])[0];
        if (!first) return;
        const link = { role: first.role, npcId: String(first.to_npc_id) };
        setExistingLink(link);
        setLinkRole(link.role);
        setLinkNpcId(link.npcId);
      })
      .catch((err) => console.error("Error cargando vínculo:", err));
  }, [npc.id]);

  const dirty =
    name !== npc.name ||
    description !== npc.description ||
    status !== npc.status ||
    detailLevel !== npc.detailLevel ||
    crystal !== npc.crystal ||
    locationId !== (npc.locationId ?? "") ||
    etnia !== (npc.etnia ?? "") ||
    tipoSpren !== (npc.tipoSpren ?? "") ||
    linkRole !== (existingLink?.role ?? "") ||
    linkNpcId !== (existingLink?.npcId ?? "") ||
    JSON.stringify(attributes) !== JSON.stringify(npc.attributes) ||
    JSON.stringify(skills) !== JSON.stringify(npc.skills);

  function syncLink(savedNpcId: string) {
    if (existingLink) {
      apiFetch(`/npcs/${savedNpcId}/relations/${existingLink.npcId}/${existingLink.role}`, {
        method: "DELETE",
      }).catch((err) => console.error("Error borrando vínculo:", err));
    }
    if (linkNpcId) {
      apiFetch(`/npcs/${savedNpcId}/relations`, {
        method: "POST",
        body: JSON.stringify({ to_npc_id: Number(linkNpcId), role: linkRole || "VINCULADO" }),
      }).catch((err) => console.error("Error guardando vínculo:", err));
    }
  }

  function handleSave() {
    const crystalLabel = typeOptions.find((t) => t.crystal === crystal)?.label ?? npc.crystalLabel;
    onSave({ name, description, status, detailLevel, crystal, crystalLabel, locationId: locationId || undefined, etnia, tipoSpren, attributes, skills });
    if (npc.id) syncLink(npc.id);
  }

  const linkTarget = npcs.find((n) => n.id === linkNpcId);
  const missingOrigin = locationId.trim() === "";

  return (
    <div className="card npc-edit">
      <div className="npc-edit__bar" style={{ boxShadow: "inset 4px 0 0 var(--accent-flame)" }}>
        <div className="npc-edit__bar-left">
          <span className="status-dot" style={{ background: "var(--accent-flame)" }} />
          <span style={{ fontWeight: 500, fontSize: 13.5, color: "var(--text-primary)" }}>
            {npc.id ? `Editando · ${npc.name}` : "Nuevo NPC"}
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
              <span className="label">Nombre</span>
              <input className="npc-edit__input npc-edit__input--focus" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="npc-edit__hint">Campo con foco: anillo ámbar de 1px, nunca glow.</div>
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
            <div>
              <span className="label">Nivel de detalle</span>
              <select
                className="npc-edit__select npc-edit__select--native"
                value={detailLevel}
                onChange={(e) => setDetailLevel(e.target.value as "full" | "minor")}
              >
                <option value="full">Completo</option>
                <option value="minor">Menor</option>
              </select>
            </div>
          </div>

          <div>
            <span className="label">Tipo</span>
            <div className="npc-edit__type-row">
              {typeOptions.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className={`npc-edit__type-chip${crystal === t.crystal ? " npc-edit__type-chip--active" : ""}`}
                  onClick={() => setCrystal(t.crystal)}
                >
                  <span className="npc-edit__type-mark" style={{ background: crystalColor[t.crystal] }} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="npc-edit__grid-2">
            {crystal === "spren" ? (
              <div>
                <span className="label">Tipo de spren</span>
                <input
                  className="npc-edit__input"
                  value={tipoSpren}
                  onChange={(e) => setTipoSpren(e.target.value)}
                  placeholder="ej. Honorspren"
                />
              </div>
            ) : (
              <div>
                <span className="label">Etnia</span>
                <input
                  className="npc-edit__input"
                  value={etnia}
                  onChange={(e) => setEtnia(e.target.value)}
                  placeholder="ej. Alethi"
                />
              </div>
            )}
          </div>

          <div>
            <span className="label">Descripción</span>
            <textarea className="npc-edit__textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <span className="label">Vínculo con otro NPC</span>
            <div className="npc-edit__grid-2">
              <input
                className="npc-edit__select npc-edit__select--native"
                placeholder="Rol (ej. VINCULADO)"
                value={linkRole}
                onChange={(e) => setLinkRole(e.target.value)}
              />
              <select
                className="npc-edit__select npc-edit__select--native"
                value={linkNpcId}
                onChange={(e) => setLinkNpcId(e.target.value)}
                style={linkTarget ? { borderBottom: `2px solid ${crystalColor[linkTarget.crystal]}` } : undefined}
              >
                <option value="">— sin vínculo —</option>
                {npcs.filter((n) => n.id !== npc.id).map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
            <div className="npc-edit__hint">
              El selector hereda el color de cristal del tipo elegido — se ve que el vínculo es con un spren sin leer
              la etiqueta.
            </div>
          </div>

          <SkillsEditor label="Atributos" value={attributes} onChange={setAttributes} />
          <SkillsEditor label="Habilidades" value={skills} onChange={setSkills} />
        </div>

        <div className="npc-edit__col">
          <div>
            <span className="label">Ubicación actual</span>
            <select
              className="npc-edit__select npc-edit__select--native"
              style={{ borderBottom: "2px solid var(--crystal-location)" }}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">— sin ubicación —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{locationBreadcrumb(l, locations)}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Nota de Obsidian</span>
            <div className="npc-edit__select" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
              {npc.obsidianPath}
            </div>
          </div>
          {(status === "dead" || missingOrigin) && (
            <div className="card npc-edit__warning" style={{ boxShadow: "inset 3px 0 0 var(--status-dead)" }}>
              <div className="npc-edit__warning-title">
                <span className="status-dot" style={{ background: statusDotColor[status] }} />
                {status === "dead" ? "NPC marcado como muerto" : "Falta la ubicación de origen"}
              </div>
              <div className="npc-edit__warning-body">Podés guardar igual; el campo queda marcado como incompleto en la ficha.</div>
            </div>
          )}
          <div className="npc-edit__note">
            Decisión: edición en la misma vista, no modal. Un modal taparía la ficha justo cuando estás copiando datos
            de ella en vivo, y los vínculos necesitan el ancho completo.
          </div>
          <div className="npc-edit__note">
            La facción se gestiona desde la ficha de la facción ("Agregar NPC"), no acá — evita tener dos lugares
            que puedan decir cosas distintas sobre a qué grupo pertenece.
          </div>
        </div>
      </div>
    </div>
  );
}
