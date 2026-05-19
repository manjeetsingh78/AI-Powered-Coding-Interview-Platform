import { useEffect, useMemo, useState } from "react";

import { listProblems } from "../../api/problems.api";
import { createTestDraft } from "../../api/workflows.api";
import "../../assets/styles/app-shell.css";
import { Button, Input, Spinner, Toast } from "../../components/ui";

export default function CreateTestPage() {
  const [problems, setProblems] = useState([]);
  const [selectedProblemIds, setSelectedProblemIds] = useState([]);
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedProblems = useMemo(
    () => problems.filter((problem) => selectedProblemIds.includes(problem.id)),
    [problems, selectedProblemIds]
  );

  const distribution = useMemo(() => {
    return selectedProblems.reduce(
      (accumulator, item) => {
        accumulator[item.difficulty] = (accumulator[item.difficulty] || 0) + 1;
        return accumulator;
      },
      { easy: 0, medium: 0, hard: 0 }
    );
  }, [selectedProblems]);

  const applySuggestedMix = () => {
    const easy = problems.find((problem) => problem.difficulty === "easy");
    const medium = problems.filter((problem) => problem.difficulty === "medium").slice(0, 2);
    const hard = problems.find((problem) => problem.difficulty === "hard");
    const ids = [easy?.id, ...medium.map((problem) => problem.id), hard?.id].filter(Boolean);
    setSelectedProblemIds(Array.from(new Set(ids)));
  };

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

  const toggleProblem = (id) => {
    setSelectedProblemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const createDraft = async () => {
    setMessage("");
    setError("");
    if (!title.trim() || !selectedProblemIds.length) {
      setError("Title and at least one problem are required.");
      return;
    }

    setSaving(true);
    const result = await createTestDraft({
      title: title.trim(),
      duration_minutes: Number(durationMinutes),
      problem_ids: selectedProblemIds,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.data?.error || "Unable to create test draft.");
      return;
    }

    setMessage("Test draft created and saved to database.");
    setTitle("");
    setDurationMinutes(60);
    setSelectedProblemIds([]);
  };

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Create Assessment Test</h2>
        <p>Build recruiter-ready coding assessments by selecting problems from your live bank.</p>
      </section>

      <Toast tone="success" message={message} />
      <Toast tone="error" message={error} />

      <section className="app-grid">
        <article className="panel">
          <h3>Test Configuration</h3>
          <div className="admin-form">
            <Input
              label="Test Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Frontend Hiring Round"
            />
            <Input
              label="Duration (minutes)"
              type="number"
              min={15}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
            />
            <Button type="button" variant="secondary" onClick={applySuggestedMix}>
              Apply Suggested Mix (1E 2M 1H)
            </Button>
            <Button type="button" onClick={createDraft} loading={saving}>
              Save Test Draft
            </Button>
            <div className="badge-row">
              <span className="badge">Selected {selectedProblemIds.length}</span>
              <span className="badge easy">Easy {distribution.easy}</span>
              <span className="badge medium">Medium {distribution.medium}</span>
              <span className="badge hard">Hard {distribution.hard}</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <h3>Available Problems</h3>
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
                  {selectedProblemIds.includes(problem.id) ? "Remove" : "Add Problem"}
                </Button>
              </article>
            ))}
            {!problems.length && <p className="detail-empty">No problems available yet.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
