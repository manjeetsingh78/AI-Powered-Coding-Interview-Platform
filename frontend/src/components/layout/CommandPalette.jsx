import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Command, Pin, Search } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { ROLE_NAV, normalizeRole } from "./navConfig";

export default function CommandPalette({ open, onClose }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState([]);
  const [pinnedIds, setPinnedIds] = useState([]);

  const role = normalizeRole(user?.role);
  const storageKey = `command_palette_recent_${user?.id || role || "guest"}`;
  const pinnedStorageKey = `command_palette_pinned_${user?.id || role || "guest"}`;

  const saveRecentAction = (actionId) => {
    setRecentIds((previous) => {
      const next = [actionId, ...previous.filter((id) => id !== actionId)].slice(0, 6);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const items = useMemo(() => {
    const navItems = (ROLE_NAV[role] || []).map((item, index) => ({
      id: item.to,
      label: item.label,
      description: item.to,
      shortcut: `Alt+${index + 1}`,
      onSelect: () => {
        saveRecentAction(item.to);
        navigate(item.to);
        onClose?.();
      },
    }));

    const utilityItems = [
      {
        id: "open-login",
        label: "Go to Login",
        description: "Switch account or role",
        shortcut: "G L",
        onSelect: () => {
          saveRecentAction("open-login");
          navigate("/login");
          onClose?.();
        },
      },
    ];

    const solveContext = [];
    if (pathname.includes("/candidate/solve")) {
      const solveState = (() => {
        try {
          return JSON.parse(localStorage.getItem("solve_workspace_state") || "{}");
        } catch {
          return {};
        }
      })();

      solveContext.push(
        {
          id: "solve-run",
          label: "Run Current Solution",
          description: `Lang: ${solveState?.language || "javascript"}`,
          shortcut: "R U N",
          onSelect: () => {
            saveRecentAction("solve-run");
            window.dispatchEvent(new CustomEvent("palette:solve:run"));
            onClose?.();
          },
        },
        {
          id: "solve-next-language",
          label: "Switch Language",
          description: "Cycle to the next language in editor",
          shortcut: "S W L",
          onSelect: () => {
            saveRecentAction("solve-next-language");
            window.dispatchEvent(new CustomEvent("palette:solve:next-language"));
            onClose?.();
          },
        },
        {
          id: "solve-next-problem",
          label: "Open Next Problem",
          description: "Move to next challenge in queue",
          shortcut: "N X T",
          onSelect: () => {
            saveRecentAction("solve-next-problem");
            window.dispatchEvent(new CustomEvent("palette:solve:next-problem"));
            onClose?.();
          },
        }
      );
    }

    const assessmentContext = [];
    if (pathname.includes("/candidate/assessment")) {
      assessmentContext.push({
        id: "assessment-toggle",
        label: "Start or Pause Assessment",
        description: "Toggle timed session",
        shortcut: "T G L",
        onSelect: () => {
          saveRecentAction("assessment-toggle");
          window.dispatchEvent(new CustomEvent("palette:assessment:toggle"));
          onClose?.();
        },
      });
    }

    return [...solveContext, ...assessmentContext, ...navItems, ...utilityItems];
  }, [navigate, onClose, pathname, role]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setRecentIds(Array.isArray(saved) ? saved : []);
    } catch {
      setRecentIds([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(pinnedStorageKey) || "[]");
      setPinnedIds(Array.isArray(saved) ? saved : []);
    } catch {
      setPinnedIds([]);
    }
  }, [pinnedStorageKey]);

  const togglePinned = (actionId) => {
    setPinnedIds((previous) => {
      const isPinned = previous.includes(actionId);
      const next = isPinned ? previous.filter((id) => id !== actionId) : [actionId, ...previous].slice(0, 8);
      localStorage.setItem(pinnedStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = `${item.label} ${item.description}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  const recentItems = useMemo(() => {
    return recentIds
      .map((id) => items.find((item) => item.id === id))
      .filter(Boolean);
  }, [items, recentIds]);

  const pinnedItems = useMemo(() => {
    return pinnedIds
      .map((id) => items.find((item) => item.id === id))
      .filter(Boolean);
  }, [items, pinnedIds]);

  const visibleItems = useMemo(() => {
    if (query.trim()) return filteredItems;
    const pinnedSet = new Set(pinnedItems.map((item) => item.id));
    const recentSet = new Set(recentItems.map((item) => item.id));
    const rest = filteredItems.filter((item) => !recentSet.has(item.id) && !pinnedSet.has(item.id));
    const recentWithoutPinned = recentItems.filter((item) => !pinnedSet.has(item.id));
    return [...pinnedItems, ...recentWithoutPinned, ...rest];
  }, [filteredItems, pinnedItems, query, recentItems]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeys = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      if (!visibleItems.length) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((previous) => (previous + 1) % visibleItems.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((previous) => (previous - 1 + visibleItems.length) % visibleItems.length);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        visibleItems[activeIndex]?.onSelect?.();
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [activeIndex, onClose, open, visibleItems]);

  useEffect(() => {
    if (activeIndex >= visibleItems.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, visibleItems.length]);

  if (!open) return null;

  return (
    <div className="command-palette-overlay" role="dialog" aria-modal="true">
      <div className="command-palette">
        <div className="command-palette-head">
          <div className="command-palette-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search routes, pages, and actions"
              autoFocus
            />
          </div>
          <button type="button" className="command-palette-close" onClick={onClose}>
            Esc
          </button>
        </div>

        <div className="command-palette-list">
          {!query.trim() && pinnedItems.length ? <p className="command-palette-group">Pinned</p> : null}
          {!query.trim() && recentItems.length ? <p className="command-palette-group">Recent</p> : null}
          {visibleItems.map((item, index) => (
            <div
              key={item.id}
              className={`command-palette-item ${index === activeIndex ? "active" : ""}`}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <button type="button" className="command-palette-item-main" onClick={item.onSelect}>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </div>
                <span>{item.shortcut}</span>
              </button>
              <button
                type="button"
                className={`command-palette-pin ${pinnedIds.includes(item.id) ? "active" : ""}`}
                onClick={() => togglePinned(item.id)}
                aria-label={pinnedIds.includes(item.id) ? "Unpin action" : "Pin action"}
              >
                <Pin size={13} />
              </button>
            </div>
          ))}
          {!visibleItems.length ? <p className="command-palette-empty">No matching actions.</p> : null}
        </div>

        <div className="command-palette-footer">
          <span><Command size={14} /> Ctrl/Cmd + K</span>
          <span>Alt + 1..5 quick route</span>
        </div>
      </div>
    </div>
  );
}
