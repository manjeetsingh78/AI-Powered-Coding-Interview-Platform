import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { requestVerification, verifyAccount } from "../../api/auth.api";
import "../../assets/styles/auth.css";

export default function VerifyAccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [form, setForm] = useState({
    email: initialEmail,
    code: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const onVerify = async (event) => {
    event.preventDefault();
    
    if (!form.code || form.code.length !== 6) {
      setErrors({ code: "Please enter a valid 6-digit code" });
      return;
    }

    if (!form.email) {
      setErrors({ email: "Email is required" });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await verifyAccount(form);
      
      if (result.ok) {
        setSuccessMessage("Email verified successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        if (result.data?.error?.includes("expired")) {
          setErrors({
            code: "Verification code has expired. Please request a new one.",
          });
        } else {
          setErrors({
            code: result.data?.error || "Invalid verification code. Please try again.",
          });
        }
        setAttempts((prev) => prev + 1);
      }
    } catch (error) {
      setErrors({
        code: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!form.email) {
      setErrors({ email: "Please enter your email address" });
      return;
    }

    setResendLoading(true);
    setErrors({});
    setResendMessage("");

    try {
      const result = await requestVerification({ email: form.email });
      
      if (result.ok) {
        setResendMessage("Verification code sent to your email!");
        setForm((prev) => ({ ...prev, code: "" }));
        setAttempts(0);
      } else {
        setErrors({
          email: result.data?.error || "Failed to resend code. Please try again.",
        });
      }
    } catch (error) {
      setErrors({
        email: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "code") {
      // Only allow numbers and limit to 6 digits
      const code = value.replace(/\D/g, "").slice(0, 6);
      setForm((prev) => ({ ...prev, [name]: code }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="auth-page auth-page--interactive">
      <div className="auth-container">
        <div className="auth-card auth-card--interactive">
          <div className="auth-header">
            <h1 className="info-title"><ShieldCheck className="auth-icon" /> Verify Your Email</h1>
            <p>We've sent a verification code to your email address</p>
          </div>

          {successMessage && (
            <div className="alert alert-success">
              <span className="alert-icon"><CheckCircle2 className="auth-icon" /></span>
              {successMessage}
            </div>
          )}

          {resendMessage && (
            <div className="alert alert-success">
              <span className="alert-icon"><CheckCircle2 className="auth-icon" /></span>
              {resendMessage}
            </div>
          )}

          <form onSubmit={onVerify} className="auth-form">
            {errors.general && (
              <div className="alert alert-error">
                <span className="alert-icon"><AlertCircle className="auth-icon" /></span>
                {errors.general}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="form-input-wrapper">
                <span className="input-icon"><Mail className="auth-icon" /></span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className={`form-input ${errors.email ? "error" : ""}`}
                  placeholder="your@email.com"
                  required
                />
              </div>
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="code" className="form-label">
                Verification Code
              </label>
              <p className="form-hint">Enter the 6-digit code from your email</p>
              <div className="form-input-wrapper">
                <span className="input-icon"><Lock className="auth-icon" /></span>
                <input
                  id="code"
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  maxLength="6"
                  placeholder="000000"
                  className={`form-input code-input ${errors.code ? "error" : ""}`}
                  required
                  autoFocus
                />
              </div>
              {errors.code && <span className="error-text">{errors.code}</span>}
              {attempts > 2 && (
                <div className="form-hint warning">
                  <AlertCircle className="auth-icon" /> Multiple failed attempts. Try resending the code.
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>Need another code?</span>
          </div>

          <button
            type="button"
            onClick={onResend}
            className="btn btn-secondary btn-block"
            disabled={resendLoading}
          >
            {resendLoading ? (
              <>
                <span className="spinner"></span>
                Sending...
              </>
            ) : (
              "Resend Verification Code"
            )}
          </button>

          <div className="auth-footer">
            <Link to="/login" className="link-subtle">
              <ArrowLeft className="auth-icon" /> Back to Login
            </Link>
            <span>or</span>
            <Link to="/register" className="link-subtle">
              Create Account <ArrowRight className="auth-icon" />
            </Link>
          </div>
        </div>

        <div className="verify-info">
          <div className="info-card">
            <h3 className="info-title"><MessageCircle className="auth-icon" /> Check Your Email</h3>
            <p>Look for an email from us. If it's not in your inbox, check your spam folder.</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><Clock3 className="auth-icon" /> Code Expires</h3>
            <p>Your verification code is valid for 10 minutes. Request a new one if it expires.</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><ShieldCheck className="auth-icon" /> Security</h3>
            <p>Never share your verification code with anyone else.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
