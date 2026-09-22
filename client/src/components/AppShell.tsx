import { useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import "./AppShell.css";
import { Sidebar } from "./Sidebar";
import type { DashboardSection } from "../screens/CampaignDashboard";
import { useT } from "../lib/i18n";

interface AppShellProps {
  campaignName: string;
  activeNav: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  onBackToCampaigns: () => void;
  onOpenSettings?: () => void;
  onHelp: () => void;
  onAdminLogout?: () => void;
  children: React.ReactNode;
}

export function AppShell({
  campaignName,
  activeNav,
  onNavigate,
  onBackToCampaigns,
  onOpenSettings,
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

  function handleBackdropClick() {
    if (window.innerWidth <= 640) setSidebarOpen(false);
  }

  return (
    <div className={`app-shell${sidebarOpen ? "" : " app-shell--collapsed"}`}>
      <div
        className={`app-shell__sidebar${sidebarOpen ? "" : " app-shell__sidebar--closed"}`}
      >
        <Sidebar
          campaignName={campaignName}
          active={activeNav}
          onNavigate={handleNavigate}
          onBack={onBackToCampaigns}
          onOpenSettings={onOpenSettings}
          onHelp={onHelp}
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
