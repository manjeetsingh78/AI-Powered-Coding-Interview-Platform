import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { confirmPasswordReset, requestPasswordReset } from "../../api/auth.api";
import "../../assets/styles/auth.css";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("request");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const emailInputRef = useRef(null);
  const codeInputRef = useRef(null);
  const [form, setForm] = useState({
    email: "",
    code: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    if (step === "request") {
      emailInputRef.current?.focus();
    } else {
      codeInputRef.current?.focus();
    }
  }, [step]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "code" ? value.replace(/\D/g, "").slice(0, 6) : value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRequest = async (e) => {
    e.preventDefault();

    if (!form.email) {
      setErrors({ email: "Email is required." });
      return;
    }

    setLoading(true);
    setErrors({});
    setMessage("");

    try {
      const response = await requestPasswordReset({ email: form.email });
      if (response.ok) {
        setMessage("Password reset code sent to your email.");
        setStep("reset");
      } else {
        setErrors({ general: response.data?.error || "Failed to send reset code." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();

    if (!form.code || form.code.length !== 6) {
      setErrors({ code: "Enter a valid 6-digit code." });
      return;
    }
    if (!form.new_password || form.new_password.length < 6) {
      setErrors({ new_password: "Password must be at least 6 characters." });
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setErrors({ confirm_password: "Passwords do not match." });
      return;
    }

    setLoading(true);
    setErrors({});
    setMessage("");

    try {
      const response = await confirmPasswordReset({
        email: form.email,
        code: form.code,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });

      if (response.ok) {
        setMessage("Password reset successful. Redirecting to login...");
        setTimeout(() => navigate("/login"), 1800);
      } else {
        setErrors({ general: response.data?.error || "Failed to reset password." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--interactive">
      <div className="auth-container">
        <div className="auth-card auth-card--interactive reset-card">
          <div className="auth-header">
            <h1 className="info-title"><ShieldCheck className="auth-icon" /> Reset Password</h1>
            <p>{step === "request" ? "Enter your email to receive a reset OTP." : "Enter the OTP and set a new password."}</p>
          </div>

          <div className="reset-stepper" aria-label="Password reset progress">
            <div className={`reset-step ${step === "request" ? "active" : "done"}`}>
              <span>1</span>
              <div>
                <strong>Email</strong>
                <small>Request code</small>
              </div>
            </div>
            <div className={`reset-step ${step === "reset" ? "active" : ""}`}>
              <span>2</span>
              <div>
                <strong>Reset</strong>
                <small>Set new password</small>
              </div>
            </div>
          </div>

          {message && (
            <div className="alert alert-success">
              <span className="alert-icon"><CheckCircle2 className="auth-icon" /></span>
              {message}
            </div>
          )}

          {errors.general && (
            <div className="alert alert-error">
              <span className="alert-icon"><ShieldCheck className="auth-icon" /></span>
              {errors.general}
            </div>
          )}

          {step === "request" ? (
            <form className="auth-form" onSubmit={handleRequest}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <div className="form-input-wrapper">
                  <span className="input-icon"><Mail className="auth-icon" /></span>
                  <input ref={emailInputRef} id="email" name="email" type="email" value={form.email} onChange={handleChange} className={`form-input ${errors.email ? "error" : ""}`} placeholder="you@example.com" />
                </div>
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Sending code..." : <>Send Reset Code <ArrowRight className="auth-icon" /></>}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleReset}>
              <div className="form-group">
                <label className="form-label" htmlFor="code">Reset Code</label>
                <div className="form-input-wrapper">
                  <span className="input-icon"><KeyRound className="auth-icon" /></span>
                  <input ref={codeInputRef} id="code" name="code" type="text" value={form.code} onChange={handleChange} maxLength="6" className={`form-input code-input ${errors.code ? "error" : ""}`} placeholder="000000" />
                </div>
                {errors.code && <span className="error-text">{errors.code}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new_password">New Password</label>
                <div className="form-input-wrapper">
                  <span className="input-icon"><Lock className="auth-icon" /></span>
                  <input id="new_password" name="new_password" type="password" value={form.new_password} onChange={handleChange} className={`form-input ${errors.new_password ? "error" : ""}`} placeholder="New password" />
                </div>
                {errors.new_password && <span className="error-text">{errors.new_password}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm_password">Confirm Password</label>
                <div className="form-input-wrapper">
                  <span className="input-icon"><Lock className="auth-icon" /></span>
                  <input id="confirm_password" name="confirm_password" type="password" value={form.confirm_password} onChange={handleChange} className={`form-input ${errors.confirm_password ? "error" : ""}`} placeholder="Confirm password" />
                </div>
                {errors.confirm_password && <span className="error-text">{errors.confirm_password}</span>}
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Resetting..." : <>Reset Password <Sparkles className="auth-icon" /></>}
              </button>
            </form>
          )}

          <div className="auth-divider">
            <span>Need help?</span>
          </div>

          <div className="auth-footer">
            <Link to="/login" className="link-subtle"><ArrowLeft className="auth-icon" /> Back to Login</Link>
          </div>
        </div>

        <div className="auth-info">
          <div className="info-card reset-info-card">
            <h3 className="info-title"><Sparkles className="auth-icon" /> Professional Recovery</h3>
            <p>Secure OTP-based password recovery designed for fast account access.</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><ShieldCheck className="auth-icon" /> Secure Reset</h3>
            <p>A one-time code is sent to your registered email address.</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><KeyRound className="auth-icon" /> Simple Recovery</h3>
            <p>Verify the code and create a new password in a few seconds.</p>
          </div>
        </div>
      </div>
    </div>
  );
}