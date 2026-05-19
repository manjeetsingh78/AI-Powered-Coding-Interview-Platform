import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import useAuth from "../../hooks/useAuth";
import { ROLE_NAV, normalizeRole } from "./navConfig";
import CommandPalette from "./CommandPalette";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import ExperienceDock from "./ExperienceDock";
import "../../assets/styles/workspace-layout.css";

export default function RoleLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const role = normalizeRole(user?.role);
  const roleRoutes = useMemo(() => ROLE_NAV[role] || [], [role]);
  const routeClass = `route-${pathname.replace(/^\//, "").replace(/\//g, "-") || "home"}`;
  const routeClasses = pathname.startsWith("/candidate/solve")
    ? `${routeClass} route-candidate-solve`
    : routeClass;

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        return;
      }

      if (event.altKey && /^\d$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const target = roleRoutes[index];
        if (target) {
          event.preventDefault();
          navigate(target.to);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, roleRoutes]);

  return (
    <div className={`workspace-layout ${routeClasses}`}>
      <div className={`workspace-sidebar-wrap ${mobileSidebarOpen ? "open" : ""}`}>
        <Sidebar />
      </div>
      <div className="workspace-main">
        <Topbar
          mobileSidebarOpen={mobileSidebarOpen}
          onToggleSidebar={() => setMobileSidebarOpen((value) => !value)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />
        <section className={`workspace-content ${routeClasses}`}>
          <Outlet />
        </section>
        <ExperienceDock />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </div>
  );
}
