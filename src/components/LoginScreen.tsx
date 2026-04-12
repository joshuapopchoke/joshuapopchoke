import { useState } from "react";

interface LoginScreenProps {
  error: string | null;
  onLogin: (username: string, password: string) => void | Promise<void>;
  loading?: boolean;
}

export function LoginScreen({ error, onLogin, loading = false }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <header className="auth-header">
          <p className="eyebrow">Sterling Fiduciary Group</p>
          <h1>Fiduciary Duty</h1>
          <p className="auth-subtitle">Professional readiness for exam performance and real-world advisory judgment.</p>
        </header>

        <div className="auth-copy">
          <div className="auth-copy-card">
            <span>Employee Access</span>
            <strong>Fiduciary Duty — Training</strong>
            <small>Study for licensing exams, strengthen suitability judgment, and practice client-facing advisory work.</small>
          </div>
          <div className="auth-copy-card">
            <span>Manager Access</span>
            <strong>Fiduciary Duty — Manager</strong>
            <small>Monitor trainee performance, review score lanes, and manage employee training accounts.</small>
          </div>
        </div>

        <form
          className="auth-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            try {
              await onLogin(username, password);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter username" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
          </label>
          {error ? <div className="auth-error">{error}</div> : null}
          <button type="submit" className="primary-btn auth-submit" disabled={loading || submitting}>
            {loading ? "Loading..." : submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
