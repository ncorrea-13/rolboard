import { useState } from "react";
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
  onAdminLogout?: () => void;
  children: React.ReactNode;
}

export function AppShell({
  campaignName,
  activeNav,
  onNavigate,
  onBackToCampaigns,
  onOpenSettings,
  onAdminLogout,
  children,
}: AppShellProps) {
  const t = useT();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-shell">
      <div className="app-shell__toggle-zone">
        <button
          className="app-shell__toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={
            sidebarOpen ? t("appShell.hideSidebar") : t("appShell.showSidebar")
          }
          aria-expanded={sidebarOpen}
        >
          ☰
        </button>
      </div>
      <div
        className={`app-shell__sidebar${sidebarOpen ? "" : " app-shell__sidebar--closed"}`}
      >
        <Sidebar
          campaignName={campaignName}
          active={activeNav}
          onNavigate={onNavigate}
          onBack={onBackToCampaigns}
          onOpenSettings={onOpenSettings}
          onAdminLogout={onAdminLogout}
        />
      </div>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
