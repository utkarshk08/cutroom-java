import { useEffect, useRef, useState } from "react";
import { createPhoto, createText, PAPER_SIZES, arrangePieces } from "../utils/design";
import WallCanvas from "./WallCanvas";
import Inspector from "./Inspector";
import CropPanel from "./CropPanel";
import "./editor.css";

const MAX_PIECES = 80;

// A data URL keeps this learning app simple: no file server or cloud bucket.
async function readPhoto(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error(`${file.name}: choose PNG, JPEG, or WebP.`);
  if (file.size > 2 * 1024 * 1024) throw new Error(`${file.name}: maximum file size is 2 MB.`);
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const picture = new Image();
    const timer = setTimeout(() => reject(new Error(`Could not decode ${file.name}.`)), 10000);
    picture.onload = () => {
      clearTimeout(timer);
      resolve(picture);
    };
    picture.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Invalid image: ${file.name}.`));
    };
    picture.src = src;
  });
  return { src, ratio: image.naturalWidth / image.naturalHeight };
}

export default function Editor({ design, setDesign, notify }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [showLabels, setShowLabels] = useState(true);
  const [size, setSize] = useState("A6");
  const [customSize, setCustomSize] = useState([15, 20]);
  const [preserveRatio, setPreserveRatio] = useState(true);
  const [unit, setUnit] = useState("cm");
  const [layout, setLayout] = useState("grid");
  const [brief, setBrief] = useState("");
  const [importing, setImporting] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = useRef(design);
  current.current = design;
  const selected = design.pieces.filter((piece) => selectedIds.includes(piece.id));
  const unitFactor = unit === "in" ? 2.54 : 1;

  // All editor actions go through one function, making Undo easy to follow.
  function commit(change) {
    const before = current.current;
    const next = typeof change === "function" ? change(before) : change;
    if (next === before) return;
    setPast((history) => [...history.slice(-19), before]);
    setFuture([]);
    current.current = next;
    setDesign(next);
  }

  function undo() {
    if (!past.length) return;
    setFuture((history) => [current.current, ...history].slice(0, 20));
    const previous = past[past.length - 1];
    setPast(past.slice(0, -1));
    current.current = previous;
    setDesign(previous);
  }

  function redo() {
    if (!future.length) return;
    setPast((history) => [...history.slice(-19), current.current]);
    const next = future[0];
    setFuture(future.slice(1));
    current.current = next;
    setDesign(next);
  }

  function select(id, extend = false) {
    if (!id) {
      setSelectedIds([]);
      return [];
    }
    const piece = design.pieces.find((item) => item.id === id);
    const group = piece?.groupId
      ? design.pieces.filter((item) => item.groupId === piece.groupId).map((item) => item.id)
      : [id];
    let ids;
    if (extend)
      ids = selectedIds.includes(id)
        ? selectedIds.filter((item) => !group.includes(item))
        : [...new Set([...selectedIds, ...group])];
    else ids = selectedIds.includes(id) ? selectedIds : group;
    setSelectedIds(ids);
    return ids;
  }

  function updateSelected(patch) {
    commit((before) => ({
      ...before,
      pieces: before.pieces.map((piece) =>
        selectedIds.includes(piece.id) ? { ...piece, ...patch } : piece,
      ),
    }));
  }

  function resize(width, height) {
    const values = [width, height].filter((value) => value !== null);
    if (values.some((value) => !Number.isFinite(value) || value < 0.1 || value > 1000)) return;
    if (selected.some((piece) => piece.locked)) return;
    if (
      selected.length > 1 &&
      !window.confirm(
        `Change all ${selected.length} selected pieces to ${width} × ${height} cm? This changes their proportions.`,
      )
    )
      return;
    commit((before) => ({
      ...before,
      pieces: before.pieces.map((piece) => {
        if (!selectedIds.includes(piece.id)) return piece;
        let nextWidth = width ?? piece.width;
        let nextHeight = height ?? piece.height;
        if (piece.ratioLocked && piece.type !== "text") {
          if (width === null) nextWidth = (nextHeight * piece.width) / piece.height;
          if (height === null) nextHeight = (nextWidth * piece.height) / piece.width;
          if (selected.length === 1 && width !== null && height !== null) {
            const scale = Math.min(width / piece.width, height / piece.height);
            nextWidth = piece.width * scale;
            nextHeight = piece.height * scale;
          }
        }
        return { ...piece, width: nextWidth, height: nextHeight };
      }),
    }));
  }

  function addPieces(pieces) {
    if (current.current.pieces.length + pieces.length > MAX_PIECES) {
      notify("This learning edition supports up to 80 pieces per project.");
      return;
    }
    commit((before) => ({ ...before, pieces: [...before.pieces, ...pieces] }));
  }

  async function importPhotos(event) {
    const files = [...event.target.files];
    event.target.value = "";
    if (files.length + current.current.pieces.length > MAX_PIECES) {
      notify("Choose fewer photos: the project limit is 80 pieces.");
      return;
    }
    setImporting(true);
    const imported = [];
    const errors = [];
    for (const file of files) {
      try {
        const photo = await readPhoto(file);
        let [width, height] = PAPER_SIZES[size] || customSize;
        if (preserveRatio) {
          if (width / height > photo.ratio) width = height * photo.ratio;
          else height = width / photo.ratio;
        }
        imported.push(createPhoto(photo.src, file.name, width, height));
      } catch (error) {
        errors.push(error.message);
      }
    }
    if (!mounted.current) return;
    if (imported.length) addPieces(imported);
    setImporting(false);
    notify(errors.length ? errors.join(" ") : `${imported.length} photos added to Your pieces.`);
  }

  function place(id, point = { x: design.wall.width / 2, y: design.wall.height / 2 }) {
    if (!id) return;
    const source = design.pieces.find((piece) => piece.id === id);
    if (!source || source.locked) return;
    if (source.groupId) {
      notify(
        "Grouped pieces move together on the wall. Ungroup before placing a library member separately.",
      );
      return;
    }
    commit((before) => ({
      ...before,
      pieces: before.pieces.map((piece) =>
        piece.id === id
          ? {
              ...piece,
              placed: true,
              x: Math.max(0, Math.min(before.wall.width - piece.width, point.x - piece.width / 2)),
              y: Math.max(
                0,
                Math.min(before.wall.height - piece.height, point.y - piece.height / 2),
              ),
            }
          : piece,
      ),
    }));
    setSelectedIds([id]);
  }

  function compose(chosenLayout = layout) {
    try {
      const pieces = arrangePieces(design.pieces, design.wall, chosenLayout);
      if (pieces === design.pieces) {
        notify("Place some unlocked pieces on the wall first.");
        return;
      }
      commit({ ...design, pieces });
      notify("Only placed, unlocked pieces were arranged. Their sizes were preserved.");
    } catch (error) {
      notify(error.message);
    }
  }

  function templateHelper() {
    const text = brief.toLowerCase();
    const chosen = ["ladder", "diamond", "wave", "grid"].find((word) => text.includes(word));
    if (!chosen) {
      notify(
        "This is a local keyword helper, not AI. Try grid, ladder, diamond, or wave. Custom shapes are not implemented.",
      );
      return;
    }
    setLayout(chosen);
    compose(chosen);
  }

  function changeWall(patch) {
    commit((before) => ({ ...before, wall: { ...before.wall, ...patch } }));
  }

  async function changeRoom(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      const photo = await readPhoto(file);
      if (mounted.current) changeWall({ image: photo.src });
    } catch (error) {
      notify(error.message);
    }
  }

  function layer(direction) {
    commit((before) => {
      const rest = before.pieces.filter((piece) => !selectedIds.includes(piece.id));
      const chosen = before.pieces.filter((piece) => selectedIds.includes(piece.id));
      return {
        ...before,
        pieces: direction === "front" ? [...rest, ...chosen] : [...chosen, ...rest],
      };
    });
  }

  function group(enabled) {
    if (enabled && selected.some((piece) => !piece.placed)) {
      notify("Place every selected piece on the wall before grouping.");
      return;
    }
    updateSelected({ groupId: enabled ? crypto.randomUUID() : null });
  }

  return (
    <div className="editor-shell">
      <aside className="library-panel card stack">
        <header>
          <p className="eyebrow">YOUR PIECES</p>
          <h2>{design.pieces.length} little possibilities</h2>
        </header>
        <label className="field">
          New photo print size
          <select value={size} onChange={(event) => setSize(event.target.value)}>
            {Object.keys(PAPER_SIZES).map((paper) => (
              <option key={paper}>{paper}</option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        {size === "custom" && (
          <div className="form-grid">
            {["Width", "Height"].map((label, index) => (
              <label className="field" key={label}>
                {label} (cm)
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={customSize[index]}
                  onChange={(event) =>
                    setCustomSize((old) =>
                      old.map((value, i) =>
                        i === index
                          ? Math.max(1, Math.min(1000, Number(event.target.value)))
                          : value,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
        )}
        <label className="inline">
          <input
            type="checkbox"
            checked={preserveRatio}
            onChange={(event) => setPreserveRatio(event.target.checked)}
          />
          Keep original proportions
        </label>
        <p className="muted">
          Photos fit inside your chosen size. Real centimeters cannot be inferred from image pixels
          alone.
        </p>
        <label className="upload-label">
          {importing ? "Reading photos…" : "+ Upload photos"}
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            disabled={importing}
            onChange={importPhotos}
          />
        </label>
        <p className="muted">PNG, JPEG, WebP · up to 2 MB each · 80 pieces max</p>
        <button
          className="btn secondary"
          onClick={() => {
            const text = createText();
            addPieces([text]);
            setSelectedIds([text.id]);
          }}
        >
          + Add text
        </button>
        <details>
          <summary>Cut a poster sheet</summary>
          <CropPanel onAdd={addPieces} notify={notify} />
        </details>
        <div className="piece-library">
          {design.pieces.map((piece) => (
            <button
              key={piece.id}
              className={`library-piece ${selectedIds.includes(piece.id) ? "selected" : ""}`}
              draggable={!piece.locked}
              onDragStart={(event) => event.dataTransfer.setData("cutroom-piece", piece.id)}
              onClick={(event) =>
                select(piece.id, event.shiftKey || event.metaKey || event.ctrlKey)
              }
              onDoubleClick={() => place(piece.id)}
              title={`${piece.name} · ${piece.width.toFixed(1)} × ${piece.height.toFixed(1)} cm. Drag to the wall or double-click to place.`}
            >
              {piece.type === "photo" ? (
                <img src={piece.src} alt={piece.name} draggable={false} />
              ) : (
                <span
                  style={{
                    color: piece.color,
                    fontFamily: piece.fontFamily,
                    background: piece.background,
                  }}
                >
                  {piece.text}
                </span>
              )}
              <small>{piece.name}</small>
              {piece.placed && <em>Placed</em>}
            </button>
          ))}
        </div>
        {!design.pieces.length && (
          <p className="muted">Start with a few photos or cut up one of your poster sheets.</p>
        )}
      </aside>

      <main className="wall-workspace stack">
        <div className="toolbar card">
          <button className="btn secondary" disabled={!past.length} onClick={undo}>
            Undo
          </button>
          <button className="btn secondary" disabled={!future.length} onClick={redo}>
            Redo
          </button>
          <button
            className="btn secondary"
            onClick={() =>
              setSelectedIds(design.pieces.filter((piece) => piece.placed).map((piece) => piece.id))
            }
          >
            Select all on wall
          </button>
          <button className="btn secondary" onClick={() => setSelectedIds([])}>
            Deselect
          </button>
          <label className="inline">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(event) => setShowLabels(event.target.checked)}
            />
            Piece names
          </label>
        </div>
        <details className="card wall-settings">
          <summary>
            Wall & room preview · {(design.wall.width / unitFactor).toFixed(1)} ×{" "}
            {(design.wall.height / unitFactor).toFixed(1)} {unit}
          </summary>
          <div className="form-grid">
            <label className="field">
              Units
              <select value={unit} onChange={(event) => setUnit(event.target.value)}>
                <option value="cm">Centimeters</option>
                <option value="in">Inches</option>
              </select>
            </label>
            <label className="field">
              Wall color
              <input
                type="color"
                value={design.wall.color}
                onChange={(event) => changeWall({ color: event.target.value })}
              />
            </label>
            {["width", "height"].map((dimension) => (
              <label className="field" key={dimension}>
                {dimension} ({unit})
                <input
                  type="number"
                  min={10 / unitFactor}
                  max={1000 / unitFactor}
                  step="0.1"
                  value={Number((design.wall[dimension] / unitFactor).toFixed(2))}
                  onChange={(event) =>
                    changeWall({
                      [dimension]: Math.max(
                        10,
                        Math.min(1000, Number(event.target.value) * unitFactor),
                      ),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label className="field">
            Upload / replace room photo
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={changeRoom} />
          </label>
          <label className="field">
            Room image opacity ({Math.round(design.wall.opacity * 100)}%)
            <input
              type="range"
              min="0"
              max="100"
              value={design.wall.opacity * 100}
              onChange={(event) => changeWall({ opacity: Number(event.target.value) / 100 })}
            />
          </label>
          <button
            className="btn secondary"
            disabled={!design.wall.image}
            onClick={() => changeWall({ image: "" })}
          >
            Remove room photo
          </button>
          <p className="muted">
            Room preview is a flat background, not perspective-correct wall mapping.
          </p>
        </details>
        <WallCanvas
          design={design}
          selectedIds={selectedIds}
          onSelect={select}
          onCommit={(pieces) => commit((before) => ({ ...before, pieces }))}
          onDropPiece={place}
          showLabels={showLabels}
        />
        <p className="muted">
          Drag to move · drag any corner to resize · Shift / Command / Ctrl-click to select more ·
          overlapping is allowed
        </p>
        <section className="card stack">
          <h2>A little composition help</h2>
          <div className="inline">
            <label className="field">
              Composition
              <select value={layout} onChange={(event) => setLayout(event.target.value)}>
                {["grid", "ladder", "diamond", "wave"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <button className="btn" onClick={() => compose()}>
              Arrange wall pieces
            </button>
          </div>
          <p className="muted">
            Keeps your sizes and print groups. Loose library pieces stay loose. Locked groups stay
            still.
          </p>
          <label className="field">
            Template helper (not AI)
            <input
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="Try: arrange my photos in a ladder"
            />
          </label>
          <button className="btn secondary" onClick={templateHelper}>
            Choose matching template
          </button>
        </section>
      </main>

      <Inspector
        pieces={selected}
        onChange={updateSelected}
        onResize={resize}
        onLayer={layer}
        onGroup={group}
        onRemove={() => updateSelected({ placed: false, groupId: null })}
        onDelete={() => {
          if (
            !window.confirm(
              `Delete ${selected.length} selected pieces from the project and wall? Undo can restore them.`,
            )
          )
            return;
          commit((before) => ({
            ...before,
            pieces: before.pieces.filter((piece) => !selectedIds.includes(piece.id)),
          }));
          setSelectedIds([]);
        }}
      />
    </div>
  );
}
