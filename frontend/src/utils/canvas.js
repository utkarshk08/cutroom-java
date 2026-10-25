// Browser-only drawing. No image upload or external rendering service is used.
export const CSS_PIXELS_PER_CM = 96 / 2.54;

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => {
      image.src = "";
      reject(new Error("The image took too long to load. Please retry."));
    }, 10000);
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error("An image could not be read. Please replace it."));
    };
    image.src = src;
  });
}

export function makeCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  if (canvas.width * canvas.height > 16000000 || canvas.width > 6000 || canvas.height > 6000) {
    throw new Error(
      "This export is too large for the small browser version. Reduce the design or print scale.",
    );
  }
  return canvas;
}

function drawText(context, piece, width, height, pixelsPerCm) {
  const size = (piece.fontSize * pixelsPerCm) / CSS_PIXELS_PER_CM;
  context.font = `${piece.italic ? "italic " : ""}${piece.bold ? "bold " : ""}${size}px ${piece.fontFamily || "Arial"}`;
  context.fillStyle = piece.color;
  context.textBaseline = "top";
  const lines = [];
  for (const paragraph of piece.text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > width) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    lines.push(line);
  }
  lines.forEach((line, index) => {
    const y = index * size * 1.15;
    if (y >= height) return;
    context.fillText(line, 0, y);
    if (piece.underline) {
      context.fillRect(
        0,
        y + size,
        Math.min(width, context.measureText(line).width),
        Math.max(1, size / 18),
      );
    }
  });
}

// Each piece rotates around its centre, just like the CSS editor.
export function drawPiece(context, piece, image, pixelsPerCm, offset = { x: 0, y: 0 }) {
  const width = piece.width * pixelsPerCm;
  const height = piece.height * pixelsPerCm;
  context.save();
  context.translate(
    (piece.x - offset.x + piece.width / 2) * pixelsPerCm,
    (piece.y - offset.y + piece.height / 2) * pixelsPerCm,
  );
  context.rotate((piece.rotation * Math.PI) / 180);
  context.translate(-width / 2, -height / 2);
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();
  if (piece.type === "text") {
    if (piece.background && piece.background !== "transparent") {
      context.fillStyle = piece.background;
      context.fillRect(0, 0, width, height);
    }
    drawText(context, piece, width, height, pixelsPerCm);
  } else if (image) context.drawImage(image, 0, 0, width, height);

  const border = (piece.borderWidth * pixelsPerCm) / CSS_PIXELS_PER_CM;
  if (border > 0) {
    const sides =
      piece.borderSides === "all"
        ? ["top", "right", "bottom", "left"]
        : piece.borderSides.split("-");
    context.fillStyle = piece.borderColor;
    if (sides.includes("top")) context.fillRect(0, 0, width, border);
    if (sides.includes("bottom")) context.fillRect(0, height - border, width, border);
    if (sides.includes("left")) context.fillRect(0, 0, border, height);
    if (sides.includes("right")) context.fillRect(width - border, 0, border, height);
  }
  context.restore();
}

export async function renderPieces(pieces, bounds, pixelsPerCm = 40) {
  const canvas = makeCanvas(bounds.width * pixelsPerCm, bounds.height * pixelsPerCm);
  const context = canvas.getContext("2d");
  // Load first, then draw in layer order (not in whichever order downloads finish).
  const images = await Promise.all(
    pieces.map((piece) => (piece.type === "photo" ? loadImage(piece.src) : null)),
  );
  pieces.forEach((piece, index) => drawPiece(context, piece, images[index], pixelsPerCm, bounds));
  return canvas;
}

export async function renderWall(design, pixelsPerCm = 24) {
  const canvas = makeCanvas(design.wall.width * pixelsPerCm, design.wall.height * pixelsPerCm);
  const context = canvas.getContext("2d");
  context.fillStyle = design.wall.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (design.wall.image) {
    const image = await loadImage(design.wall.image);
    context.globalAlpha = design.wall.opacity;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.globalAlpha = 1;
  }
  const layer = await renderPieces(
    design.pieces.filter((piece) => piece.placed),
    { x: 0, y: 0, ...design.wall },
    pixelsPerCm,
  );
  context.drawImage(layer, 0, 0);
  return canvas;
}

export function downloadCanvas(canvas, filename, type = "png") {
  return new Promise((resolve, reject) => {
    const extension = type === "jpg" || type === "jpeg" ? "jpg" : "png";
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Your browser could not create this image."));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}.${extension}`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      },
      extension === "jpg" ? "image/jpeg" : "image/png",
      0.95,
    );
  });
}
