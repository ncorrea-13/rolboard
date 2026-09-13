import "./CharacterSheet.css";
import { Heart, Sparkles, BookOpen, Swords, Shield, ShieldPlus, Gem, type LucideIcon } from "lucide-react";
import type { StatMap } from "../data/domain";

interface CharacterSheetProps {
  attributes: StatMap;
  skills: StatMap;
  hp?: { current?: number; max?: number };
}

// Ciclo fijo de 3 íconos por sección — no hace falta que el orden de carga
// coincida con nada, es solo variedad visual, no significado por ícono.
const coreIcons: LucideIcon[] = [Sparkles, Swords, Gem];
const extraIcons: LucideIcon[] = [Shield, ShieldPlus, Gem];
const skillIcons: LucideIcon[] = [Sparkles, BookOpen, Swords];

function attrGrid(entries: [string, string | number][], icons: LucideIcon[]) {
  return (
    <div className="character-sheet__attrs">
      {entries.map(([key, value], i) => {
        const Icon = icons[i % icons.length];
        return (
          <div key={key} className="character-sheet__attr-cell">
            <Icon size={13} className="character-sheet__attr-icon" />
            <span className="character-sheet__attr-value">{value}</span>
            <span className="character-sheet__attr-label">{key}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CharacterSheet({ attributes, skills, hp }: CharacterSheetProps) {
  const attrEntries = Object.entries(attributes);
  // Los primeros 6 campos cargados son los atributos "core" (Fuerza, Destreza...);
  // lo que se agrega después son extras de mesa (armadura, defensa, etc.) — no hay
  // un tercer campo en el schema para esto, se distingue solo por orden de carga.
  const coreAttrs = attrEntries.slice(0, 6);
  const extraAttrs = attrEntries.slice(6, 12);
  const skillEntries = Object.entries(skills).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="character-sheet">
      {hp && (hp.current != null || hp.max != null) && (
        <div className="character-sheet__hp">
          <Heart size={20} style={{ color: "var(--status-alive)" }} />
          <span className="character-sheet__hp-value">{hp.current ?? "—"}</span>
          <span className="character-sheet__hp-sep">/</span>
          <span className="character-sheet__hp-max">{hp.max ?? "—"}</span>
          <span className="character-sheet__hp-label">HP</span>
        </div>
      )}

      <div>
        <span className="label">Atributos</span>
        {coreAttrs.length === 0 ? (
          <p className="character-sheet__empty">Sin atributos cargados.</p>
        ) : (
          attrGrid(coreAttrs, coreIcons)
        )}
      </div>

      {extraAttrs.length > 0 && (
        <div>
          <span className="label">Otros (armadura, defensa, etc.)</span>
          {attrGrid(extraAttrs, extraIcons)}
        </div>
      )}

      <div>
        <span className="label">Habilidades</span>
        {skillEntries.length === 0 ? (
          <p className="character-sheet__empty">Sin habilidades cargadas.</p>
        ) : (
          <table className="character-sheet__skills">
            <tbody>
              {skillEntries.map(([key, value], i) => {
                const Icon = skillIcons[i % skillIcons.length];
                return (
                  <tr key={key}>
                    <td className="character-sheet__skill-icon">
                      <Icon size={12} />
                    </td>
                    <td className="character-sheet__skill-name">{key}</td>
                    <td className="character-sheet__skill-value">{value}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
