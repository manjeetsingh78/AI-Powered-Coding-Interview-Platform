import { Link } from "react-router-dom";

export default function RegisterPage() {
  return (
    <section className="card">
      <h2>Register</h2>
      <p>Choose your registration type.</p>
      <div className="auth-options">
        <Link className="link-btn" to="/register/user">Register as User</Link>
        <Link className="link-btn" to="/register/interviewer">Register as Interviewer</Link>
      </div>
    </section>
  );
}
