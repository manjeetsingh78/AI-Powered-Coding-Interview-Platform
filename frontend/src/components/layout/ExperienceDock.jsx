import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Sparkles } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { ROLE_NAV, normalizeRole } from "./navConfig";

const TIPS = {
  candidate: [
    "Use Solve Workspace daily to build consistency and speed.",
    "Start with medium problems, then alternate with hard rounds.",
    "Review History after every session to catch repeated mistakes.",
  ],
  recruiter: [
    "Create balanced tests: 1 easy, 2 medium, 1 hard.",
    "Use Candidate Reports to standardize hiring signals.",
    "Keep slot inventory updated to reduce interview no-shows.",
  ],
  admin: [
    "Maintain active problem quality with realistic constraints.",
    "Audit users weekly for role and verification consistency.",
    "Keep company records clean for recruiter segmentation.",
  ],
};

export default function ExperienceDock() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const role = normalizeRole(user?.role);
  const links = useMemo(() => (ROLE_NAV[role] || []).slice(0, 3), [role]);
  const tips = TIPS[role] || TIPS.candidate;

  useEffect(() => {
    setTipIndex(0);
  }, [pathname]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((previous) => (previous + 1) % tips.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [tips.length]);

  return (
    <aside className={`experience-dock ${collapsed ? "collapsed" : ""}`}>
      <button type="button" className="experience-dock-toggle" onClick={() => setCollapsed((value) => !value)}>
        <Sparkles size={15} />
        <span>Workspace Assistant</span>
        <ChevronDown size={15} />
      </button>

      {!collapsed ? (
        <div className="experience-dock-body">
          <p className="experience-dock-tip">{tips[tipIndex]}</p>
          <div className="experience-dock-links">
            {links.map((item) => (
              <Link key={item.to} to={item.to} className="experience-dock-link">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
