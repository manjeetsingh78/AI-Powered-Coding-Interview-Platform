import { Link } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Target } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="auth-page register-page">
      <section className="auth-card register-chooser" aria-label="Choose account type">
        <header className="auth-header register-header">
          <p className="register-badge">Get Started</p>
          <h1>Create Your Account</h1>
          <p>Pick your role to unlock a tailored interview workflow.</p>
        </header>

        <div className="choice-grid">
          <Link className="choice-card" to="/register/user">
            <span className="choice-icon" aria-hidden="true">
              <Target className="auth-icon" />
            </span>
            <span className="choice-content">
              <strong>Register as Candidate</strong>
              <small>Solve coding assessments, track attempts, and monitor growth.</small>
            </span>
            <span className="choice-arrow" aria-hidden="true">
              <ArrowRight className="auth-icon" />
            </span>
          </Link>

          <Link className="choice-card" to="/register/interviewer">
            <span className="choice-icon" aria-hidden="true">
              <BriefcaseBusiness className="auth-icon" />
            </span>
            <span className="choice-content">
              <strong>Register as Recruiter</strong>
              <small>Create hiring rounds, evaluate submissions, and shortlist talent.</small>
            </span>
            <span className="choice-arrow" aria-hidden="true">
              <ArrowRight className="auth-icon" />
            </span>
          </Link>
        </div>

        <div className="auth-footer register-footer">
          <p>Already onboarded?</p>
          <Link to="/login" className="link-subtle">Go to login</Link>
        </div>
      </section>

      <aside className="auth-info register-side" aria-hidden="true">
        <div className="info-card">
          <h3>Fast Onboarding</h3>
          <p>Simple role-based registration with secure email OTP verification.</p>
        </div>
        <div className="info-card">
          <h3>Role-Specific Experience</h3>
          <p>Candidate and recruiter flows are tuned to your exact interview goals.</p>
        </div>
      </aside>
    </div>
  );
}
