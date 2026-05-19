import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listProblemsAdmin } from "../../api/problems.api";
import "../../assets/styles/admin-dashboard.css";
import { Button, EmptyState, Spinner, Toast } from "../../components/ui";

const DIFFICULTY_ICON = { easy: "🟢", medium: "🟡", hard: "🔴" };

export default function DashboardPage() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const stats = useMemo(() => {
    const total = problems.length;
    const active = problems.filter((p) => p.is_active).length;
    const inactive = total - active;
    const easy = problems.filter((p) => p.difficulty === "easy").length;
    const medium = problems.filter((p) => p.difficulty === "medium").length;
    const hard = problems.filter((p) => p.difficulty === "hard").length;
    return { total, active, inactive, easy, medium, hard };
  }, [problems]);

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesDifficulty = filterDifficulty === "all" || p.difficulty === filterDifficulty;
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && p.is_active) ||
        (filterStatus === "inactive" && !p.is_active);
      return matchesSearch && matchesDifficulty && matchesStatus;
    });
  }, [problems, search, filterDifficulty, filterStatus]);

  const loadProblems = async () => {
    setLoading(true);
    setError("");

    const result = await listProblemsAdmin();
    if (result.ok) {
      setProblems(result.data?.problems || []);
    } else {
      setError(result.data?.error || "Failed to load problems.");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProblems();
  }, []);

  return (
    <div className="admin-dashboard dashboard-shell">
      <section className="admin-hero">
        <div className="admin-hero-content">
          <div>
            <h2>Admin Control Center</h2>
            <p>Manage the problem bank, monitor stats, and add new challenges.</p>
          </div>
          <Button type="button" className="admin-hero-cta" onClick={() => navigate("/admin/problems/new")}>
            + Add Problem
          </Button>
        </div>
        <div className="admin-hero-glow" />
      </section>

      <section className="admin-stats-grid">
        <article className="admin-stat-card accent-blue">
          <div className="admin-stat-icon">📚</div>
          <div>
            <h3>Total Problems</h3>
            <strong>{stats.total}</strong>
          </div>
        </article>
        <article className="admin-stat-card accent-green">
          <div className="admin-stat-icon">✅</div>
          <div>
            <h3>Active</h3>
            <strong>{stats.active}</strong>
            <span className="admin-stat-sub">{stats.inactive} inactive</span>
          </div>
        </article>
        <article className="admin-stat-card accent-amber">
          <div className="admin-stat-icon">⭐</div>
          <div>
            <h3>Difficulty</h3>
            <strong>
              <span className="stat-chip easy-chip">{stats.easy}</span>
              <span className="stat-chip medium-chip">{stats.medium}</span>
              <span className="stat-chip hard-chip">{stats.hard}</span>
            </strong>
          </div>
        </article>
        <article className="admin-stat-card accent-purple">
          <div className="admin-stat-icon">🧪</div>
          <div>
            <h3>Test Cases</h3>
            <strong>
              {problems.reduce((sum, p) => sum + (p.test_cases?.length || 0), 0)}
            </strong>
            <span className="admin-stat-sub">across all problems</span>
          </div>
        </article>
      </section>

      <Toast tone="error" message={error} />

      <section className="admin-grid">
        <article className="admin-panel">
          <div className="admin-panel-header">
            <h3>Problem Bank</h3>
            <Button type="button" onClick={() => navigate("/admin/problems/new")}>
              Add Problem
            </Button>
          </div>

          <div className="admin-filters">
            <input
              className="admin-search-input"
              type="text"
              placeholder="Search by title or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="admin-filter-select"
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select
              className="admin-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(search || filterDifficulty !== "all" || filterStatus !== "all") && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setFilterDifficulty("all");
                  setFilterStatus("all");
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {loading ? (
            <Spinner />
          ) : filteredProblems.length === 0 ? (
            <EmptyState
              title={problems.length === 0 ? "No problems found" : "No matching problems"}
              description={
                problems.length === 0
                  ? "Use the Add Problem button to create your first problem."
                  : "Try adjusting your search or filters."
              }
            />
          ) : (
            <>
              <div className="admin-result-count">
                Showing {filteredProblems.length} of {problems.length} problem{problems.length !== 1 ? "s" : ""}
              </div>
              <div className="problem-list">
                {filteredProblems.map((problem) => (
                  <div key={problem.id} className="problem-card">
                    <div className="problem-card-top">
                      <div className="problem-card-main">
                        <h4>{problem.title}</h4>
                        <div className="problem-meta">
                          <span className={`problem-difficulty ${problem.difficulty}`}>
                            {DIFFICULTY_ICON[problem.difficulty]} {problem.difficulty}
                          </span>
                          <span className="problem-meta-item">
                            ⏱ {problem.time_limit_ms}ms
                          </span>
                          <span className="problem-meta-item">
                            💾 {problem.memory_limit_mb}MB
                          </span>
                          <span className="problem-meta-item">
                            🧪 {problem.test_cases?.length || 0} tests
                          </span>
                          <span className={`problem-status-badge ${problem.is_active ? "active" : "inactive"}`}>
                            {problem.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <div className="problem-card-actions">
                        <Button type="button" variant="secondary" style={{ padding: "6px 12px", fontSize: 12 }}>
                          Edit
                        </Button>
                      </div>
                    </div>
                    <p className="problem-description">{problem.description}</p>
                    {problem.tags?.length ? (
                      <div className="admin-chip-row">
                        {problem.tags.map((tag) => (
                          <span key={`${problem.id}-${tag}`} className="admin-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
