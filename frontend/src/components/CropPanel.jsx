import { useMemo, useState } from "react";
import { createPhoto, PAPER_SIZES } from "../utils/design.js";
import { loadImage, makeCanvas } from "../utils/canvas.js";
import "./print.css";

function gridRegions(width, height, rows, columns) {
  const regions = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      // The end of one crop is exactly the beginning of the next. No gutter is discarded.
      const x = Math.round((column * width) / columns);
      const y = Math.round((row * height) / rows);
      regions.push({
        x,
        y,
        width: Math.round(((column + 1) * width) / columns) - x,
        height: Math.round(((row + 1) * height) / rows) - y,
      });
    }
  }
  return regions;
}

function cropImage(image, region, shape) {
  const canvas = makeCanvas(region.width, region.height);
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  context.beginPath();
  if (shape === "ellipse")
    context.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  else if (shape === "heart") {
    context.moveTo(width / 2, height);
    context.bezierCurveTo(-width * 0.25, height * 0.45, 0, -height * 0.2, width / 2, height * 0.22);
    context.bezierCurveTo(width, -height * 0.2, width * 1.25, height * 0.45, width / 2, height);
  } else context.rect(0, 0, width, height);
  context.clip();
  context.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

export default function CropPanel({ onAdd, notify }) {
  const [source, setSource] = useState(null);
  const [paper, setPaper] = useState("A3");
  const [custom, setCustom] = useState([29.7, 42]);
  const [mode, setMode] = useState("grid");
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [shape, setShape] = useState("rectangle");
  const [manual, setManual] = useState([]);
  const [draft, setDraft] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [dragStart, setDragStart] = useState(null);
  const [busy, setBusy] = useState(false);
  const sheetSize = PAPER_SIZES[paper] || custom;
  const regions = source
    ? mode === "grid"
      ? gridRegions(source.image.width, source.image.height, rows, columns)
      : manual
    : [];

  const previews = useMemo(() => {
    if (!source) return [];
    try {
      const boxes =
        mode === "grid"
          ? gridRegions(source.image.width, source.image.height, rows, columns)
          : manual;
      return boxes.map((region) => ({ ...region, src: cropImage(source.image, region, shape) }));
    } catch {
      return [];
    }
  }, [source, mode, rows, columns, manual, shape]);

  async function upload(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      notify("Choose a PNG, JPG, or WebP sheet up to 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const src = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read this sheet."));
        reader.readAsDataURL(file);
      });
      const image = await loadImage(src);
      if (image.width * image.height > 16000000)
        throw new Error("Please reduce the sheet to 16 megapixels or less before importing.");
      setSource({ image, src, name: file.name });
      setManual([]);
      setDraft({ x: 0, y: 0, width: image.width, height: image.height });
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  function addRegion() {
    const region = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, Math.round(Number(value))]),
    );
    if (
      !Object.values(region).every(Number.isFinite) ||
      region.width < 1 ||
      region.height < 1 ||
      region.x < 0 ||
      region.y < 0 ||
      region.x + region.width > source.image.width ||
      region.y + region.height > source.image.height
    ) {
      notify("The cut must stay inside the sheet and be at least one pixel wide and high.");
      return;
    }
    if (manual.length >= 64) {
      notify("Use up to 64 cutouts per sheet in this version.");
      return;
    }
    setManual([...manual, region]);
  }

  function pointerPosition(event) {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          source.image.width,
          Math.round(((event.clientX - box.left) * source.image.width) / box.width),
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          source.image.height,
          Math.round(((event.clientY - box.top) * source.image.height) / box.height),
        ),
      ),
    };
  }

  function createCutouts() {
    if (!sheetSize.every((size) => Number.isFinite(size) && size > 0 && size <= 100)) {
      notify("Choose sheet dimensions between 0 and 100 cm.");
      return;
    }
    const pieces = previews.map((region, index) =>
      createPhoto(
        region.src,
        `${source.name} — ${index + 1}`,
        (region.width / source.image.width) * sheetSize[0],
        (region.height / source.image.height) * sheetSize[1],
      ),
    );
    onAdd(pieces);
  }

  return (
    <section className="crop-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">CUT YOUR SHEET</p>
          <h2>Preview first. Cut second.</h2>
        </div>
      </div>
      <p>
        Use the original sheet size to keep every cutout’s real dimensions. Grid cuts include the
        borders and every pixel between photos.
      </p>
      <label className="upload-box">
        {busy ? "Reading sheet…" : "Choose a sheet (PNG, JPG, WebP · up to 2 MB)"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={upload}
          disabled={busy}
        />
      </label>
      <div className="form-row">
        <label>
          Original sheet size
          <select value={paper} onChange={(event) => setPaper(event.target.value)}>
            {Object.keys(PAPER_SIZES).map((size) => (
              <option key={size}>{size}</option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        {paper === "custom" &&
          custom.map((size, index) => (
            <label key={index}>
              {index ? "Height" : "Width"} (cm)
              <input
                type="number"
                min=".1"
                max="100"
                step=".1"
                value={size}
                onChange={(event) =>
                  setCustom(
                    custom.map((value, i) => (i === index ? Number(event.target.value) : value)),
                  )
                }
              />
            </label>
          ))}
        <button
          onClick={() => {
            setCustom([sheetSize[1], sheetSize[0]]);
            setPaper("custom");
          }}
        >
          Swap sheet orientation
        </button>
      </div>
      <p className="small-note">
        Sheet: {sheetSize[0]} × {sheetSize[1]} cm. Changing this changes the physical cutout sizes,
        not their pixel count.
      </p>
      <div className="form-row">
        <label>
          Cutting method
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="grid">Grid</option>
            <option value="manual">Manual rectangles</option>
          </select>
        </label>
        <label>
          Cutout shape
          <select value={shape} onChange={(event) => setShape(event.target.value)}>
            <option value="rectangle">Rectangle</option>
            <option value="ellipse">Ellipse</option>
            <option value="heart">Heart</option>
          </select>
        </label>
        {mode === "grid" && (
          <>
            <label>
              Rows
              <input
                type="number"
                min="1"
                max="8"
                value={rows}
                onChange={(event) =>
                  setRows(Math.max(1, Math.min(8, Math.round(Number(event.target.value) || 1))))
                }
              />
            </label>
            <label>
              Columns
              <input
                type="number"
                min="1"
                max="8"
                value={columns}
                onChange={(event) =>
                  setColumns(Math.max(1, Math.min(8, Math.round(Number(event.target.value) || 1))))
                }
              />
            </label>
          </>
        )}
      </div>
      <p className="notice">
        AI cutout detection and freehand polygon cutting are planned, not connected in this
        Java/React edition. No AI request is sent.
      </p>
      {source && (
        <>
          <div className="crop-workspace">
            <div className="crop-sheet">
              <img src={source.src} alt="Original sheet" />
              <svg
                viewBox={`0 0 ${source.image.width} ${source.image.height}`}
                style={{ touchAction: mode === "manual" ? "none" : "auto" }}
                onPointerDown={(event) => {
                  if (mode !== "manual") return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragStart(pointerPosition(event));
                }}
                onPointerMove={(event) => {
                  if (!dragStart) return;
                  const point = pointerPosition(event);
                  setDraft({
                    x: Math.min(point.x, dragStart.x),
                    y: Math.min(point.y, dragStart.y),
                    width: Math.max(1, Math.abs(point.x - dragStart.x)),
                    height: Math.max(1, Math.abs(point.y - dragStart.y)),
                  });
                }}
                onPointerUp={() => setDragStart(null)}
                onPointerCancel={() => setDragStart(null)}
              >
                {regions.map((region, index) => (
                  <rect
                    key={index}
                    {...region}
                    className="crop-region"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {mode === "manual" && (
                  <rect {...draft} className="crop-draft" vectorEffect="non-scaling-stroke" />
                )}
              </svg>
            </div>
            {mode === "manual" && (
              <div>
                <h3>Manual cut</h3>
                <p>
                  Draw a box on the sheet, or type exact pixel coordinates. Add each box before
                  creating cutouts.
                </p>
                <div className="form-grid">
                  {["x", "y", "width", "height"].map((key) => (
                    <label key={key}>
                      {key} (pixels)
                      <input
                        type="number"
                        min={key === "x" || key === "y" ? 0 : 1}
                        value={draft[key]}
                        onChange={(event) =>
                          setDraft({ ...draft, [key]: Number(event.target.value) })
                        }
                      />
                    </label>
                  ))}
                </div>
                <button onClick={addRegion}>Add this cut to preview</button>
                <button className="secondary" onClick={() => setManual([])}>
                  Clear cuts
                </button>
              </div>
            )}
          </div>
          <h3>{previews.length} cutout previews</h3>
          <p className="small-note">
            Transparent areas show a checkerboard. Ellipse and heart shapes intentionally remove
            pixels outside the shape.
          </p>
          <div className="cutout-previews">
            {previews.map((region, index) => (
              <figure key={index}>
                <div className="checkerboard">
                  <img src={region.src} alt={`Cutout ${index + 1}`} />
                </div>
                <figcaption>
                  #{index + 1} · {((region.width / source.image.width) * sheetSize[0]).toFixed(1)} ×{" "}
                  {((region.height / source.image.height) * sheetSize[1]).toFixed(1)} cm
                </figcaption>
                {mode === "manual" && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setDraft(manual[index]);
                      setManual(manual.filter((_, i) => i !== index));
                    }}
                  >
                    Edit this cut
                  </button>
                )}
              </figure>
            ))}
          </div>
          {regions.length > 0 && !previews.length && (
            <p role="alert">
              These cutouts are too large to preview. Reduce the source resolution or choose smaller
              cuts.
            </p>
          )}
          <button disabled={!previews.length} onClick={createCutouts}>
            Create {previews.length} cutouts in Your pieces
          </button>
        </>
      )}
    </section>
  );
}
