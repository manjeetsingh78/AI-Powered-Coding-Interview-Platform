import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Settings,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { requestVerification } from "../../api/auth.api";
import "../../assets/styles/auth.css";

export default function LoginPage() {
  const { login, loginAdmin, isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ 
    email: localStorage.getItem("remembered_email") || "", 
    password: "", 
    role: "user" 
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem("remembered_email"));
  const [errors, setErrors] = useState({});
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const ROLE_META = {
    user: { label: "Candidate", Icon: Target },
    interviewer: { label: "Recruiter", Icon: BriefcaseBusiness },
    admin: { label: "Admin", Icon: ShieldCheck },
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      const dashboardRoutes = {
        user: "/candidate/dashboard",
        candidate: "/candidate/dashboard",
        interviewer: "/recruiter/dashboard",
        recruiter: "/recruiter/dashboard",
        admin: "/admin/dashboard",
      };

      const redirectPath = dashboardRoutes[user.role];
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else {
        // Clear stale auth entries with unknown role values.
        logout();
      }
    }
  }, [isAuthenticated, user, navigate, logout]);

  const validateForm = () => {
    const newErrors = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!form.password || form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setResult(null);

    try {
      const payload = { email: form.email, password: form.password };
      const response = form.role === "admin" 
        ? await loginAdmin(payload) 
        : await login(payload);

      setResult(response);

      if (response.ok && response.data?.user) {
        if (rememberMe) {
          localStorage.setItem("remembered_email", form.email);
        } else {
          localStorage.removeItem("remembered_email");
        }

        const dashboardRoutes = {
          user: "/candidate/dashboard",
          candidate: "/candidate/dashboard",
          interviewer: "/recruiter/dashboard",
          recruiter: "/recruiter/dashboard",
          admin: "/admin/dashboard",
        };

        setTimeout(() => {
          navigate(dashboardRoutes[response.data.user.role] || "/candidate/dashboard");
        }, 500);
      } else if (response.status === 403) {
        setNeedsVerification(true);
        setErrors({
          general: "Your account is not verified. Please check your email for verification code.",
        });
      } else {
        setNeedsVerification(false);
        setErrors({
          general: response.data?.error || "Login failed. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (needsVerification && (name === "email" || name === "password")) {
      setNeedsVerification(false);
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleVerifyNow = async () => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrors((prev) => ({ ...prev, general: "Please enter a valid email first." }));
      return;
    }

    setVerifyLoading(true);
    try {
      await requestVerification({ email: form.email });
      navigate(`/verify?email=${encodeURIComponent(form.email)}`);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRoleChange = (e) => {
    setForm((prev) => ({ ...prev, role: e.target.value }));
  };

  const onPasswordKey = (e) => {
    setCapsLockOn(Boolean(e.getModifierState && e.getModifierState("CapsLock")));
  };

  return (
    <div className="auth-page auth-page--interactive">
      <div className="auth-container">
        <div className="auth-card auth-card--interactive">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your account to continue</p>
          </div>

          <div className="role-toggle" role="radiogroup" aria-label="Choose login role">
            {Object.entries(ROLE_META).map(([value, meta]) => (
              <button
                key={value}
                type="button"
                className={`role-pill ${form.role === value ? "active" : ""}`}
                onClick={() => setForm((prev) => ({ ...prev, role: value }))}
                role="radio"
                aria-checked={form.role === value}
              >
                <meta.Icon className="auth-icon role-pill-icon" aria-hidden="true" />
                {meta.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {errors.general && (
              <div className="alert alert-error">
                <span className="alert-icon"><AlertCircle className="auth-icon" /></span>
                {errors.general}
              </div>
            )}

            {needsVerification && (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={handleVerifyNow}
                disabled={verifyLoading}
              >
                {verifyLoading ? "Sending code..." : "Verify now"} {!verifyLoading && <ArrowRight className="auth-icon" />}
              </button>
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
                  placeholder="john@example.com"
                  required
                />
              </div>
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="form-input-wrapper">
                <span className="input-icon"><Lock className="auth-icon" /></span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onKeyUp={onPasswordKey}
                  onClick={onPasswordKey}
                  className={`form-input ${errors.password ? "error" : ""}`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff className="auth-icon" /> : <Eye className="auth-icon" />}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
              {capsLockOn && <span className="form-hint warning">Caps Lock is on</span>}
            </div>

            <div className="form-group">
              <label htmlFor="role" className="form-label">
                Login as
              </label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleRoleChange}
                className="form-select sr-only"
                aria-hidden="true"
                tabIndex={-1}
              >
                <option value="user">Candidate</option>
                <option value="interviewer">Recruiter</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="form-checkbox">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe">Remember me</label>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>New to Interview Platform?</span>
          </div>

          <Link to="/register" className="btn btn-secondary btn-block">
            Create an Account
          </Link>

          <div className="auth-footer">
            <Link to="/forgot-password" className="link-subtle">
              Forgot your password?
            </Link>
          </div>
        </div>

        <div className="auth-info">
          <div className="info-card">
            <h3 className="info-title"><Target className="auth-icon" /> For Candidates</h3>
            <p>Practice interview questions, track progress, and improve your skills</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><Users className="auth-icon" /> For Recruiters</h3>
            <p>Create tests, schedule interviews, and evaluate candidates</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><Settings className="auth-icon" /> For Admins</h3>
            <p>Manage the platform, users, and companies</p>
          </div>
          <div className="info-card security-card">
            <h3 className="info-title"><ShieldCheck className="auth-icon" /> Account Security</h3>
            <p>OTP email verification and role-based access keep every assessment secure.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
