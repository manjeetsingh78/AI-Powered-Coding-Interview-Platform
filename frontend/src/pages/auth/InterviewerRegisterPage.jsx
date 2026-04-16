import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { register, requestVerification, verifyAccount } from "../../api/auth.api";
import "../../assets/styles/auth.css";

export default function InterviewerRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("registration"); // registration, verification
  
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    company_name: "",
    company_domain: "",
    company_website: "",
    bio: "",
    skills: "",
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
  const [formStep, setFormStep] = useState(1); // 1 for basic, 2 for company, 3 for profile

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

  const validateStep1 = () => {
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

    return { newErrors, isValid: Object.keys(newErrors).length === 0 };
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!form.company_name) {
      newErrors.company_name = "Company name is required";
    }

    if (form.company_website && !/^https?:\/\/.+/.test(form.company_website)) {
      newErrors.company_website = "Please enter a valid URL";
    }

    return { newErrors, isValid: Object.keys(newErrors).length === 0 };
  };

  const validateStep3 = () => {
    const newErrors = {};

    if (form.linkedin_url && !/^https?:\/\/.+/.test(form.linkedin_url)) {
      newErrors.linkedin_url = "Please enter a valid URL";
    }

    if (form.github_url && !/^https?:\/\/.+/.test(form.github_url)) {
      newErrors.github_url = "Please enter a valid URL";
    }

    if (!form.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
    }

    return { newErrors, isValid: Object.keys(newErrors).length === 0 };
  };

  const handleNextStep = () => {
    if (formStep === 1) {
      const { newErrors, isValid } = validateStep1();
      if (!isValid) {
        setErrors(newErrors);
        return;
      }
    } else if (formStep === 2) {
      const { newErrors, isValid } = validateStep2();
      if (!isValid) {
        setErrors(newErrors);
        return;
      }
    }
    setErrors({});
    setFormStep(formStep + 1);
  };

  const handlePreviousStep = () => {
    setFormStep(formStep - 1);
    setErrors({});
  };

  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    
    const { newErrors, isValid } = validateStep3();
    if (!isValid) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const skillsArray = form.skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const payload = {
        username: form.username,
        email: form.email,
        password: form.password,
        role: "recruiter",
        company_name: form.company_name,
        company_domain: form.company_domain,
        company_website: form.company_website,
        bio: form.bio,
        skills: skillsArray,
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
              <h3 className="info-title"><BriefcaseBusiness className="auth-icon" /> Recruiter Onboarding</h3>
              <p>Verify your email to unlock hiring dashboards, tests, and interview management tools.</p>
            </div>
            <div className="info-card">
              <h3 className="info-title"><Building2 className="auth-icon" /> Company Profile</h3>
              <p>Present your organization details, website, and hiring focus with a polished setup.</p>
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
            <h1>Create Recruiter Account</h1>
            <p>Register to post jobs and interview candidates</p>
            {formStep > 1 && (
              <div className="step-indicator">
                <span className={formStep >= 1 ? "step active" : "step"}>1</span>
                <span className={formStep >= 2 ? "step active" : "step"}>2</span>
                <span className={formStep >= 3 ? "step active" : "step"}>3</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitRegistration} className="auth-form">
            {errors.general && (
              <div className="alert alert-error">
                <span className="alert-icon"><AlertCircle className="auth-icon" /></span>
                {errors.general}
              </div>
            )}

            {/* Step 1: Basic Information */}
            {formStep === 1 && (
              <>
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
                      placeholder="john_recruiter"
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
                      placeholder="recruiter@company.com"
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

                <button type="button" onClick={handleNextStep} className="btn btn-primary btn-block">
                  Continue
                </button>
              </>
            )}

            {/* Step 2: Company Information */}
            {formStep === 2 && (
              <>
                <div className="form-group">
                  <label htmlFor="company_name" className="form-label">
                    Company Name *
                  </label>
                  <div className="form-input-wrapper">
                    <span className="input-icon"><Building2 className="auth-icon" /></span>
                    <input
                      id="company_name"
                      type="text"
                      name="company_name"
                      value={form.company_name}
                      onChange={handleChange}
                      className={`form-input ${errors.company_name ? "error" : ""}`}
                      placeholder="Acme Corporation"
                      required
                    />
                  </div>
                  {errors.company_name && <span className="error-text">{errors.company_name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="company_domain" className="form-label">
                    Domain
                  </label>
                  <input
                    id="company_domain"
                    type="text"
                    name="company_domain"
                    value={form.company_domain}
                    onChange={handleChange}
                    className="form-input-standalone"
                    placeholder="Software"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="company_website" className="form-label">
                    Website URL
                  </label>
                  <input
                    id="company_website"
                    type="url"
                    name="company_website"
                    value={form.company_website}
                    onChange={handleChange}
                    className={`form-input-standalone ${errors.company_website ? "error" : ""}`}
                    placeholder="https://company.com"
                  />
                  {errors.company_website && (
                    <span className="error-text">{errors.company_website}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="bio" className="form-label">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    className="form-textarea"
                    placeholder="Tell us about your company and recruitment needs..."
                    rows="3"
                  />
                </div>

                <div className="form-buttons">
                  <button type="button" onClick={handlePreviousStep} className="btn btn-secondary">
                    Back
                  </button>
                  <button type="button" onClick={handleNextStep} className="btn btn-primary">
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Profile Information */}
            {formStep === 3 && (
              <>
                <div className="form-group">
                  <label htmlFor="skills" className="form-label">
                    Skills (comma separated)
                  </label>
                  <input
                    id="skills"
                    type="text"
                    name="skills"
                    value={form.skills}
                    onChange={handleChange}
                    className="form-input-standalone"
                    placeholder="React, Django, PostgreSQL, AWS"
                  />
                </div>

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

                <div className="form-buttons">
                  <button type="button" onClick={handlePreviousStep} className="btn btn-secondary">
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
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
                </div>
              </>
            )}
          </form>

          {formStep === 1 && (
            <>
              <div className="auth-divider">
                <span>Already have an account?</span>
              </div>

              <Link to="/login" className="btn btn-secondary btn-block">
                Sign In
              </Link>

              <div className="auth-footer">
                <p>Registering as a candidate?</p>
                <Link to="/register/user" className="link-subtle">
                  Register Here
                </Link>
              </div>
            </>
          )}
        </div>

        <aside className="auth-info">
          <div className="info-card">
            <h3 className="info-title"><BriefcaseBusiness className="auth-icon" /> Hiring Workspace</h3>
            <p>Build structured tests, review submissions, and manage candidates from one place.</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><Building2 className="auth-icon" /> Company Details</h3>
            <p>Show your brand, domain, and team identity with a professional recruiter profile.</p>
          </div>
          <div className="info-card">
            <h3 className="info-title"><ShieldCheck className="auth-icon" /> Secure Verification</h3>
            <p>Email OTP keeps recruiter access safe and ready for dashboard use.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
