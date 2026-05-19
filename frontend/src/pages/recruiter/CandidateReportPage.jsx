import { useEffect, useMemo, useState } from "react";

import { listCandidateReports, saveCandidateReport } from "../../api/workflows.api";
import "../../assets/styles/app-shell.css";
import { Button, Select, Spinner, Toast } from "../../components/ui";

const CANDIDATES = [
  { id: 1, name: "Aman Gupta", score: 84, status: "Strong" },
  { id: 2, name: "Riya Sharma", score: 72, status: "Moderate" },
  { id: 3, name: "Kabir Singh", score: 61, status: "Review" },
];

export default function CandidateReportPage() {
  const [loading, setLoading] = useState(false);
  const [notesById, setNotesById] = useState({});
  const [verdictById, setVerdictById] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reportByCandidateName = useMemo(() => {
    const map = {};
    CANDIDATES.forEach((candidate) => {
      map[candidate.name] = {
        verdict: verdictById[candidate.id] || "",
        notes: notesById[candidate.id] || "",
      };
    });
    return map;
  }, [notesById, verdictById]);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      const result = await listCandidateReports();
      if (!result.ok) {
        setLoading(false);
        return;
      }

      const notesMap = {};
      const verdictMap = {};
      const reports = result.data?.reports || [];
      CANDIDATES.forEach((candidate) => {
        const found = reports.find((report) => report.candidate_name === candidate.name);
        if (found) {
          notesMap[candidate.id] = found.notes || "";
          verdictMap[candidate.id] = found.verdict || "";
        }
      });
      setNotesById(notesMap);
      setVerdictById(verdictMap);
      setLoading(false);
    };

    loadReports();
  }, []);

  const onSave = async (candidate) => {
    setMessage("");
    setError("");
    const result = await saveCandidateReport({
      candidate_name: candidate.name,
      score: candidate.score,
      status: candidate.status,
      verdict: reportByCandidateName[candidate.name]?.verdict || "",
      notes: reportByCandidateName[candidate.name]?.notes || "",
    });

    if (!result.ok) {
      setError(result.data?.error || `Unable to save report for ${candidate.name}.`);
      return;
    }

    setMessage(`Report saved for ${candidate.name}.`);
  };

  return (
    <div className="app-shell dashboard-shell">
      <section className="app-hero">
        <h2>Candidate Report Studio</h2>
        <p>Capture evaluator notes, assign verdicts, and keep hiring decisions structured.</p>
      </section>
      <Toast tone="success" message={message} />
      <Toast tone="error" message={error} />

      <section className="panel">
        <h3>Evaluation Queue</h3>
        <div className="problem-list-grid">
          {loading ? <Spinner /> : null}
          {CANDIDATES.map((candidate) => (
            <article key={candidate.id} className="problem-item">
              <h4>{candidate.name}</h4>
              <div className="badge-row">
                <span className="badge">Score {candidate.score}</span>
                <span className="badge">{candidate.status}</span>
              </div>

              <label>
                Verdict
                <Select
                  options={[
                    { label: "Select Verdict", value: "" },
                    { label: "Hire", value: "hire" },
                    { label: "Consider", value: "consider" },
                    { label: "Reject", value: "reject" },
                  ]}
                  value={verdictById[candidate.id] || ""}
                  onChange={(event) =>
                    setVerdictById((prev) => ({ ...prev, [candidate.id]: event.target.value }))
                  }
                />
              </label>

              <div className="badge-row">
                <Button type="button" variant="secondary" onClick={() => setVerdictById((prev) => ({ ...prev, [candidate.id]: "hire" }))}>Quick Hire</Button>
                <Button type="button" variant="secondary" onClick={() => setVerdictById((prev) => ({ ...prev, [candidate.id]: "consider" }))}>Quick Consider</Button>
                <Button type="button" variant="secondary" onClick={() => setVerdictById((prev) => ({ ...prev, [candidate.id]: "reject" }))}>Quick Reject</Button>
              </div>

              <label>
                Notes
                <textarea
                  rows={3}
                  value={notesById[candidate.id] || ""}
                  onChange={(event) =>
                    setNotesById((prev) => ({ ...prev, [candidate.id]: event.target.value }))
                  }
                  placeholder="Add strengths, concerns, and interview feedback"
                />
              </label>

              <Button type="button" onClick={() => onSave(candidate)}>Save Report</Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
