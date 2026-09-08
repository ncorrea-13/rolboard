import "./Sidebar.css";
import { crystalColor } from "../data/mock";
import type { DashboardSection } from "../screens/CampaignDashboard";

const navItems: { label: string; section?: DashboardSection; crystal?: string }[] = [
  { label: "Resumen", section: "resumen" },
  { label: "Arcos", section: "arcos" },
  { label: "Sesiones", section: "sesiones" },
  { label: "NPCs", section: "npcs", crystal: crystalColor.npc },
  { label: "Jugadores", section: "jugadores", crystal: crystalColor.npc },
  { label: "Locaciones", section: "locaciones", crystal: crystalColor.location },
  { label: "Facciones", section: "facciones", crystal: crystalColor["faction-quest"] },
  { label: "Quests", section: "quests", crystal: crystalColor["faction-quest"] },
];

interface SidebarProps {
  campaignName: string;
  active: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  onBack: () => void;
}

export function Sidebar({ campaignName, active, onNavigate, onBack }: SidebarProps) {
  return (
    <nav className="sidebar">
      <button className="sidebar__brand" onClick={onBack} title="Volver a campañas">
        <span className="sidebar__glow" />
        <span className="sidebar__name">{campaignName}</span>
      </button>
      {navItems.map((item) => (
        <div
          key={item.label}
          className={`sidebar__item${item.section === active ? " sidebar__item--active" : ""}${item.section ? " sidebar__item--clickable" : ""}`}
          onClick={item.section ? () => onNavigate(item.section!) : undefined}
        >
          {item.crystal && <span className="sidebar__marker" style={{ background: item.crystal }} />}
          {item.label}
        </div>
      ))}
      <div className="sidebar__crystalline">
        <div className="label">Día cristalino</div>
        <div className="sidebar__crystalline-value">en 2 sesiones</div>
      </div>
    </nav>
  );
}
