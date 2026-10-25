import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { errorMessage, getProject, updateProject } from "../api.js";
import { createDesign, readDesign } from "../utils/design.js";
import Editor from "../components/Editor.jsx";
import PrintPack from "../components/PrintPack.jsx";
import { downloadCanvas, renderWall } from "../utils/canvas.js";

export default function StudioPage({ playground = false }) {
  const { id } = useParams();
  const [design, setDesign] = useState(createDesign);
  const [name, setName] = useState("My poster wall");
  const [tab, setTab] = useState("wall");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!playground);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(() => JSON.stringify({ name: "My poster wall", design: createDesign() }));
  const [revision, setRevision] = useState(0);
  const importInput = useRef(null);
  const current = JSON.stringify({ name, design });
  const dirty = current !== saved;

  useEffect(() => {
    if (playground) return;
    let active = true;
    getProject(id)
      .then((project) => {
        if (!active) return;
        const restored = readDesign(project.designJson);
        setDesign(restored);
        setName(project.name);
        setSaved(JSON.stringify({ name: project.name, design: restored }));
      })
      .catch((error) => {
        if (active) setError(error.response || error.code ? errorMessage(error) : error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, playground]);

  // Protect refresh/closing. In-app navigation still needs the user to save first.
  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function notify(text) {
    setMessage(text);
  }
  async function save() {
    setSaving(true);
    try {
      // Use the same validator for save and import; no invalid JSON reaches Java.
      const canonical = readDesign(JSON.stringify(design));
      await updateProject(id, { name, designJson: JSON.stringify(canonical) });
      setSaved(current);
      notify("Saved to MySQL.");
    } catch (error) {
      notify(error.response || error.code ? errorMessage(error) : error.message);
    } finally {
      setSaving(false);
    }
  }
  function backup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(design, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "cutroom-java-react-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Backup downloaded. It belongs to this Java/React edition.");
  }
  async function wallImage() {
    try {
      const canvas = await renderWall(design);
      await downloadCanvas(canvas, "my-wall", "png");
      notify("Wall PNG downloaded. Print Pack is the separate actual-size export.");
    } catch (error) {
      notify(error.message);
    }
  }
  async function restore(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw new Error("Choose a backup smaller than 8 MB.");
      const incoming = readDesign(await file.text());
      if (
        !window.confirm("Replace the open design? Download a backup of this one first if needed.")
      )
        return;
      setDesign(incoming);
      setRevision((value) => value + 1);
      notify("Backup restored. Click Save to update your MySQL project.");
    } catch (error) {
      notify(error.message);
    }
  }
  if (loading)
    return (
      <main className="page" role="status">
        Opening your project…
      </main>
    );
  if (error)
    return (
      <main className="page">
        <p className="error" role="alert">
          {error}
        </p>
        <p>
          Reload after correcting the API connection or sign in again. The saved project was not
          overwritten.
        </p>
      </main>
    );
  return (
    <main className="studio-page">
      <div className="studio-heading">
        <div>
          <label className="project-name">
            PROJECT NAME
            <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          </label>
          <small className="muted">
            {playground
              ? "Preview only · download a backup before leaving"
              : dirty
                ? "Unsaved changes · save before navigating away"
                : "Saved to MySQL"}
          </small>
        </div>
        <div className="inline">
          <button className="secondary" onClick={backup}>
            ↓ Backup
          </button>
          <button className="secondary" onClick={wallImage}>
            Wall PNG
          </button>
          <button className="secondary" onClick={() => importInput.current.click()}>
            ↑ Restore
          </button>
          {!playground && (
            <button onClick={save} disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Save project"}
            </button>
          )}
          <input
            hidden
            ref={importInput}
            type="file"
            accept="application/json,.json"
            onChange={restore}
          />
        </div>
      </div>
      <div className="mode-bar">
        <div className="tabs">
          <button className={tab === "wall" ? "active" : ""} onClick={() => setTab("wall")}>
            ✳ Arrange wall
          </button>
          <button className={tab === "print" ? "active" : ""} onClick={() => setTab("print")}>
            ▦ Print pack
          </button>
        </div>
        <span className="edition-badge">LEARNING EDITION</span>
      </div>
      {message && (
        <div className="notice" role="status">
          <span>{message}</span>
          <button className="secondary" aria-label="Dismiss message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      {tab === "wall" ? (
        <Editor
          key={`${id || "preview"}-${revision}`}
          design={design}
          setDesign={setDesign}
          notify={notify}
        />
      ) : (
        <PrintPack
          key={`${id || "preview"}-${revision}`}
          design={design}
          setDesign={setDesign}
          notify={notify}
        />
      )}
    </main>
  );
}
