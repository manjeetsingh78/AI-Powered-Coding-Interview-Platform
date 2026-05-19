import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import "../../assets/styles/auth.css";

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const role = user?.role || "guest";

  const roleHint = {
    candidate: "/candidate/dashboard",
    user: "/candidate/dashboard",
    recruiter: "/recruiter/dashboard",
    interviewer: "/recruiter/dashboard",
    admin: "/admin/dashboard",
  }[role];

  return (
    <div className="auth-page auth-page--interactive">
      <div className="auth-container">
        <section className="auth-card auth-card--interactive" style={{ maxWidth: "620px" }}>
          <p className="register-badge">Access Restricted</p>
          <h1 className="info-title" style={{ marginBottom: "10px" }}>
            <AlertTriangle className="auth-icon" /> 403 Unauthorized
          </h1>
          <p style={{ marginBottom: "20px", color: "#5f6b7a" }}>
            This route is protected by role-based access rules. Your active role cannot open this page.
          </p>

          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            <span className="alert-icon"><ShieldCheck className="auth-icon" /></span>
            Current role: <strong>{role}</strong>
          </div>

          <div className="choice-grid" style={{ marginBottom: 16 }}>
            <Link to="/login" className="choice-card">
              <span className="choice-content">
                <strong>Sign in with another account</strong>
                <small>Switch role and continue to the right workspace.</small>
              </span>
              <span className="choice-arrow"><ArrowRight className="auth-icon" /></span>
            </Link>
            {roleHint ? (
              <Link to={roleHint} className="choice-card">
                <span className="choice-content">
                  <strong>Go to my dashboard</strong>
                  <small>Return to your allowed project workspace.</small>
                </span>
                <span className="choice-arrow"><ArrowRight className="auth-icon" /></span>
              </Link>
            ) : null}
          </div>

          <div className="auth-footer">
            <Link to="/register" className="link-subtle">Create a new account</Link>
            <span>or</span>
            <Link to="/verify" className="link-subtle">Verify existing account</Link>
          </div>
        </section>

        <aside className="auth-info">
          <div className="info-card">
            <h3 className="info-title"><Sparkles className="auth-icon" /> Why This Happens</h3>
            <p>Candidate, Recruiter, and Admin areas have separate permissions to protect assessment data.</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><ShieldCheck className="auth-icon" /> Quick Fix</h3>
            <p>Use the dashboard link for your role, or sign in with an account that has required permissions.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
