import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { requestVerification, verifyAccount } from "../../api/auth.api";

export default function VerifyAccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [form, setForm] = useState({
    email: initialEmail,
    code: "",
  });
  const [verifyResult, setVerifyResult] = useState(null);
  const [resendResult, setResendResult] = useState(null);

  const onVerify = async (event) => {
    event.preventDefault();
    const result = await verifyAccount(form);
    setVerifyResult(result);
    if (result.ok) {
      navigate("/login");
    }
  };

  const onResend = async () => {
    const result = await requestVerification({ email: form.email });
    setResendResult(result);
  };

  return (
    <section className="card">
      <h2>Verify Account</h2>
      <p>Enter the verification code sent after registration.</p>
      <form onSubmit={onVerify}>
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
          Verification Code
          <input
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            required
          />
        </label>
        <button type="submit">Verify account</button>
      </form>

      <p className="auth-switch">
        Did not get code?
        <button type="button" onClick={onResend}>Resend code</button>
      </p>

      {verifyResult && <pre>{JSON.stringify(verifyResult, null, 2)}</pre>}
      {resendResult && <pre>{JSON.stringify(resendResult, null, 2)}</pre>}

      <p className="auth-switch">
        Back to login?
        <Link className="link-btn" to="/login">Go here</Link>
      </p>
    </section>
  );
}
