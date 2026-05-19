import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listProblems } from "../../api/problems.api";
import { listSubmissionHistory } from "../../api/submissions.api";
import { listAssessments } from "../../api/assessments.api";
import { getMyStats } from "../../api/analytics.api";
import "../../assets/styles/app-shell.css";
import { Button, EmptyState, Input, Select, Spinner } from "../../components/ui";

function getDifficultyColor(difficulty) {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return "#065f46";
    case "medium":
      return "#92400e";
    case "hard":
      return "#991b1b";
    default:
      return "#0f172a";
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [myStats, setMyStats] = useState({ total_problems: 0, avg_acceptance: 0 });
  const [assessments, setAssessments] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  const loadProblems = useCallback(async (nextSearch = search, nextDifficulty = difficulty) => {
    setLoading(true);
    const result = await listProblems({ search: nextSearch, difficulty: nextDifficulty });
    if (result.ok) {
      setProblems(result.data?.problems || []);
    }
    setLoading(false);
  }, [search, difficulty]);

  useEffect(() => {
    loadProblems("", "");
  }, []);

  useEffect(() => {
    const loadSubmissions = async () => {
      setSubmissionsLoading(true);
      const res = await listSubmissionHistory();
      if (res.ok) {
        setSubmissions(res.data?.submissions || []);
      }
      setSubmissionsLoading(false);
    };

    const loadStats = async () => {
      setStatsLoading(true);
      const res = await getMyStats();
      if (res.ok) {
        setMyStats(res.data || { total_problems: 0, avg_acceptance: 0 });
      }
      setStatsLoading(false);
    };

    const loadAssessments = async () => {
      setAssessmentsLoading(true);
      const res = await listAssessments();
      if (res.ok) {
        setAssessments(res.data?.assessments || []);
      }
      setAssessmentsLoading(false);
    };

    loadSubmissions();
    loadStats();
    loadAssessments();
  }, []);

  const stats = useMemo(() => {
    const total = problems.length;
    const easy = problems.filter((p) => p.difficulty === "easy").length;
    const medium = problems.filter((p) => p.difficulty === "medium").length;
    const hard = problems.filter((p) => p.difficulty === "hard").length;
    return { total, easy, medium, hard };
  }, [problems]);

  const solvedCount = useMemo(() => {
    return submissions.filter((s) => s.status === "Accepted").length;
  }, [submissions]);

  const streak = useMemo(() => {
    if (!submissions.length) return 0;
    const sorted = [...submissions].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    const uniqueDays = new Set();
    let currentStreak = 0;
    let lastDate = null;
    for (const s of sorted) {
      const dateStr = new Date(s.submitted_at).toDateString();
      if (!lastDate) {
        lastDate = new Date(s.submitted_at);
        uniqueDays.add(dateStr);
        currentStreak = 1;
        continue;
      }
      const currentDate = new Date(s.submitted_at);
      const diffDays = Math.round((lastDate - currentDate) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1 && !uniqueDays.has(dateStr)) {
        currentStreak++;
        uniqueDays.add(dateStr);
      }
    }
    return currentStreak;
  }, [submissions]);

  const recentSubmissions = useMemo(() => {
    return [...submissions]
      .sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0))
      .slice(0, 5);
  }, [submissions]);

  const upcomingAssessments = useMemo(() => {
    return [...assessments].slice(0, 3);
  }, [assessments]);

  const handleStartSolving = (problemSlug) => {
    if (!problemSlug) return;
    navigate(`/candidate/solve/${problemSlug}`);
  };

  const handleViewDetails = (problemSlug) => {
    if (!problemSlug) return;
    navigate(`/candidate/solve/${problemSlug}`);
  };

  const acceptanceRate = useMemo(() => {
    if (!submissions.length) return 0;
    const accepted = submissions.filter((s) => s.status === "Accepted").length;
    return Math.round((accepted / submissions.length) * 100);
  }, [submissions]);

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <div className="app-hero-content">
          <h2>Welcome, Candidate</h2>
          <p>Your personal coding workspace. Explore problems, track progress, and level up your skills.</p>
        </div>
        <div className="hero-stats-row">
          <div className="hero-stat">
            <span className="hero-stat-value">{statsLoading ? "-" : solvedCount}</span>
            <span className="hero-stat-label">Solved</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">{statsLoading ? "-" : `${acceptanceRate}%`}</span>
            <span className="hero-stat-label">Acceptance</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">{statsLoading ? "-" : streak}</span>
            <span className="hero-stat-label">Day Streak</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">{statsLoading ? "-" : myStats.total_problems}</span>
            <span className="hero-stat-label">Problems</span>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card metric-card-accent">
          <span>Total Problems</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="metric-card metric-card-easy">
          <span>Easy</span>
          <strong>{stats.easy}</strong>
        </article>
        <article className="metric-card metric-card-medium">
          <span>Medium</span>
          <strong>{stats.medium}</strong>
        </article>
        <article className="metric-card metric-card-hard">
          <span>Hard</span>
          <strong>{stats.hard}</strong>
        </article>
      </section>

      <section className="app-toolbar">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search problems by title"
        />
        <Select
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
          options={[
            { label: "All Difficulties", value: "" },
            { label: "Easy", value: "easy" },
            { label: "Medium", value: "medium" },
            { label: "Hard", value: "hard" },
          ]}
        />
        <Button type="button" onClick={() => loadProblems(search, difficulty)}>
          Apply Filters
        </Button>
      </section>

      <div className="dashboard-main-grid">
        <div className="dashboard-content">
          <section className="panel problems-panel">
            <h3>Problem Catalog</h3>
            {loading ? (
              <div className="panel-spinner">
                <Spinner />
              </div>
            ) : (
              <div className="problem-list-grid">
                {problems.map((problem) => (
                  <article key={problem.id} className="problem-card">
                    <div className="problem-card-header">
                      <h4>{problem.title}</h4>
                      <span
                        className={`badge ${problem.difficulty}`}
                        style={{ color: getDifficultyColor(problem.difficulty) }}
                      >
                        {problem.difficulty}
                      </span>
                    </div>
                    <div className="badge-row">
                      <span className="badge">{problem.time_limit_ms}ms</span>
                      <span className="badge">{problem.memory_limit_mb}MB</span>
                      <span className="badge">{problem.acceptance_rate}% acceptance</span>
                    </div>
                    <div className="tag-cloud">
                      {(problem.tags || []).slice(0, 5).map((tag) => (
                        <span key={`${problem.id}-${tag}`} className="tag-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="problem-card-actions">
                      <Button
                        type="button"
                        onClick={() => handleStartSolving(problem.slug)}
                      >
                        Start Solving
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleViewDetails(problem.slug)}
                      >
                        View Details
                      </Button>
                    </div>
                  </article>
                ))}
                {!problems.length ? (
                  <EmptyState
                    title="No problems found"
                    description="Try different filter criteria."
                  />
                ) : null}
              </div>
            )}
          </section>
        </div>

        <div className="dashboard-sidebar">
          <section className="panel progress-panel">
            <h3>Your Progress</h3>
            <div className="progress-stat-row">
              <div className="progress-stat">
                <div className="progress-stat-label">Solved</div>
                <div className="progress-stat-value">{solvedCount}</div>
              </div>
              <div className="progress-stat">
                <div className="progress-stat-label">Acceptance</div>
                <div className="progress-stat-value">{acceptanceRate}%</div>
              </div>
              <div className="progress-stat">
                <div className="progress-stat-label">Streak</div>
                <div className="progress-stat-value value-fire">{streak} days</div>
              </div>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${stats.total > 0 ? Math.round((solvedCount / stats.total) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="progress-bar-text">
              {solvedCount} of {stats.total} problems solved
            </p>
          </section>

          <section className="panel submissions-panel">
            <h3>Recent Submissions</h3>
            {submissionsLoading ? (
              <div className="panel-spinner">
                <Spinner />
              </div>
            ) : recentSubmissions.length === 0 ? (
              <EmptyState
                title="No submissions yet"
                description="Start solving problems to see your history."
                compact
              />
            ) : (
              <div className="submission-list">
                {recentSubmissions.map((submission) => (
                  <div key={submission.id} className="submission-item">
                    <div className="submission-info">
                      <span className="submission-problem">
                        {submission.problem_slug || "Problem"}
                      </span>
                      <span className="submission-time">
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="submission-badges">
                      <span
                        className={`submission-status ${
                          submission.status === "Accepted"
                            ? "status-accepted"
                            : submission.status === "Wrong Answer"
                            ? "status-wrong"
                            : "status-other"
                        }`}
                      >
                        {submission.status}
                      </span>
                      <span className="submission-score">
                        {submission.score || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel assessments-panel">
            <h3>Upcoming Assessments</h3>
            {assessmentsLoading ? (
              <div className="panel-spinner">
                <Spinner />
              </div>
            ) : upcomingAssessments.length === 0 ? (
              <EmptyState
                title="No upcoming assessments"
                description="Check back later for scheduled tests."
                compact
              />
            ) : (
              <div className="assessment-list">
                {upcomingAssessments.map((assessment) => (
                  <div key={assessment.id} className="assessment-item">
                    <h5>{assessment.title || "Untitled Assessment"}</h5>
                    <p className="assessment-meta">
                      {assessment.duration_minutes
                        ? `${assessment.duration_minutes} min`
                        : "Not time-bound"}
                    </p>
                    <p className="assessment-meta">
                      {assessment.problem_ids?.length || 0} problems
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
