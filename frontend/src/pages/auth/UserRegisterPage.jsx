import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  ShieldCheck,
  Target,
  User,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { register, requestVerification, verifyAccount } from "../../api/auth.api";
import "../../assets/styles/auth.css";

export default function UserRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("registration"); // registration, verification
  
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    bio: "",
    linkedin_url: "",
    github_url: "",
    agreeToTerms: false,
  });

  const [verification, setVerification] = useState({
    code: "",
    attempts: 0,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (!password) return 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return Math.min(strength, 5);
  };

  const getPasswordStrengthText = (strength) => {
    const texts = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
    return texts[strength] || "Very Weak";
  };

  const validateRegistrationForm = () => {
    const newErrors = {};
    
    if (!form.username || form.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!form.password || form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    if (!form.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
    }

    if (form.linkedin_url && !/^https?:\/\/.+/.test(form.linkedin_url)) {
      newErrors.linkedin_url = "Please enter a valid URL";
    }

    if (form.github_url && !/^https?:\/\/.+/.test(form.github_url)) {
      newErrors.github_url = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    
    if (!validateRegistrationForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        username: form.username,
        email: form.email,
        password: form.password,
        role: "candidate",
        bio: form.bio,
        linkedin_url: form.linkedin_url,
        github_url: form.github_url,
      };

      const response = await register(payload);

      if (response.ok) {
        setSuccessMessage("Registration successful! Check your email for verification code.");
        setStep("verification");
        setVerification({ code: "", attempts: 0 });
      } else {
        setErrors({
          general: response.data?.error || "Registration failed. Please try again.",
        });
      }
    } catch (error) {
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    
    if (!verification.code || verification.code.length !== 6) {
      setErrors({ verification: "Please enter a valid 6-digit code" });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        email: form.email,
        code: verification.code,
      };

      const response = await verifyAccount(payload);

      if (response.ok) {
        setSuccessMessage("Email verified successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        if (response.data?.error?.includes("expired")) {
          setErrors({
            verification: "Verification code has expired. Please request a new one.",
          });
        } else {
          setErrors({
            verification: response.data?.error || "Invalid verification code. Please try again.",
          });
        }
        setVerification((prev) => ({ ...prev, attempts: prev.attempts + 1 }));
      }
    } catch (error) {
      setErrors({
        verification: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setErrors({});

    try {
      const response = await requestVerification({ email: form.email });
      if (response.ok) {
        setSuccessMessage("Verification code sent to your email!");
        setVerification({ code: "", attempts: 0 });
      } else {
        setErrors({ verification: "Failed to resend code. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    
    setForm((prev) => ({ ...prev, [name]: newValue }));
    
    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  if (step === "verification") {
    return (
      <div className="auth-page auth-page--interactive">
        <div className="auth-container">
          <div className="auth-card auth-card--interactive">
            <div className="auth-header">
              <h1>Verify Your Email</h1>
              <p>We've sent a verification code to {form.email}</p>
            </div>

            {successMessage && (
              <div className="alert alert-success">
                <span className="alert-icon"><CheckCircle2 className="auth-icon" /></span>
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmitVerification} className="auth-form">
              {errors.general && (
                <div className="alert alert-error">
                  <span className="alert-icon"><AlertCircle className="auth-icon" /></span>
                  {errors.general}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="code" className="form-label">
                  Verification Code
                </label>
                <div className="form-input-wrapper">
                  <span className="input-icon"><ShieldCheck className="auth-icon" /></span>
                  <input
                    id="code"
                    type="text"
                    name="code"
                    value={verification.code}
                    onChange={(e) => {
                      const code = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setVerification((prev) => ({ ...prev, code }));
                    }}
                    maxLength="6"
                    placeholder="000000"
                    className={`form-input code-input ${errors.verification ? "error" : ""}`}
                    required
                  />
                </div>
                {errors.verification && (
                  <span className="error-text">{errors.verification}</span>
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
                  "Verify Account"
                )}
              </button>
            </form>

            <div className="auth-footer">
              <p>Didn't receive the code?</p>
              <button
                type="button"
                onClick={handleResendCode}
                className="link-subtle"
                disabled={loading}
              >
                Resend Code
              </button>
            </div>

            <div className="auth-footer">
              <Link to="/register" className="link-subtle">
                <ArrowLeft className="auth-icon" /> Back to Registration
              </Link>
            </div>
          </div>

          <aside className="auth-info">
            <div className="info-card">
              <h3 className="info-title"><ShieldCheck className="auth-icon" /> Candidate Onboarding</h3>
              <p>Secure OTP verification unlocks your candidate dashboard and assessment history.</p>
            </div>
            <div className="info-card">
              <h3 className="info-title"><Sparkles className="auth-icon" /> Growth Tracking</h3>
              <p>Track attempts, score trends, and profile details in one smooth workspace.</p>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-page--interactive">
      <div className="auth-container">
        <div className="auth-card auth-card--interactive">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Register as a Candidate to start your interview journey</p>
          </div>

          <form onSubmit={handleSubmitRegistration} className="auth-form">
            {errors.general && (
              <div className="alert alert-error">
                <span className="alert-icon"><AlertCircle className="auth-icon" /></span>
                {errors.general}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <div className="form-input-wrapper">
                <span className="input-icon"><User className="auth-icon" /></span>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className={`form-input ${errors.username ? "error" : ""}`}
                  placeholder="john_doe"
                  required
                />
              </div>
              {errors.username && <span className="error-text">{errors.username}</span>}
            </div>

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
              {form.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div
                      className={`strength-fill strength-${passwordStrength}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="strength-text">
                    Strength: <strong>{getPasswordStrengthText(passwordStrength)}</strong>
                  </span>
                </div>
              )}
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <div className="form-input-wrapper">
                <span className="input-icon"><Lock className="auth-icon" /></span>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`form-input ${errors.confirmPassword ? "error" : ""}`}
                  placeholder="••••••••"
                  required
                />
              </div>
              {errors.confirmPassword && (
                <span className="error-text">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="bio" className="form-label">
                Bio (Optional)
              </label>
              <textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Tell us about yourself..."
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="linkedin_url" className="form-label">
                  LinkedIn URL
                </label>
                <input
                  id="linkedin_url"
                  type="url"
                  name="linkedin_url"
                  value={form.linkedin_url}
                  onChange={handleChange}
                  className={`form-input-standalone ${errors.linkedin_url ? "error" : ""}`}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
                {errors.linkedin_url && (
                  <span className="error-text">{errors.linkedin_url}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="github_url" className="form-label">
                  GitHub URL
                </label>
                <input
                  id="github_url"
                  type="url"
                  name="github_url"
                  value={form.github_url}
                  onChange={handleChange}
                  className={`form-input-standalone ${errors.github_url ? "error" : ""}`}
                  placeholder="https://github.com/yourprofile"
                />
                {errors.github_url && (
                  <span className="error-text">{errors.github_url}</span>
                )}
              </div>
            </div>

            <div className="form-checkbox">
              <input
                id="agreeToTerms"
                type="checkbox"
                name="agreeToTerms"
                checked={form.agreeToTerms}
                onChange={handleChange}
              />
              <label htmlFor="agreeToTerms">
                I agree to the <a href="#terms">Terms and Conditions</a>
              </label>
            </div>
            {errors.agreeToTerms && (
              <span className="error-text">{errors.agreeToTerms}</span>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>Already have an account?</span>
          </div>

          <Link to="/login" className="btn btn-secondary btn-block">
            Sign In
          </Link>

          <div className="auth-footer">
            <p>Registering as a recruiter?</p>
            <Link to="/register/interviewer" className="link-subtle">
              Register Here
            </Link>
          </div>
        </div>

        <aside className="auth-info">
          <div className="info-card">
            <h3 className="info-title"><Target className="auth-icon" /> Candidate Journey</h3>
            <p>Create your profile, verify your email, and enter a streamlined assessment flow.</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><ShieldCheck className="auth-icon" /> Secure Access</h3>
            <p>Your account stays protected with one-time verification and password recovery.</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><Sparkles className="auth-icon" /> Smart Feedback</h3>
            <p>Keep your bio and social links polished for recruiters and interview reviewers.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
