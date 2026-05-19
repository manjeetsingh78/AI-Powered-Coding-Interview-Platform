import { useEffect, useMemo, useState } from "react";

import { listProblems } from "../../api/problems.api";
import "../../assets/styles/app-shell.css";
import AIFeedbackCard from "../../components/feedback/AIFeedbackCard";
import LeaderboardTable from "../../components/leaderboard/LeaderboardTable";
import ScoreChart from "../../components/leaderboard/ScoreChart";
import { EmptyState } from "../../components/ui";
import useLeaderboard from "../../hooks/useLeaderboard";

export default function ResultsPage() {
  const [problems, setProblems] = useState([]);
  const { rows: leaderboardRows } = useLeaderboard();

  useEffect(() => {
    const load = async () => {
      const result = await listProblems();
      if (result.ok) {
        setProblems(result.data?.problems || []);
      }
    };
    load();
  }, []);

  const analytics = useMemo(() => {
    const total = problems.length;
    if (!total) {
      return { total: 0, avgAcceptance: 0, strongest: "-", weakest: "-" };
    }

    const byDifficulty = { easy: [], medium: [], hard: [] };
    problems.forEach((problem) => {
      byDifficulty[problem.difficulty]?.push(Number(problem.acceptance_rate || 0));
    });

    const avgByDifficulty = Object.fromEntries(
      Object.entries(byDifficulty).map(([key, values]) => [
        key,
        values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
      ])
    );

    const ranked = Object.entries(avgByDifficulty).sort((a, b) => b[1] - a[1]);

    return {
      total,
      avgAcceptance: Math.round(
        problems.reduce((sum, problem) => sum + Number(problem.acceptance_rate || 0), 0) / total
      ),
      strongest: ranked[0]?.[0] || "-",
      weakest: ranked[ranked.length - 1]?.[0] || "-",
      avgByDifficulty,
    };
  }, [problems]);

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Performance Results</h2>
        <p>Review score trends and keep improving with clear difficulty-based insights.</p>
      </section>

      <section className="metric-grid">
        <article className="metric-card"><span>Problems Analyzed</span><strong>{analytics.total}</strong></article>
        <article className="metric-card"><span>Avg Acceptance</span><strong>{analytics.avgAcceptance}%</strong></article>
        <article className="metric-card"><span>Strongest Area</span><strong>{analytics.strongest}</strong></article>
        <article className="metric-card"><span>Focus Next</span><strong>{analytics.weakest}</strong></article>
      </section>

      <section className="panel">
        <h3>Difficulty Breakdown</h3>
        <div className="problem-list-grid">
          {Object.entries(analytics.avgByDifficulty || {}).map(([difficulty, score]) => (
            <article key={difficulty} className="problem-item">
              <h4>{difficulty.toUpperCase()}</h4>
              <div className="badge-row">
                <span className={`badge ${difficulty}`}>{difficulty}</span>
                <span className="badge">Avg Acceptance {score}%</span>
              </div>
              <p>Use this metric to decide where to practice next.</p>
            </article>
          ))}
          {!analytics.total ? <EmptyState title="No data available" description="Submit attempts to generate performance analytics." /> : null}
        </div>
      </section>

      <section className="panel">
        <AIFeedbackCard
          feedback={{
            verdict: analytics.avgAcceptance >= 70 ? "hire" : analytics.avgAcceptance >= 50 ? "maybe" : "no-hire",
            similarity: Math.max(0, 100 - analytics.avgAcceptance),
            quality_score: analytics.avgAcceptance,
            summary: "AI feedback is generated from your acceptance trends and problem difficulty performance.",
            strengths: [
              `Strongest area: ${analytics.strongest}`,
              `Next focus area: ${analytics.weakest}`,
            ],
          }}
        />
      </section>

      <section className="app-grid">
        <article className="panel">
          <h3>Leaderboard Snapshot</h3>
          <LeaderboardTable rows={leaderboardRows} />
        </article>
        <article className="panel">
          <ScoreChart rows={leaderboardRows} />
        </article>
      </section>
    </div>
  );
}
