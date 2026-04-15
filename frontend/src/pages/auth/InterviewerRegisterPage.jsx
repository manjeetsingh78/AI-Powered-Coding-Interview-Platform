import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function InterviewerRegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "interviewer",
    company_name: "",
    company_domain: "",
    company_website: "",
    bio: "",
    skills: "",
    linkedin_url: "",
    github_url: "",
  });
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      skills: form.skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    const response = await register(payload);
    setResult(response);
    if (response.ok) {
      navigate(`/verify?email=${encodeURIComponent(form.email)}`);
    }
  };

  return (
    <section className="card">
      <h2>Interviewer Register</h2>
      <p>Register as interviewer with additional profile details.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
        </label>
        <label>
          Company Name
          <input
            value={form.company_name}
            onChange={(event) => setForm((prev) => ({ ...prev, company_name: event.target.value }))}
            required
          />
        </label>
        <label>
          Company Domain
          <input
            value={form.company_domain}
            onChange={(event) => setForm((prev) => ({ ...prev, company_domain: event.target.value }))}
          />
        </label>
        <label>
          Company Website
          <input
            value={form.company_website}
            onChange={(event) => setForm((prev) => ({ ...prev, company_website: event.target.value }))}
          />
        </label>
        <label>
          Bio
          <input
            value={form.bio}
            onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
          />
        </label>
        <label>
          Skills (comma separated)
          <input
            value={form.skills}
            onChange={(event) => setForm((prev) => ({ ...prev, skills: event.target.value }))}
            placeholder="React, Django, PostgreSQL"
          />
        </label>
        <label>
          LinkedIn URL
          <input
            value={form.linkedin_url}
            onChange={(event) => setForm((prev) => ({ ...prev, linkedin_url: event.target.value }))}
          />
        </label>
        <label>
          GitHub URL
          <input
            value={form.github_url}
            onChange={(event) => setForm((prev) => ({ ...prev, github_url: event.target.value }))}
          />
        </label>
        <button type="submit">Create interviewer account</button>
      </form>
      <p className="auth-switch">
        Registering as user?
        <Link className="link-btn" to="/register/user">Go here</Link>
      </p>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}
