import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { logout as logoutApi } from "../api/auth.api";
import "../assets/styles/topbar.css";

const NAV_BY_ROLE = {
  candidate: [
    { to: "/candidate/dashboard", label: "Dashboard" },
    { to: "/candidate/assessment", label: "Assessment" },
    { to: "/candidate/solve", label: "Solve" },
    { to: "/candidate/history", label: "History" },
    { to: "/candidate/results", label: "Results" },
    { to: "/candidate/schedule", label: "Schedule" },
  ],
  recruiter: [
    { to: "/recruiter/dashboard", label: "Dashboard" },
    { to: "/recruiter/create-test", label: "Create Test" },
    { to: "/recruiter/test-detail", label: "Test Detail" },
    { to: "/recruiter/candidate-report", label: "Report" },
    { to: "/recruiter/slots", label: "Slots" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/companies", label: "Companies" },
  ],
};

function normalizeRole(role) {
  if (role === "user") return "candidate";
  if (role === "interviewer") return "recruiter";
  return role;
}

export default function AppTopbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const role = normalizeRole(user?.role || "candidate");
  const navItems = useMemo(() => NAV_BY_ROLE[role] || [], [role]);

  const initial = (user?.username || user?.email || "U").charAt(0).toUpperCase();

  const onLogout = async () => {
    await logoutApi();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <strong>Interview Platform</strong>
        <span>{role.toUpperCase()} Workspace</span>
      </div>

      <nav className="topbar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `topbar-link ${isActive ? "active" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="topbar-profile">
        <button type="button" className="profile-btn" onClick={() => setOpen((value) => !value)}>
          <span className="avatar">{initial}</span>
          <span className="profile-text">
            <strong>{user?.username || "User"}</strong>
            <small>{user?.email || ""}</small>
          </span>
        </button>

        {open && (
          <div className="profile-menu">
            <button type="button" onClick={onLogout}>Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}
