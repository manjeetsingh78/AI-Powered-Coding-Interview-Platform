import { NavLink } from "react-router-dom";

import useAuth from "../../hooks/useAuth";
import { ROLE_META, ROLE_NAV, normalizeRole } from "./navConfig";

export default function Sidebar() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const navItems = ROLE_NAV[role] || [];
  const roleMeta = ROLE_META[role] || ROLE_META.candidate;
  const RoleIcon = roleMeta.icon;

  return (
    <aside className="workspace-sidebar">
      <div className="workspace-brand">
        <span className="workspace-logo">
          <RoleIcon size={18} />
        </span>
        <div>
          <strong>{roleMeta.title}</strong>
          <small>{roleMeta.subtitle}</small>
        </div>
      </div>

      <nav className="workspace-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const ItemIcon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `workspace-nav-link ${isActive ? "active" : ""}`}
            >
              <ItemIcon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
