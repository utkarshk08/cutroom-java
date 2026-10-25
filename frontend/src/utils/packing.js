import { rotatedBounds } from "./design.js";

// One group becomes one print item, while array order keeps the wall's layers.
export function getPrintItems(pieces) {
  const items = [];
  for (const piece of pieces.filter((piece) => piece.placed)) {
    const id = piece.groupId ? `group:${piece.groupId}` : piece.id;
    let item = items.find((item) => item.id === id);
    if (!item) {
      item = { id, name: piece.groupId ? "Grouped design" : piece.name, members: [] };
      items.push(item);
    }
    item.members.push(piece);
  }
  for (const item of items) {
    const boxes = item.members.map(rotatedBounds);
    const x = Math.min(...boxes.map((box) => box.x));
    const y = Math.min(...boxes.map((box) => box.y));
    const width = Math.max(...boxes.map((box) => box.x + box.width)) - x;
    const height = Math.max(...boxes.map((box) => box.y + box.height)) - y;
    item.bounds = { x, y, width, height };
    item.width = width;
    item.height = height;
    if (item.members.length > 1) item.name = `${item.members.length} grouped pieces`;
  }
  return items;
}

function orientations(item, smartRotate) {
  // Undefined means automatic. Explicit zero must still prevent smart rotation.
  const angles = item.rotation == null ? (smartRotate ? [0, 90] : [0]) : [item.rotation];
  return angles.map((rotation) => {
    const sideways = Math.abs(rotation) === 90;
    return {
      ...item,
      rotation,
      width: sideways ? item.height : item.width,
      height: sideways ? item.width : item.height,
    };
  });
}

export function fitScale(item, paper, allowRotate = true) {
  const width = paper.width - 2 * paper.margin;
  const height = paper.height - 2 * paper.margin;
  if (width <= 0 || height <= 0) return 0;
  return Math.max(
    ...orientations(item, allowRotate).map((option) =>
      Math.min(width / option.width, height / option.height),
    ),
  );
}

// A simple shelf algorithm: fill a row, then start the next row or page.
// It never stretches a photo. This is understandable, not optimal bin packing.
export function packItems(items, paper) {
  const { width, height, margin, gap, smartRotate } = paper;
  if (
    ![width, height, margin, gap].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    margin < 0 ||
    gap < 0
  ) {
    throw new Error(
      "Enter valid paper dimensions, a non-negative margin, and a non-negative cut spacing.",
    );
  }
  const usableWidth = width - 2 * margin;
  const usableHeight = height - 2 * margin;
  if (usableWidth <= 0 || usableHeight <= 0)
    throw new Error("The page margin leaves no printable area.");
  const pages = [];
  const oversized = [];
  let page = [];
  let x = margin;
  let y = margin;
  let rowHeight = 0;
  const fits = (option) =>
    option.width <= width - margin - x + 1e-7 && option.height <= height - margin - y + 1e-7;
  const choose = (options) =>
    options
      .filter(fits)
      .sort((a, b) => Math.max(rowHeight, a.height) - Math.max(rowHeight, b.height))[0];

  // Larger items go first so small items do not consume all of the first row.
  const ordered = [...items].sort((a, b) => b.width * b.height - a.width * a.height);
  for (const item of ordered) {
    if (!(item.width > 0 && item.height > 0) || !Number.isFinite(item.width * item.height)) {
      oversized.push({ ...item, reason: "Invalid item dimensions.", recommendedScale: 0 });
      continue;
    }
    const options = orientations(item, smartRotate);
    if (
      !options.some(
        (option) => option.width <= usableWidth + 1e-7 && option.height <= usableHeight + 1e-7,
      )
    ) {
      oversized.push({
        ...item,
        reason: "Larger than this page’s usable area.",
        recommendedScale: fitScale(item, paper, smartRotate),
      });
      continue;
    }
    let placed = choose(options);
    if (!placed) {
      x = margin;
      y += rowHeight + gap;
      rowHeight = 0;
      placed = choose(options);
    }
    if (!placed) {
      if (page.length) pages.push(page);
      page = [];
      x = margin;
      y = margin;
      rowHeight = 0;
      placed = choose(options);
    }
    page.push({ ...placed, x, y });
    x += placed.width + gap;
    rowHeight = Math.max(rowHeight, placed.height);
  }
  if (page.length) pages.push(page);
  return { pages, oversized };
}
