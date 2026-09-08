import { useState } from "react";
import "./AppShell.css";
import { Sidebar } from "./Sidebar";
import type { DashboardSection } from "../screens/CampaignDashboard";

interface AppShellProps {
  activeNav: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  onBackToCampaigns: () => void;
  children: React.ReactNode;
}

/** Shell persistente para toda vista dentro de una campaña: la sidebar no
 * se remonta al navegar entre resumen/NPCs/sesiones/ficha/edición.
 * Colapsable con el botón hamburguesa flotante (arranca abierta). */
export function AppShell({ activeNav, onNavigate, onBackToCampaigns, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-shell">
      <button
        className="app-shell__toggle"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"}
        aria-expanded={sidebarOpen}
      >
        ☰
      </button>
      <div className={`app-shell__sidebar${sidebarOpen ? "" : " app-shell__sidebar--closed"}`}>
        <Sidebar campaignName="Shadesmar" active={activeNav} onNavigate={onNavigate} onBack={onBackToCampaigns} />
      </div>
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
