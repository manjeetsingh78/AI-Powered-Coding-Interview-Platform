import { useNavigate } from "react-router-dom";

import ProblemForm from "./ProblemForm";

export default function AddProblemPage() {
  const navigate = useNavigate();

  const handleSuccess = (problem) => {
    setTimeout(() => navigate("/admin/dashboard"), 800);
  };

  return (
    <div className="admin-dashboard dashboard-shell">
      <section className="admin-hero">
        <div className="admin-hero-glow" />
        <div className="admin-hero-content">
          <div>
            <h2>Add New Problem</h2>
            <p>Create a new coding problem with test cases, examples, and reference solutions. Use the step-by-step wizard to build your problem.</p>
          </div>
        </div>
      </section>

      <section className="admin-grid">
        <article className="admin-panel" style={{ padding: 0, overflow: "hidden" }}>
          <ProblemForm onSuccess={handleSuccess} onCancel={() => navigate(-1)} />
        </article>
      </section>
    </div>
  );
}