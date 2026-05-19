import { useEffect, useMemo, useState } from "react";
import { BookOpen, Clock3, Code2, Command, FileText, List, LogOut, Menu, MessageSquare, Radio, Rocket, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { logout as logoutApi } from "../../api/auth.api";
import useAuth from "../../hooks/useAuth";
import { getRouteTitle } from "./navConfig";

export default function Topbar({ onToggleSidebar, mobileSidebarOpen, onOpenCommandPalette }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [activeSolveTab, setActiveSolveTab] = useState("description");

  const title = getRouteTitle(pathname);
  const initial = (user?.username || user?.email || "U").charAt(0).toUpperCase();
  const isSolveRoute = pathname.startsWith("/candidate/solve/");

  useEffect(() => {
    if (!isSolveRoute) return;
    setActiveSolveTab("description");
  }, [isSolveRoute, pathname]);

  useEffect(() => {
    const onActiveTab = (event) => {
      const nextTab = String(event.detail?.tab || "").trim();
      if (nextTab) setActiveSolveTab(nextTab);
    };

    window.addEventListener("solve:active-tab", onActiveTab);
    return () => window.removeEventListener("solve:active-tab", onActiveTab);
  }, []);

  const emitSolveTab = (tab) => {
    setActiveSolveTab(tab);
    window.dispatchEvent(new CustomEvent("solve:tab", { detail: { tab } }));
  };
  const routePulse = useMemo(() => {
    if (pathname.includes("assessment") || pathname.includes("solve")) return "Execution Mode";
    if (pathname.includes("report") || pathname.includes("results")) return "Insight Mode";
    if (pathname.includes("schedule") || pathname.includes("slots")) return "Scheduling Mode";
    return "Workspace Ready";
  }, [pathname]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logoutApi();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="workspace-topbar">
      {isSolveRoute ? (
        <>
          <div className="topbar-left topbar-solve-left">
            <button
              type="button"
              className="topbar-menu-btn"
              onClick={onToggleSidebar}
              aria-label="Toggle navigation"
            >
              {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="topbar-solve-brand">
              <Rocket size={18} />
              <span>Daily Question</span>
            </div>
            <nav className="topbar-solve-tabs" aria-label="Problem sections">
              <button
                type="button"
                className={`topbar-solve-tab ${activeSolveTab === "description" ? "active" : ""}`}
                onClick={() => emitSolveTab("description")}
              >
                <FileText size={14} />
                <span>Description</span>
              </button>
              <button
                type="button"
                className={`topbar-solve-tab ${activeSolveTab === "editorial" ? "active" : ""}`}
                onClick={() => emitSolveTab("editorial")}
              >
                <BookOpen size={14} />
                <span>Editorial</span>
              </button>
              <button
                type="button"
                className={`topbar-solve-tab ${activeSolveTab === "solutions" ? "active" : ""}`}
                onClick={() => emitSolveTab("solutions")}
              >
                <Code2 size={14} />
                <span>Solutions</span>
              </button>
              <button
                type="button"
                className={`topbar-solve-tab ${activeSolveTab === "submissions" ? "active" : ""}`}
                onClick={() => emitSolveTab("submissions")}
              >
                <List size={14} />
                <span>Submissions</span>
              </button>
            </nav>
          </div>

          <div className="workspace-profile workspace-profile-solve">
            <button type="button" className="topbar-command-btn" onClick={onOpenCommandPalette} aria-label="Open command palette">
              <Command size={14} />
            </button>
            <button type="button" className="profile-trigger profile-trigger-solve" onClick={() => setMenuOpen((value) => !value)}>
              <span className="profile-avatar">{initial}</span>
            </button>

            {menuOpen && (
              <div className="workspace-profile-menu">
                <button type="button" onClick={handleLogout}>
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-menu-btn"
              onClick={onToggleSidebar}
              aria-label="Toggle navigation"
            >
              {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <h1>{title}</h1>
              <p>Built for fast, focused interview operations</p>
            </div>
            <div className="topbar-mode-chip">
              <Radio size={13} />
              <span>{routePulse}</span>
            </div>
          </div>

          <div className="workspace-profile">
            <div className="topbar-clock">
              <Clock3 size={13} />
              <span>{now.toLocaleTimeString()}</span>
            </div>
            <button type="button" className="topbar-command-btn" onClick={onOpenCommandPalette}>
              <Command size={14} />
              <span>Command</span>
            </button>
            <button type="button" className="profile-trigger" onClick={() => setMenuOpen((value) => !value)}>
              <span className="profile-avatar">{initial}</span>
              <span className="profile-meta">
                <strong>{user?.username || "User"}</strong>
                <small>{user?.email || ""}</small>
              </span>
            </button>

            {menuOpen && (
              <div className="workspace-profile-menu">
                <button type="button" onClick={handleLogout}>
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
