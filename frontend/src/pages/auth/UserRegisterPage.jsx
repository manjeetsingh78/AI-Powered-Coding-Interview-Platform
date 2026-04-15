import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function UserRegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const response = await register(form);
    setResult(response);
    if (response.ok) {
      navigate(`/verify?email=${encodeURIComponent(form.email)}`);
    }
  };

  return (
    <section className="card">
      <h2>User Register</h2>
      <p>Register as a candidate user.</p>
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
        <button type="submit">Create user account</button>
      </form>
      <p className="auth-switch">
        Registering as interviewer?
        <Link className="link-btn" to="/register/interviewer">Go here</Link>
      </p>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}
