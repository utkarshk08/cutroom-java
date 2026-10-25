import { useEffect, useMemo, useState } from "react";
import { PAPER_SIZES } from "../utils/design.js";
import { downloadCanvas, makeCanvas, renderPieces } from "../utils/canvas.js";
import { getPrintItems, packItems } from "../utils/packing.js";
import "./print.css";

async function drawPage(items, paper, pixelsPerCm = 150 / 2.54) {
  const canvas = makeCanvas(paper.width * pixelsPerCm, paper.height * pixelsPerCm);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (const item of items) {
    const scale = item.renderWidth / item.bounds.width;
    const image = await renderPieces(item.members, item.bounds, pixelsPerCm * scale);
    context.save();
    context.translate(
      (item.x + item.width / 2) * pixelsPerCm,
      (item.y + item.height / 2) * pixelsPerCm,
    );
    context.rotate((item.rotation * Math.PI) / 180);
    context.drawImage(
      image,
      (-item.renderWidth * pixelsPerCm) / 2,
      (-item.renderHeight * pixelsPerCm) / 2,
      item.renderWidth * pixelsPerCm,
      item.renderHeight * pixelsPerCm,
    );
    context.restore();
  }
  return canvas;
}

function printPages(images, paper) {
  // Browser printing avoids adding a PDF library to this small learning project.
  // Every image occupies one physical page. User must choose actual size / 100%.
  const frame = document.createElement("iframe");
  frame.title = "Print pages";
  frame.style.cssText = "position:fixed;left:-10000px;width:1px;height:1px;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(
    `<!doctype html><html><head><title>Cutroom print pack</title><style>@page{size:${paper.width}cm ${paper.height}cm;margin:0}html,body{margin:0}img{display:block;width:${paper.width}cm;height:${paper.height}cm;break-after:page}img:last-child{break-after:auto}</style></head><body></body></html>`,
  );
  doc.close();
  return Promise.all(
    images.map(
      (src) =>
        new Promise((resolve, reject) => {
          const image = doc.createElement("img");
          image.alt = "Print sheet";
          image.onload = resolve;
          image.onerror = () =>
            reject(new Error("The print sheet could not be loaded. Try downloading PNG instead."));
          image.src = src;
          doc.body.appendChild(image);
        }),
    ),
  )
    .then(() => {
      frame.contentWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
      frame.contentWindow.focus();
      frame.contentWindow.print();
      // A fallback cleanup for browsers that do not send afterprint.
      setTimeout(() => frame.remove(), 600000);
    })
    .catch((error) => {
      frame.remove();
      throw error;
    });
}

