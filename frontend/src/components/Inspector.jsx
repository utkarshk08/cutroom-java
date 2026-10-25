import { useState } from "react";
import { PAPER_SIZES } from "../utils/design";
import TextPanel from "./TextPanel";

export default function Inspector({
  pieces,
  onChange,
  onResize,
  onLayer,
  onGroup,
  onRemove,
  onDelete,
}) {
  const [resizeWidth, setResizeWidth] = useState(15);
  const [resizeHeight, setResizeHeight] = useState(20);
  const first = pieces[0];
  if (!first)
    return (
      <aside className="inspector-panel card">
        <h2>Make it yours</h2>
        <p className="muted">
          Select a piece on the wall. Shift-click or Command/Ctrl-click to choose more.
        </p>
      </aside>
    );
  const single = pieces.length === 1;
  const locked = pieces.some((piece) => piece.locked);

  function numberChange(field, value, min, max) {
    if (!Number.isFinite(Number(value))) return;
    onChange({ [field]: Math.max(min, Math.min(max, Number(value))) });
  }

  return (
    <aside className="inspector-panel card stack">
      <h2>{single ? first.name : `${pieces.length} selected`}</h2>
      <button
        className="btn secondary"
        onClick={() => onChange({ locked: !pieces.every((piece) => piece.locked) })}
      >
        {pieces.every((piece) => piece.locked) ? "Unlock positions" : "Lock positions"}
      </button>
      <fieldset disabled={locked} className="stack">
        <legend>Size & position</legend>
        {single ? (
          <>
            <div className="form-grid">
              <label className="field">
                Width (cm)
                <input
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  value={Number(first.width.toFixed(2))}
                  onChange={(event) => onResize(Number(event.target.value), null)}
                />
              </label>
              <label className="field">
                Height (cm)
                <input
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  value={Number(first.height.toFixed(2))}
                  onChange={(event) => onResize(null, Number(event.target.value))}
                />
              </label>
              <label className="field">
                X (cm)
                <input
                  type="number"
                  step="0.1"
                  value={Number(first.x.toFixed(2))}
                  onChange={(event) => numberChange("x", event.target.value, -1000, 1000)}
                />
              </label>
              <label className="field">
                Y (cm)
                <input
                  type="number"
                  step="0.1"
                  value={Number(first.y.toFixed(2))}
                  onChange={(event) => numberChange("y", event.target.value, -1000, 1000)}
                />
              </label>
            </div>
            {first.type === "photo" && (
              <label className="inline">
                <input
                  type="checkbox"
                  checked={first.ratioLocked}
                  onChange={(event) => onChange({ ratioLocked: event.target.checked })}
                />
                Lock photo ratio
              </label>
            )}
            <label className="field">
              Paper preset
              <select
                value=""
                onChange={(event) => {
                  const size = PAPER_SIZES[event.target.value];
                  if (size) onResize(...size);
                }}
              >
                <option value="">Choose size…</option>
                {Object.keys(PAPER_SIZES).map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <p className="muted">
              Apply the same dimensions to every selected piece. This can change photo proportions.
            </p>
            <div className="form-grid">
              <label className="field">
                Width (cm)
                <input
                  type="number"
                  min="0.1"
                  max="1000"
                  value={resizeWidth}
                  onChange={(event) => setResizeWidth(Number(event.target.value))}
                />
              </label>
              <label className="field">
                Height (cm)
                <input
                  type="number"
                  min="0.1"
                  max="1000"
                  value={resizeHeight}
                  onChange={(event) => setResizeHeight(Number(event.target.value))}
                />
              </label>
            </div>
            <button className="btn secondary" onClick={() => onResize(resizeWidth, resizeHeight)}>
              Resize selected…
            </button>
          </>
        )}
        <label className="field">
          Rotation ({first.rotation}°){!single && <small>Applies to all selected</small>}
          <input
            type="range"
            min="-180"
            max="180"
            value={first.rotation}
            onChange={(event) => numberChange("rotation", event.target.value, -180, 180)}
          />
        </label>
        <div className="inline">
          <button className="btn secondary" onClick={() => onChange({ rotation: 90 })}>
            Horizontal
          </button>
          <button className="btn secondary" onClick={() => onChange({ rotation: 0 })}>
            Reset
          </button>
        </div>
      </fieldset>
      {locked && <p className="muted">Unlock the selection to resize, rotate, or move it.</p>}
      <section className="stack">
        <h3>Border</h3>
        <div className="form-grid">
          <label className="field">
            Width (px)
            <input
              type="number"
              min="0"
              max="20"
              value={first.borderWidth}
              onChange={(event) => numberChange("borderWidth", event.target.value, 0, 20)}
            />
          </label>
          <label className="field">
            Color
            <input
              type="color"
              value={first.borderColor}
              onChange={(event) => onChange({ borderColor: event.target.value })}
            />
          </label>
        </div>
        <label className="field">
          Sides
          <select
            value={first.borderSides}
            onChange={(event) => onChange({ borderSides: event.target.value })}
          >
            {["all", "top", "right", "bottom", "left", "top-bottom"].map((side) => (
              <option key={side} value={side}>
                {side}
              </option>
            ))}
          </select>
        </label>
        <button className="btn secondary" onClick={() => onChange({ borderWidth: 0 })}>
          No border
        </button>
      </section>
      {single && first.type === "text" && <TextPanel piece={first} onChange={onChange} />}
      <section className="stack">
        <h3>Layers & groups</h3>
        <div className="inline">
          <button className="btn secondary" onClick={() => onLayer("back")}>
            Send to back
          </button>
          <button className="btn secondary" onClick={() => onLayer("front")}>
            Bring to front
          </button>
        </div>
        <div className="inline">
          <button className="btn secondary" disabled={single} onClick={() => onGroup(true)}>
            Group for print
          </button>
          <button
            className="btn secondary"
            disabled={!pieces.some((piece) => piece.groupId)}
            onClick={() => onGroup(false)}
          >
            Ungroup
          </button>
        </div>
        <p className="muted">A group keeps overlapping photos and text together in Print Pack.</p>
      </section>
      <button className="btn secondary" onClick={onRemove}>
        Remove from wall
      </button>
      <button className="btn danger" onClick={onDelete}>
        Delete from project…
      </button>
    </aside>
  );
}
