import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listProblems } from "../../api/problems.api";
import "../../assets/styles/app-shell.css";
import { Button, EmptyState, Spinner } from "../../components/ui";

export default function SolvePage() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      const result = await listProblems();
      if (result.ok) {
        setProblems(result.data?.problems || []);
      }
      setLoadingList(false);
    };
    load();
  }, []);

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Solve Arena</h2>
        <p>Choose a problem and open a dedicated coding page with split problem and editor panels.</p>
      </section>

      <section className="panel">
        <h3>Problem Queue</h3>
        <div className="problem-list-grid">
          {loadingList ? <Spinner /> : null}
          {problems.map((problem) => (
            <article key={problem.id} className="problem-item">
              <button
                type="button"
                className="problem-link-trigger"
                onClick={() => navigate(`/candidate/solve/${problem.slug}`)}
              >
                {problem.title}
              </button>
              <div className="badge-row">
                <span className={`badge ${problem.difficulty}`}>{problem.difficulty}</span>
                <span className="badge">{problem.time_limit_ms}ms</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/candidate/solve/${problem.slug}`)}
              >
                Open Problem
              </Button>
            </article>
          ))}
          {!loadingList && !problems.length ? (
            <EmptyState title="No active problems" description="The problem bank is currently empty." />
          ) : null}
        </div>
      </section>
    </div>
  );
}
