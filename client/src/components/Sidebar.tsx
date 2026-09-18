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
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import "./Sidebar.css";
import { crystalColor } from "../data/domain";
import type { DashboardSection } from "../screens/CampaignDashboard";
import { LanguageToggle } from "./LanguageToggle";
import { useT, type TranslationKey } from "../lib/i18n";

const navItems: {
  labelKey: TranslationKey;
  section?: DashboardSection;
  Icon: LucideIcon;
  color: string;
}[] = [
  {
    labelKey: "sidebar.resumen",
    section: "resumen",
    Icon: LayoutDashboard,
    color: "var(--accent-obsidian)",
  },
  {
    labelKey: "sidebar.arcos",
    section: "arcos",
    Icon: BookOpen,
    color: "var(--accent-sky)",
  },
  {
    labelKey: "sidebar.sesiones",
    section: "sesiones",
    Icon: CalendarDays,
    color: "var(--status-alive)",
  },
  { labelKey: "sidebar.npcs", section: "npcs", Icon: Users, color: crystalColor.npc },
  {
    labelKey: "sidebar.jugadores",
    section: "jugadores",
    Icon: Dices,
    color: "var(--status-dead)",
  },
  {
    labelKey: "sidebar.locaciones",
    section: "locaciones",
    Icon: MapPin,
    color: crystalColor.location,
  },
  {
    labelKey: "sidebar.facciones",
    section: "facciones",
    Icon: Shield,
    color: crystalColor["faction-quest"],
  },
  {
    labelKey: "sidebar.quests",
    section: "quests",
    Icon: Swords,
    color: "var(--accent-teal)",
  },
  {
    labelKey: "sidebar.encuentros",
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
  onOpenSettings?: () => void;
  onAdminLogout?: () => void;
  onBackdropClick?: () => void;
}

export function Sidebar({
  campaignName,
  active,
  onNavigate,
  onBack,
  onOpenSettings,
  onAdminLogout,
  onBackdropClick,
}: SidebarProps) {
  const t = useT();
  return (
    <nav className="sidebar" onClick={onBackdropClick}>
      <button
        className="sidebar__brand"
        onClick={onBack}
        title={t("sidebar.backToCampaigns")}
      >
        <span className="sidebar__glow" />
        <span className="sidebar__name">{campaignName}</span>
      </button>
      {navItems.map(({ Icon, ...item }) => {
        const isActive = item.section === active;
        return (
          <div
            key={item.labelKey}
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
              {t(item.labelKey)}
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
      <div
        className="sidebar__footer-actions"
        onClick={(e) => e.stopPropagation()}
      >
        {onOpenSettings && (
          <button
            className="btn btn-secondary"
            onClick={onOpenSettings}
            title={t("campaignSettings.openSettings")}
            aria-label={t("campaignSettings.openSettings")}
          >
            <Settings size={15} strokeWidth={1.75} />
          </button>
        )}
        <LanguageToggle />
        {onAdminLogout && (
          <button
            className="btn btn-secondary"
            onClick={onAdminLogout}
            title={t("adminSecret.logout")}
            aria-label={t("adminSecret.logout")}
            style={{ color: "#e5484d", borderColor: "#e5484d" }}
          >
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </nav>
  );
}
