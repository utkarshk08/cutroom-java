import { useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { getSession, saveSession } from "./api.js";
import AuthPage from "./pages/AuthPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import StudioPage from "./pages/StudioPage.jsx";

export default function App() {
  const [session, setSession] = useState(getSession);
  const navigate = useNavigate();
  function onSignIn(result) {
    saveSession(result);
    setSession(result);
    navigate("/projects");
  }
  function logout() {
    if (!window.confirm("Sign out? Save your design or download a backup first.")) return;
    saveSession(null);
    setSession(null);
    navigate("/");
  }
  return (
    <>
      <header className="app-header">
        <Link className="brand" to="/">
          <span className="brand-mark">c.</span>
          <span>
            CUTROOM<small>REACT + JAVA EDITION</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/playground">Try the editor</Link>
          {session ? (
            <>
              <Link to="/projects">My projects</Link>
              <button className="secondary" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <Link className="btn secondary" to="/login">
              Sign in
            </Link>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage mode="login" onSignIn={onSignIn} />} />
        <Route path="/register" element={<AuthPage mode="register" onSignIn={onSignIn} />} />
        <Route
          path="/projects"
          element={session ? <ProjectsPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/editor/:id"
          element={session ? <StudioPage key="saved" /> : <Navigate to="/login" replace />}
        />
        <Route path="/playground" element={<StudioPage key="playground" playground />} />
        <Route
          path="*"
          element={
            <main className="page">
              <h1>That page is not here.</h1>
              <Link to="/">Back home</Link>
            </main>
          }
        />
      </Routes>
    </>
  );
}

function Home() {
  return (
    <main className="home page">
      <div className="hero-copy">
        <span className="eyebrow">A LITTLE SPACE. A LOT OF YOU.</span>
        <h1>
          Your wall.
          <br />
          Your kind of <em>chaos.</em>
        </h1>
        <p>
          Cut a sheet into pieces. Find their place. Pack them for print.
          <br />A small, understandable poster studio built with React and Java.
        </p>
        <div className="inline">
          <Link className="btn" to="/playground">
            Make something yours ↗
          </Link>
          <Link className="btn secondary" to="/register">
            Create an account
          </Link>
        </div>
        <p className="muted">
          The editor preview works without a server. Account saves use Spring Boot + MySQL.
        </p>
      </div>
      <div className="hero-board" aria-label="Decorative poster arrangement">
        <div className="poster poster-purple">
          MAKE
          <br />
          <em>room.</em>
          <small>FOR THE THINGS YOU LOVE</small>
        </div>
        <div className="poster poster-peach">
          <span>✳</span>good things
          <br />
          take shape.
        </div>
        <div className="poster poster-mint">
          your
          <br />
          little
          <br />
          <em>universe</em> ↗
        </div>
        <div className="poster poster-yellow">
          NO RULES.
          <br />
          JUST YOU.
        </div>
      </div>
      <section className="feature-strip">
        <article>
          <b>01 / CUT</b>
          <h3>One sheet, many ideas.</h3>
          <p>Grid cuts and editable shape crops, with a preview before you create.</p>
        </article>
        <article>
          <b>02 / COMPOSE</b>
          <h3>A wall that feels like you.</h3>
          <p>Photos, text, groups, layers and simple shape-inspired arrangements.</p>
        </article>
        <article>
          <b>03 / PRINT</b>
          <h3>Keep the size you chose.</h3>
          <p>Original-size page packing, rotation and downloadable print pages.</p>
        </article>
      </section>
      <p className="edition-note">
        Learning edition · separate from the hosted TypeScript app · advanced AI and production
        features are not connected here.
      </p>
    </main>
  );
}
