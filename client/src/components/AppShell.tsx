import { useState } from "react";
import "./AppShell.css";
import { Sidebar } from "./Sidebar";
import type { DashboardSection } from "../screens/CampaignDashboard";

interface AppShellProps {
  campaignName: string;
  activeNav: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  onBackToCampaigns: () => void;
  children: React.ReactNode;
}

export function AppShell({
  campaignName,
  activeNav,
  onNavigate,
  onBackToCampaigns,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-shell">
      <div className="app-shell__toggle-zone">
        <button
          className="app-shell__toggle"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={
            sidebarOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"
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
        />
      </div>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
