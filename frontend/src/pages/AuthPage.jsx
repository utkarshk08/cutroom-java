import { useState } from "react";
import { Link } from "react-router-dom";
import { errorMessage, login, register } from "../api.js";

export default function AuthPage({ mode, onSignIn }) {
  const creating = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = creating
        ? await register({ name, email, password })
        : await login({ email, password });
      onSignIn(result);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-aside">
        <span className="eyebrow">COLLECT. CREATE. MAKE IT YOURS.</span>
        <h1>
          Every wall
          <br />
          starts with
          <br />
          <em>an idea.</em>
        </h1>
        <p>Your projects, saved to your own account.</p>
      </div>
      <form className="card auth-card stack" onSubmit={submit}>
        <span className="eyebrow">YOUR CREATIVE CORNER</span>
        <h1>{creating ? "Start your collection" : "Welcome back"}</h1>
        {creating && (
          <label>
            Your name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              maxLength={80}
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            maxLength={120}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={creating ? "new-password" : "current-password"}
            minLength={8}
            maxLength={64}
            required
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy}>
          {busy ? "Please wait…" : creating ? "Create account" : "Sign in"}
        </button>
        <p>
          {creating ? "Already registered?" : "New here?"}{" "}
          <Link to={creating ? "/login" : "/register"}>
            {creating ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <small className="muted">
          Requires the Java API and MySQL. No Google sign-in or fake demo login.
        </small>
      </form>
    </main>
  );
}
