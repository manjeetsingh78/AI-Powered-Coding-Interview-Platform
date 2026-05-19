import { useEffect, useMemo, useState } from "react";

import { deleteTestDraft, listTestDrafts } from "../../api/workflows.api";
import "../../assets/styles/app-shell.css";
import LeaderboardTable from "../../components/leaderboard/LeaderboardTable";
import ScoreChart from "../../components/leaderboard/ScoreChart";
import { Button, EmptyState, Spinner, Toast } from "../../components/ui";

export default function TestDetailPage() {
  const [drafts, setDrafts] = useState([]);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadDrafts = async () => {
    setLoading(true);
    const result = await listTestDrafts();
    if (!result.ok) {
      setError(result.data?.error || "Failed to load drafts.");
      setLoading(false);
      return;
    }

    const rows = result.data?.drafts || [];
    setDrafts(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) || drafts[0] || null,
    [drafts, selectedDraftId]
  );

  const leaderboardRows = useMemo(() => {
    return (selectedDraft?.problems || []).map((problem, index) => ({
      rank: index + 1,
      name: problem.title,
      score: 100 - index * 5,
      time: `${Math.max(20, 90 - index * 8)}m`,
      language: "mixed",
    }));
  }, [selectedDraft]);

  const removeDraft = async (draftId) => {
    setMessage("");
    setError("");
    const result = await deleteTestDraft(draftId);
    if (!result.ok) {
      setError(result.data?.error || "Failed to delete draft.");
      return;
    }
    setMessage("Draft deleted.");
    await loadDrafts();
  };

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Test Detail Workspace</h2>
        <p>Inspect test drafts, review structure, and prepare interview assignments.</p>
      </section>
      <Toast tone="success" message={message} />
      <Toast tone="error" message={error} />

      <section className="app-grid">
        <article className="panel">
          <h3>Saved Test Drafts</h3>
          <div className="problem-list-grid">
            {loading ? <Spinner /> : null}
            {drafts.map((draft) => (
              <article key={draft.id} className="problem-item">
                <h4>{draft.title}</h4>
                <div className="badge-row">
                  <span className="badge">{draft.duration_minutes} mins</span>
                  <span className="badge">{draft.problems?.length || 0} problems</span>
                </div>
                <div className="admin-form-row">
                  <Button type="button" variant="secondary" onClick={() => setSelectedDraftId(draft.id)}>View Detail</Button>
                  <Button type="button" variant="danger" onClick={() => removeDraft(draft.id)}>Delete</Button>
                </div>
              </article>
            ))}
            {!loading && !drafts.length ? (
              <EmptyState title="No drafts found" description="Create one from the Create Test page." />
            ) : null}
          </div>
        </article>

        <article className="panel">
          <h3>Draft Breakdown</h3>
          {!selectedDraft ? (
            <p className="detail-empty">Select a draft to see details.</p>
          ) : (
            <>
              <h4>{selectedDraft.title}</h4>
              <div className="badge-row">
                <span className="badge">Duration {selectedDraft.duration_minutes} mins</span>
                <span className="badge">Created {new Date(selectedDraft.created_at).toLocaleString()}</span>
              </div>
              <div className="problem-list-grid">
                {(selectedDraft.problems || []).map((problem) => (
                  <article key={problem.id} className="problem-item">
                    <h4>{problem.title}</h4>
                    <div className="badge-row">
                      <span className={`badge ${problem.difficulty}`}>{problem.difficulty}</span>
                      <span className="badge">{problem.time_limit_ms}ms</span>
                    </div>
                  </article>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <LeaderboardTable rows={leaderboardRows} />
              </div>
              <div style={{ marginTop: 16 }}>
                <ScoreChart rows={leaderboardRows} />
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