export default function PrintPack({ design, setDesign, notify }) {
  const [overrides, setOverrides] = useState({});
  const [thumbnails, setThumbnails] = useState({});
  const [previewError, setPreviewError] = useState("");
  const [busy, setBusy] = useState(false);
  const settings = design.print;
  const paperSize = PAPER_SIZES[settings.paper] || [settings.customWidth, settings.customHeight];
  const paper = {
    width: paperSize[0],
    height: paperSize[1],
    margin: settings.margin,
    gap: settings.gap,
    smartRotate: settings.smartRotate,
  };
  const sourceItems = useMemo(() => getPrintItems(design.pieces), [design.pieces]);
  const items = sourceItems.map((item) => {
    const override = overrides[item.id] || {};
    const factor = ((settings.scale / 100) * (override.scale ?? 100)) / 100;
    const width = item.width * factor;
    const height = item.height * factor;
    return {
      ...item,
      width,
      height,
      renderWidth: width,
      renderHeight: height,
      rotation: override.rotation,
    };
  });
  let packed = { pages: [], oversized: [] };
  let packingError = "";
  try {
    packed = packItems(items, paper);
  } catch (error) {
    packingError = error.message;
  }

  useEffect(() => {
    let cancelled = false;
    setPreviewError("");
    setThumbnails({});
    async function createPreviews() {
      try {
        const next = {};
        for (const item of sourceItems) {
          // Small previews use the same drawing code as the downloaded page.
          const resolution = Math.min(24, 1200 / Math.max(item.width, item.height));
          const canvas = await renderPieces(item.members, item.bounds, resolution);
          next[item.id] = canvas.toDataURL("image/png");
          if (cancelled) return;
        }
        setThumbnails(next);
      } catch (error) {
        if (!cancelled) setPreviewError(error.message);
      }
    }
    createPreviews();
    return () => {
      cancelled = true;
    };
  }, [sourceItems]);

  function updateSettings(change) {
    setDesign((previous) => ({ ...previous, print: { ...previous.print, ...change } }));
  }
  function updateItem(id, change) {
    setOverrides((previous) => ({ ...previous, [id]: { ...previous[id], ...change } }));
  }
  function fitItem(item) {
    const previousScale = overrides[item.id]?.scale ?? 100;
    // Round downward to avoid recommending a size just outside the page.
    updateItem(item.id, { scale: Math.floor(previousScale * item.recommendedScale * 100) / 100 });
  }
  async function exportPages(type, pageIndex) {
    if (!packed.pages.length || busy) return;
    if (
      paper.margin < 0.3 &&
      !window.confirm(
        "A margin below 0.3 cm may be clipped by a printer that cannot print borderless. Continue at this margin?",
      )
    )
      return;
    if (
      packed.oversized.length &&
      !window.confirm(
        `${packed.oversized.length} oversized item(s) are excluded. Export only the pieces that fit?`,
      )
    )
      return;
    setBusy(true);
    try {
      if (type === "print") {
        const images = [];
        for (const page of packed.pages)
          images.push((await drawPage(page, paper)).toDataURL("image/png"));
        await printPages(images, paper);
      } else {
        const canvas = await drawPage(packed.pages[pageIndex], paper);
        await downloadCanvas(canvas, `cutroom-page-${pageIndex + 1}`, type);
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="print-pack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">FROM WALL TO PAPER</p>
          <h2>Print Pack</h2>
        </div>
        <button
          disabled={busy || !packed.pages.length || Boolean(packingError)}
          onClick={() => exportPages("print")}
        >
          {busy ? "Preparing pages…" : "Print / Save as PDF"}
        </button>
      </div>
      <p>
        Only pieces on the wall are included. At 100%, their wall sizes are unchanged. A group
        prints as one piece, including its text and overlapping photos.
      </p>
      <div className="form-row">
        <label>
          Paper size
          <select
            value={settings.paper}
            onChange={(event) => updateSettings({ paper: event.target.value })}
          >
            {Object.keys(PAPER_SIZES).map((size) => (
              <option key={size}>{size}</option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        {settings.paper === "custom" && (
          <>
            <label>
              Paper width (cm)
              <input
                type="number"
                min="1"
                max="100"
                step=".1"
                value={settings.customWidth}
                onChange={(event) => updateSettings({ customWidth: Number(event.target.value) })}
              />
            </label>
            <label>
              Paper height (cm)
              <input
                type="number"
                min="1"
                max="100"
                step=".1"
                value={settings.customHeight}
                onChange={(event) => updateSettings({ customHeight: Number(event.target.value) })}
              />
            </label>
          </>
        )}
        <label>
          Margin (cm)
          <input
            type="number"
            min="0"
            max="3"
            step=".1"
            value={settings.margin}
            onChange={(event) =>
              updateSettings({ margin: Math.max(0, Number(event.target.value)) })
            }
          />
        </label>
        <label>
          Cut spacing (cm)
          <input
            type="number"
            min="0"
            max="2"
            step=".1"
            value={settings.gap}
            onChange={(event) => updateSettings({ gap: Math.max(0, Number(event.target.value)) })}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Scale every print item: {settings.scale}%
          <input
            type="range"
            min="25"
            max="200"
            step="1"
            value={settings.scale}
            onChange={(event) => updateSettings({ scale: Number(event.target.value) })}
          />
        </label>
        <button
          className="secondary"
          onClick={() => {
            updateSettings({ scale: 100 });
            setOverrides({});
          }}
        >
          Use original wall sizes
        </button>
        <label className="check-label">
          <input
            type="checkbox"
            checked={settings.smartRotate}
            onChange={(event) => updateSettings({ smartRotate: event.target.checked })}
          />
          Allow smart 90° rotation
        </label>
      </div>
      {paper.margin < 0.3 && (
        <p className="notice">
          Low margin: many printers cannot print this close to the paper edge. We will ask before
          export.
        </p>
      )}
      <p className="small-note">
        Packing uses simple rows, not a perfect paper-saving optimizer. Blank space is okay; sizes
        are never changed automatically. PNG/JPG are raster downloads; set print dimensions
        explicitly. In the browser print dialog, use the selected paper, 100% / actual size, and
        turn off headers and footers. Print typography is approximate, not professional typesetting.
      </p>
      {packingError && (
        <p role="alert" className="notice">
          {packingError}
        </p>
      )}
      {previewError && (
        <p role="alert" className="notice">
          Preview error: {previewError}
        </p>
      )}
      {!sourceItems.length && (
        <p className="empty-state">
          Place photos or text on the wall first. Loose pieces are not printed.
        </p>
      )}
      {packed.oversized.length > 0 && (
        <div className="notice">
          <h3>{packed.oversized.length} item(s) do not fit</h3>
          {packed.oversized.map((item) => (
            <div className="oversized-item" key={item.id}>
              <span>
                <strong>{item.name}</strong> · {item.renderWidth.toFixed(1)} ×{" "}
                {item.renderHeight.toFixed(1)} cm
                <br />
                {item.reason} Suggested maximum:{" "}
                {(item.renderWidth * item.recommendedScale).toFixed(1)} ×{" "}
                {(item.renderHeight * item.recommendedScale).toFixed(1)} cm.
              </span>
              <button disabled={!item.recommendedScale} onClick={() => fitItem(item)}>
                Resize only this print item to fit
              </button>
            </div>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <details className="print-adjustments">
          <summary>Individual print sizes & rotation ({items.length} items)</summary>
          <p className="small-note">
            These overrides affect Print Pack only, never the wall. They are temporary and reset
            when you leave this tab or reload. Global scale and paper settings are saved with the
            design.
          </p>
          <div className="print-item-list">
            {items.map((item) => (
              <div className="print-item" key={item.id}>
                {thumbnails[item.id] && <img src={thumbnails[item.id]} alt="" />}
                <strong>{item.name}</strong>
                <label>
                  Width (cm)
                  <input
                    type="number"
                    min=".1"
                    max="100"
                    step=".1"
                    value={Number(item.renderWidth.toFixed(2))}
                    onChange={(event) => {
                      const width = Number(event.target.value);
                      if (width > 0)
                        updateItem(item.id, {
                          scale: (width / item.bounds.width / (settings.scale / 100)) * 100,
                        });
                    }}
                  />
                </label>
                <span>
                  Height: {item.renderHeight.toFixed(2)} cm
                  <br />
                  <small>Proportions stay locked.</small>
                </span>
                <label>
                  Print rotation
                  <select
                    value={overrides[item.id]?.rotation ?? "auto"}
                    onChange={(event) =>
                      updateItem(item.id, {
                        rotation:
                          event.target.value === "auto" ? undefined : Number(event.target.value),
                      })
                    }
                  >
                    <option value="auto">Automatic</option>
                    {[0, 90, -90, 180].map((angle) => (
                      <option key={angle} value={angle}>
                        {angle}°
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </details>
      )}
      <h3>{packed.pages.length} page(s)</h3>
      <div className="print-pages">
        {packed.pages.map((page, pageIndex) => (
          <article className="print-page-card" key={pageIndex}>
            <div
              className="print-sheet"
              style={{ aspectRatio: `${paper.width} / ${paper.height}` }}
              aria-label={`Page ${pageIndex + 1}, ${page.length} items`}
            >
              <div
                className="print-margin"
                style={{
                  inset: `${(paper.margin / paper.height) * 100}% ${(paper.margin / paper.width) * 100}%`,
                }}
              />
              {page.map((item) => (
                <div
                  className="print-placement"
                  key={item.id}
                  style={{
                    left: `${(item.x / paper.width) * 100}%`,
                    top: `${(item.y / paper.height) * 100}%`,
                    width: `${(item.width / paper.width) * 100}%`,
                    height: `${(item.height / paper.height) * 100}%`,
                  }}
                  title={`${item.name}: ${item.width.toFixed(1)} × ${item.height.toFixed(1)} cm`}
                >
                  {thumbnails[item.id] ? (
                    <img
                      src={thumbnails[item.id]}
                      alt={item.name}
                      style={{
                        width: `${(item.renderWidth / item.width) * 100}%`,
                        height: `${(item.renderHeight / item.height) * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                      }}
                    />
                  ) : (
                    <span>Preparing…</span>
                  )}
                </div>
              ))}
            </div>
            <p>
              Page {pageIndex + 1} · {paper.width} × {paper.height} cm
            </p>
            <div className="button-row">
              <button disabled={busy} onClick={() => exportPages("png", pageIndex)}>
                Download PNG
              </button>
              <button
                disabled={busy}
                className="secondary"
                onClick={() => exportPages("jpg", pageIndex)}
              >
                Download JPG
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
