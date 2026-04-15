import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function LoginPage() {
  const { login, loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", role: "user" });
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { email: form.email, password: form.password };
    const response = form.role === "admin" ? await loginAdmin(payload) : await login(payload);
    setResult(response);
    if (response.ok && response.data?.user?.role === "user") {
      navigate("/candidate/dashboard");
    }
    if (response.ok && response.data?.user?.role === "interviewer") {
      navigate("/recruiter/dashboard");
    }
    if (response.ok && response.data?.user?.role === "admin") {
      navigate("/admin/dashboard");
    }
  };

  return (
    <section className="card">
      <h2>Login</h2>
      <p>Email + password login for user, interviewer and admin.</p>
      <form onSubmit={handleSubmit}>
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
          Login as
          <select
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="user">User</option>
            <option value="interviewer">Interviewer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit">Login</button>
      </form>
      {result?.status === 403 && (
        <p className="auth-switch">
          Account not verified?
          <Link className="link-btn" to={`/verify?email=${encodeURIComponent(form.email)}`}>Verify now</Link>
        </p>
      )}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}
