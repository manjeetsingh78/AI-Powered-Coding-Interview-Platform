import { useEffect, useMemo, useState } from "react";

import { listProblems } from "../../api/problems.api";
import "../../assets/styles/app-shell.css";
import { EmptyState, Spinner } from "../../components/ui";

export default function DashboardPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await listProblems();
      if (result.ok) {
        setProblems(result.data?.problems || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const total = problems.length;
    const avgAcceptance = total
      ? Math.round(
          problems.reduce((acc, item) => acc + Number(item.acceptance_rate || 0), 0) / total
        )
      : 0;
    const hard = problems.filter((problem) => problem.difficulty === "hard").length;
    const medium = problems.filter((problem) => problem.difficulty === "medium").length;
    return { total, avgAcceptance, hard, medium };
  }, [problems]);

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Recruiter Intelligence Hub</h2>
        <p>Monitor your challenge pool and maintain a strong assessment mix for hiring quality.</p>
      </section>

      <section className="metric-grid">
        <article className="metric-card"><span>Total Challenges</span><strong>{stats.total}</strong></article>
        <article className="metric-card"><span>Medium</span><strong>{stats.medium}</strong></article>
        <article className="metric-card"><span>Hard</span><strong>{stats.hard}</strong></article>
        <article className="metric-card"><span>Avg Acceptance</span><strong>{stats.avgAcceptance}%</strong></article>
      </section>

      <section className="panel">
        <h3>Challenge Portfolio</h3>
        <div className="problem-list-grid">
          {loading ? <Spinner /> : null}
          {problems.map((problem) => (
            <article key={problem.id} className="problem-item">
              <h4>{problem.title}</h4>
              <div className="badge-row">
                <span className={`badge ${problem.difficulty}`}>{problem.difficulty}</span>
                <span className="badge">{problem.time_limit_ms}ms</span>
                <span className="badge">{problem.acceptance_rate}%</span>
              </div>
              <div className="tag-cloud">
                {(problem.tags || []).map((tag) => (
                  <span className="tag-chip" key={`${problem.slug}-${tag}`}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
          {!loading && !problems.length ? (
            <EmptyState title="No challenges available" description="Add problems from Admin dashboard." />
          ) : null}
        </div>
      </section>
    </div>
  );
}
