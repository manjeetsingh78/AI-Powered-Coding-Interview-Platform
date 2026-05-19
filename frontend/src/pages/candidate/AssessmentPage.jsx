import { useEffect, useMemo, useState } from "react";

import { listProblems } from "../../api/problems.api";
import "../../assets/styles/app-shell.css";
import { Button, EmptyState, ProgressBar, Spinner, Timer } from "../../components/ui";

const ASSESSMENT_SECONDS = 45 * 60;

export default function AssessmentPage() {
  const [problems, setProblems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(ASSESSMENT_SECONDS);
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

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          setRunning(false);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const onToggle = () => {
      if (!running) {
        setSecondsLeft(ASSESSMENT_SECONDS);
      }
      setRunning((previous) => !previous);
    };

    window.addEventListener("palette:assessment:toggle", onToggle);
    return () => window.removeEventListener("palette:assessment:toggle", onToggle);
  }, [running]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!event.altKey || event.key.toLowerCase() !== "s") return;

      const target = event.target;
      const tag = String(target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;

      event.preventDefault();
      if (!running) {
        setSecondsLeft(ASSESSMENT_SECONDS);
      }
      setRunning((previous) => !previous);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [running]);

  const toggleProblem = (id) => {
    setSelectedIds((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
    );
  };

  const formattedTime = useMemo(() => secondsLeft, [secondsLeft]);
  const readiness = useMemo(() => {
    if (!problems.length) return 0;
    return Math.round((selectedIds.length / Math.min(6, problems.length)) * 100);
  }, [selectedIds.length, problems.length]);

  const addRecommendedSet = () => {
    const easy = problems.find((problem) => problem.difficulty === "easy");
    const medium = problems.filter((problem) => problem.difficulty === "medium").slice(0, 2);
    const hard = problems.find((problem) => problem.difficulty === "hard");
    const ids = [easy?.id, ...medium.map((problem) => problem.id), hard?.id].filter(Boolean);
    setSelectedIds(Array.from(new Set(ids)));
  };

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Assessment Room</h2>
        <p>Create a focused set of problems and run a realistic timed mock interview session.</p>
      </section>

      <section className="app-toolbar">
        <div className="timer-chip">Timer: <Timer seconds={formattedTime} /></div>
        <div className="badge">Selected: {selectedIds.length}</div>
        <Button type="button" variant="secondary" onClick={addRecommendedSet}>Auto Build Set</Button>
        <Button
          type="button"
          onClick={() => {
            if (!running) {
              setSecondsLeft(ASSESSMENT_SECONDS);
            }
            setRunning((prev) => !prev);
          }}
        >
          {running ? "Pause Session" : "Start Session"}
        </Button>
      </section>

      <section className="panel">
        <h3>Assessment Readiness</h3>
        <p className="detail-empty">Recommended set size is 4 to 6 problems with mixed difficulty.</p>
        <ProgressBar value={readiness} />
      </section>

      <section className="panel">
        <h3>Choose Problems For This Session</h3>
        <div className="problem-list-grid">
          {loading ? <Spinner /> : null}
          {problems.map((problem) => (
            <article key={problem.id} className="problem-item">
              <h4>{problem.title}</h4>
              <div className="badge-row">
                <span className={`badge ${problem.difficulty}`}>{problem.difficulty}</span>
                <span className="badge">{problem.time_limit_ms}ms</span>
              </div>
              <Button type="button" variant="secondary" onClick={() => toggleProblem(problem.id)}>
                {selectedIds.includes(problem.id) ? "Remove" : "Add to Assessment"}
              </Button>
            </article>
          ))}
          {!loading && !problems.length ? (
            <EmptyState title="No problems available" description="Add problems first from admin workspace." />
          ) : null}
        </div>
      </section>
    </div>
  );
}
