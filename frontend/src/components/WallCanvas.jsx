import { useRef, useState } from "react";
import { rotatedBounds } from "../utils/design";

// Convert a browser pointer location into centimeters on the wall.
function pointOnWall(event, element, wall) {
  const rect = element.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * wall.width,
    y: ((event.clientY - rect.top) / rect.height) * wall.height,
  };
}

export function borderStyle(piece, scale = 1) {
  const border = `${piece.borderWidth * scale}px solid ${piece.borderColor}`;
  const sides =
    piece.borderSides === "all"
      ? ["top", "right", "bottom", "left"]
      : piece.borderSides === "top-bottom"
        ? ["top", "bottom"]
        : [piece.borderSides];
  return Object.fromEntries(
    sides.map((side) => [`border${side[0].toUpperCase()}${side.slice(1)}`, border]),
  );
}

export default function WallCanvas({
  design,
  selectedIds,
  onSelect,
  onCommit,
  onDropPiece,
  showLabels,
}) {
  const canvasRef = useRef(null);
  const gesture = useRef(null);
  const [draft, setDraft] = useState(null);
  const { wall } = design;
  const pieces = draft || design.pieces;

  function beginDrag(event, piece, corner = null) {
    if (event.button !== 0) return;
    event.stopPropagation();
    const ids = corner
      ? selectedIds
      : onSelect(piece.id, event.shiftKey || event.metaKey || event.ctrlKey);
    // Do not pull an unlocked member away from a locked member of its group.
    if (design.pieces.some((item) => ids.includes(item.id) && item.locked)) return;
    const start = pointOnWall(event, canvasRef.current, wall);
    gesture.current = { start, pieces: design.pieces, ids, piece, corner, moved: false };
    canvasRef.current.setPointerCapture(event.pointerId);
  }

  function move(event) {
    const drag = gesture.current;
    if (!drag) return;
    const point = pointOnWall(event, canvasRef.current, wall);
    let dx = point.x - drag.start.x;
    let dy = point.y - drag.start.y;
    if (Math.abs(dx) + Math.abs(dy) < 0.05) return;
    drag.moved = true;

    if (drag.corner) {
      const piece = drag.piece;
      const angle = (piece.rotation * Math.PI) / 180;
      const cosine = Math.cos(angle),
        sine = Math.sin(angle);
      const [sx, sy] = drag.corner;
      let width = Math.max(1, piece.width + sx * (dx * cosine + dy * sine));
      let height = Math.max(1, piece.height + sy * (-dx * sine + dy * cosine));
      if (piece.ratioLocked && piece.type !== "text") {
        if (Math.abs(height / piece.height - 1) > Math.abs(width / piece.width - 1))
          width = (height * piece.width) / piece.height;
        else height = (width * piece.height) / piece.width;
      }
      width = Math.min(1000, width);
      height = Math.min(1000, height);
      // Keep the opposite corner fixed, including when the piece is rotated.
      const shiftX = (sx * (width - piece.width)) / 2;
      const shiftY = (sy * (height - piece.height)) / 2;
      const x = piece.x + shiftX * cosine - shiftY * sine - (width - piece.width) / 2;
      const y = piece.y + shiftX * sine + shiftY * cosine - (height - piece.height) / 2;
      setDraft(
        drag.pieces.map((item) => (item.id === piece.id ? { ...item, x, y, width, height } : item)),
      );
      return;
    }

    const moving = drag.pieces.filter(
      (item) => drag.ids.includes(item.id) && item.placed && !item.locked,
    );
    if (!moving.length) return;
    const bounds = moving.map(rotatedBounds);
    const left = Math.min(...bounds.map((box) => box.x));
    const top = Math.min(...bounds.map((box) => box.y));
    const right = Math.max(...bounds.map((box) => box.x + box.width));
    const bottom = Math.max(...bounds.map((box) => box.y + box.height));
    // Clamp the entire selection, preserving the spacing between its members.
    if (right - left <= wall.width) dx = Math.max(-left, Math.min(wall.width - right, dx));
    if (bottom - top <= wall.height) dy = Math.max(-top, Math.min(wall.height - bottom, dy));
    setDraft(
      drag.pieces.map((item) =>
        moving.includes(item) ? { ...item, x: item.x + dx, y: item.y + dy } : item,
      ),
    );
  }

  function finish() {
    if (gesture.current?.moved && draft) onCommit(draft);
    gesture.current = null;
    setDraft(null);
  }

  return (
    <div className="canvas-scroll">
      <div
        ref={canvasRef}
        className="wall-canvas"
        style={{ aspectRatio: `${wall.width} / ${wall.height}`, background: wall.color }}
        onPointerDown={() => onSelect(null)}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={() => {
          gesture.current = null;
          setDraft(null);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onDropPiece(
            event.dataTransfer.getData("cutroom-piece"),
            pointOnWall(event, canvasRef.current, wall),
          );
        }}
        aria-label={`Wall, ${wall.width} by ${wall.height} centimeters`}
      >
        {wall.image && (
          <img
            className="room-background"
            src={wall.image}
            alt="Your room"
            style={{ opacity: wall.opacity }}
            draggable={false}
          />
        )}
        {pieces
          .filter((piece) => piece.placed)
          .map((piece) => {
            const selected = selectedIds.includes(piece.id);
            // cqw is 1% of this wall's width. 96 CSS pixels represent one inch.
            const pixelScale = (2.54 / 96 / wall.width) * 100;
            const cssBorders = borderStyle(piece);
            Object.keys(cssBorders).forEach((key) => {
              cssBorders[key] = `${piece.borderWidth * pixelScale}cqw solid ${piece.borderColor}`;
            });
            return (
              <div
                key={piece.id}
                role="button"
                tabIndex={0}
                aria-label={`${piece.name}${piece.locked ? ", locked" : ""}`}
                aria-pressed={selected}
                className={`wall-piece ${selected ? "selected" : ""} ${piece.locked ? "locked" : ""}`}
                style={{
                  left: `${(piece.x / wall.width) * 100}%`,
                  top: `${(piece.y / wall.height) * 100}%`,
                  width: `${(piece.width / wall.width) * 100}%`,
                  height: `${(piece.height / wall.height) * 100}%`,
                  transform: `rotate(${piece.rotation}deg)`,
                }}
                onPointerDown={(event) => beginDrag(event, piece)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(piece.id, event.shiftKey || event.metaKey || event.ctrlKey);
                  }
                }}
              >
                <div className="piece-content" style={cssBorders}>
                  {piece.type === "photo" ? (
                    <img src={piece.src} alt="" draggable={false} />
                  ) : (
                    <div
                      className="wall-text"
                      style={{
                        fontFamily: piece.fontFamily,
                        fontSize: `${piece.fontSize * pixelScale}cqw`,
                        color: piece.color,
                        background: piece.background,
                        fontWeight: piece.bold ? 700 : 400,
                        fontStyle: piece.italic ? "italic" : "normal",
                        textDecoration: piece.underline ? "underline" : "none",
                      }}
                    >
                      {piece.text}
                    </div>
                  )}
                </div>
                {showLabels && (
                  <span className="piece-label">
                    {piece.name}
                    {piece.locked ? " · Locked" : ""}
                  </span>
                )}
                {selected &&
                  selectedIds.length === 1 &&
                  !piece.locked &&
                  [
                    [-1, -1],
                    [1, -1],
                    [-1, 1],
                    [1, 1],
                  ].map(([x, y]) => (
                    <span
                      key={`${x},${y}`}
                      className="resize-handle"
                      style={{
                        left: x < 0 ? 0 : "100%",
                        top: y < 0 ? 0 : "100%",
                        cursor: x === y ? "nwse-resize" : "nesw-resize",
                      }}
                      onPointerDown={(event) => beginDrag(event, piece, [x, y])}
                      aria-hidden="true"
                    />
                  ))}
              </div>
            );
          })}
        {!design.pieces.some((piece) => piece.placed) && (
          <div className="wall-empty">
            Drop a piece here.
            <br />
            <small>Or double-click a library thumbnail.</small>
          </div>
        )}
      </div>
    </div>
  );
}
