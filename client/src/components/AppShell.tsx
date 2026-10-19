import { useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import "./AppShell.css";
import { Sidebar } from "./Sidebar";
import { Sigil, type SigilVariant } from "./Sigil";
import type { DashboardSection } from "../screens/CampaignDashboard";
import { useT } from "../lib/i18n";

interface AppShellProps {
  campaignName: string;
  activeNav: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  onBackToCampaigns: () => void;
  onOpenSettings?: () => void;
  onSearch?: () => void;
  onHelp: () => void;
  onAdminLogout?: () => void;
  children: React.ReactNode;
}

function auraFor(section: DashboardSection): {
  variant: SigilVariant;
  stars: string;
} {
  switch (section) {
    case "mundo":
    case "locaciones":
    case "facciones":
    case "objetos":
      return { variant: "astrolabe", stars: " aura--c2" };
    case "encuentros":
    case "wardails":
    case "secretos":
      return { variant: "runes", stars: " aura--c3" };
    default:
      return { variant: "circle", stars: "" };
  }
}

export function AppShell({
  campaignName,
  activeNav,
  onNavigate,
  onBackToCampaigns,
  onOpenSettings,
  onSearch,
  onHelp,
  onAdminLogout,
  children,
}: AppShellProps) {
  const t = useT();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 640);

  function handleNavigate(section: DashboardSection) {
    onNavigate(section);
    if (window.innerWidth <= 640) setSidebarOpen(false);
  }

  function closeOnNarrow(action?: () => void) {
    return () => {
      action?.();
      if (window.innerWidth <= 640) setSidebarOpen(false);
    };
  }

  function handleBackdropClick() {
    if (window.innerWidth <= 640) setSidebarOpen(false);
  }

  const aura = auraFor(activeNav);

  return (
    <div
      className={`app-shell aura aura--soft aura--right${aura.stars}${sidebarOpen ? "" : " app-shell--collapsed"}`}
    >
      <Sigil
        variant={aura.variant}
        className="aura__sigil aura__sigil--right"
      />
      <div
        className={`app-shell__sidebar${sidebarOpen ? "" : " app-shell__sidebar--closed"}`}
      >
        <Sidebar
          campaignName={campaignName}
          active={activeNav}
          onNavigate={handleNavigate}
          onBack={onBackToCampaigns}
          onOpenSettings={onOpenSettings && closeOnNarrow(onOpenSettings)}
          onSearch={onSearch && closeOnNarrow(onSearch)}
          onHelp={closeOnNarrow(onHelp)}
          onAdminLogout={onAdminLogout}
          onBackdropClick={handleBackdropClick}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
      <button
        className="app-shell__open"
        onClick={() => setSidebarOpen(true)}
        aria-label={t("appShell.showSidebar")}
        title={t("appShell.showSidebar")}
      >
        <PanelLeftOpen size={16} strokeWidth={1.75} />
      </button>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
