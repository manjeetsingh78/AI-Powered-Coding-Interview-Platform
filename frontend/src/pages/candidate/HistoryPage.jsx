import { useEffect, useMemo, useState } from "react";

import { listSubmissionHistory } from "../../api/submissions.api";
import "../../assets/styles/app-shell.css";
import { Button, EmptyState } from "../../components/ui";

export default function HistoryPage() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      const result = await listSubmissionHistory();
      if (!result.ok) return;

      const normalizedRows = (result.data?.submissions || []).slice(0, 20).map((item, index) => ({
        id: item.id || `${index}`,
        title: item.problem_slug || "Problem",
        difficulty: item.difficulty || "medium",
        status: item.status || "Submitted",
        score: Number(item.score || 0),
        submitted_at: item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "-",
      }));
      setRows(normalizedRows);
    };
    load();
  }, []);

  const acceptedCount = useMemo(() => rows.filter((row) => row.status === "Accepted").length, [rows]);
  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((row) => String(row.status).toLowerCase() === statusFilter);
  }, [rows, statusFilter]);

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Submission History</h2>
        <p>Track every attempt, monitor progress, and identify patterns in your coding performance.</p>
      </section>

      <section className="metric-grid">
        <article className="metric-card"><span>Total Attempts</span><strong>{rows.length}</strong></article>
        <article className="metric-card"><span>Accepted</span><strong>{acceptedCount}</strong></article>
        <article className="metric-card"><span>Pending Review</span><strong>{Math.max(0, rows.length - acceptedCount - 2)}</strong></article>
        <article className="metric-card"><span>Avg Score</span><strong>{rows.length ? Math.round(rows.reduce((a, b) => a + b.score, 0) / rows.length) : 0}</strong></article>
      </section>

      <section className="panel">
        <h3>Recent Attempts</h3>
        <div className="badge-row" style={{ marginBottom: 12 }}>
          <Button type="button" variant={statusFilter === "all" ? "primary" : "secondary"} onClick={() => setStatusFilter("all")}>All</Button>
          <Button type="button" variant={statusFilter === "accepted" ? "primary" : "secondary"} onClick={() => setStatusFilter("accepted")}>Accepted</Button>
          <Button type="button" variant={statusFilter === "wrong answer" ? "primary" : "secondary"} onClick={() => setStatusFilter("wrong answer")}>Wrong Answer</Button>
        </div>
        <div className="problem-list-grid">
          {filteredRows.map((row) => (
            <article key={row.id} className="problem-item">
              <h4>{row.title}</h4>
              <div className="badge-row">
                <span className={`badge ${row.difficulty}`}>{row.difficulty}</span>
                <span className="badge">{row.status}</span>
                <span className="badge">Score {row.score}</span>
              </div>
              <p>Submitted: {row.submitted_at}</p>
            </article>
          ))}
          {!filteredRows.length ? <EmptyState title="No submissions yet" description="Start solving to build your timeline." /> : null}
        </div>
      </section>
    </div>
  );
}
