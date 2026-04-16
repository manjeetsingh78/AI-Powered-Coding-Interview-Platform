import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <section className="card">
      <h2>403 Unauthorized</h2>
      <p>You do not have permission to access this page.</p>
      <Link to="/login">Go to Login</Link>
    </section>
  );
}
