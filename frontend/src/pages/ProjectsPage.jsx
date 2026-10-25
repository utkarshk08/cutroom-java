import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createProject, deleteProject, errorMessage, listProjects } from "../api.js";
import { createDesign } from "../utils/design.js";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function load() {
    setBusy(true);
    setError("");
    try {
      setProjects(await listProjects());
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function add() {
    const name = window.prompt("Name your new project", "My poster wall");
    if (!name?.trim()) return;
    setBusy(true);
    try {
      const project = await createProject({
        name: name.trim().slice(0, 100),
        designJson: JSON.stringify(createDesign()),
      });
      navigate(`/editor/${project.id}`);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function remove(project) {
    if (
      !window.confirm(
        `Permanently delete “${project.name}”? Download a backup first if you need it.`,
      )
    )
      return;
    try {
      await deleteProject(project.id);
      setProjects((items) => items.filter((item) => item.id !== project.id));
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MADE BY YOU</span>
          <h1>Your creative corner.</h1>
        </div>
        <button onClick={add} disabled={busy}>
          + New project
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button className="secondary" onClick={load}>
            Retry
          </button>
        </p>
      )}
      {busy && <p role="status">Loading…</p>}
      {!busy && !projects.length && !error && (
        <div className="empty-state">
          <h2>A blank wall is a good beginning.</h2>
          <p>Create a project to start collecting your pieces.</p>
        </div>
      )}
      <div className="project-grid">
        {projects.map((project) => (
          <article className="card project-card" key={project.id}>
            <div className="project-art">
              ✳ <span>make it yours</span>
            </div>
            <h2>{project.name}</h2>
            <p className="muted">Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
            <div className="inline">
              <Link className="btn" to={`/editor/${project.id}`}>
                Open studio ↗
              </Link>
              <button className="secondary danger" onClick={() => remove(project)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
