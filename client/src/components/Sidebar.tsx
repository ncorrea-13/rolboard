import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Users,
  Dices,
  MapPin,
  Shield,
  Swords,
  Skull,
  type LucideIcon,
} from "lucide-react";
import "./Sidebar.css";
import { crystalColor } from "../data/domain";
import type { DashboardSection } from "../screens/CampaignDashboard";

const navItems: {
  label: string;
  section?: DashboardSection;
  Icon: LucideIcon;
  color: string;
}[] = [
  {
    label: "Resumen",
    section: "resumen",
    Icon: LayoutDashboard,
    color: "var(--accent-obsidian)",
  },
  {
    label: "Arcos",
    section: "arcos",
    Icon: BookOpen,
    color: "var(--accent-sky)",
  },
  {
    label: "Sesiones",
    section: "sesiones",
    Icon: CalendarDays,
    color: "var(--status-alive)",
  },
  { label: "NPCs", section: "npcs", Icon: Users, color: crystalColor.npc },
  {
    label: "Jugadores",
    section: "jugadores",
    Icon: Dices,
    color: "var(--status-dead)",
  },
  {
    label: "Locaciones",
    section: "locaciones",
    Icon: MapPin,
    color: crystalColor.location,
  },
  {
    label: "Facciones",
    section: "facciones",
    Icon: Shield,
    color: crystalColor["faction-quest"],
  },
  {
    label: "Quests",
    section: "quests",
    Icon: Swords,
    color: "var(--accent-teal)",
  },
  {
    label: "Encuentros",
    section: "encuentros",
    Icon: Skull,
    color: "var(--accent-flame)",
  },
];

interface SidebarProps {
  campaignName: string;
  active: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  onBack: () => void;
}

export function Sidebar({
  campaignName,
  active,
  onNavigate,
  onBack,
}: SidebarProps) {
  return (
    <nav className="sidebar">
      <button
        className="sidebar__brand"
        onClick={onBack}
        title="Volver a campañas"
      >
        <span className="sidebar__glow" />
        <span className="sidebar__name">{campaignName}</span>
      </button>
      {navItems.map(({ Icon, ...item }) => {
        const isActive = item.section === active;
        return (
          <div
            key={item.label}
            className={`sidebar__item${isActive ? " sidebar__item--active" : ""}${item.section ? " sidebar__item--clickable" : ""}`}
            onClick={item.section ? () => onNavigate(item.section!) : undefined}
          >
            <Icon
              className="sidebar__icon"
              size={15}
              strokeWidth={1.75}
              style={{ color: item.color }}
            />
            <span
              className="sidebar__marker"
              style={{ background: item.color }}
            />
            <span className="sidebar__item-label">
              {item.label}
              {isActive && (
                <span
                  className="sidebar__item-underline"
                  style={{ background: item.color }}
                />
              )}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
