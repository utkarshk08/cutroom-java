// All dimensions below are centimeters, except fontSize/borderWidth (CSS pixels).
export const PAPER_SIZES = {
  A2: [42, 59.4],
  A3: [29.7, 42],
  A4: [21, 29.7],
  A5: [14.8, 21],
  A6: [10.5, 14.8],
};

export const TEXT_STYLES = [
  { id: "plain", name: "Clean note", fontFamily: "Arial", color: "#29263c" },
  { id: "headline", name: "Big statement", fontFamily: "Arial", bold: true, color: "#161323" },
  { id: "editorial", name: "Editorial", fontFamily: "Georgia", italic: true, color: "#544236" },
  { id: "typewriter", name: "Typewriter", fontFamily: "Courier New", color: "#343434" },
  {
    id: "candy",
    name: "Candy pop",
    fontFamily: "Arial",
    bold: true,
    color: "#ee4999",
    background: "#ffe3ef",
  },
  {
    id: "mint",
    name: "Mint club",
    fontFamily: "Verdana",
    bold: true,
    color: "#12664a",
    background: "#d4f6dd",
  },
  {
    id: "night",
    name: "After hours",
    fontFamily: "Arial",
    color: "#fff1a6",
    background: "#29263c",
  },
  { id: "royal", name: "Royal letter", fontFamily: "Georgia", bold: true, color: "#513ab4" },
  {
    id: "sunshine",
    name: "Sunshine",
    fontFamily: "Verdana",
    bold: true,
    color: "#8b4700",
    background: "#ffe796",
  },
  {
    id: "ice",
    name: "Ice blue",
    fontFamily: "Arial",
    italic: true,
    color: "#207ab9",
    background: "#e0f3ff",
  },
  {
    id: "vintage",
    name: "Vintage stamp",
    fontFamily: "Courier New",
    bold: true,
    color: "#a7502f",
    background: "#f5e7d6",
  },
  {
    id: "poetry",
    name: "Little poem",
    fontFamily: "Georgia",
    italic: true,
    color: "#914d7c",
    background: "#f9eafa",
  },
  { id: "poster", name: "Poster title", fontFamily: "Impact", color: "#eb4a39" },
  {
    id: "ticket",
    name: "Cinema ticket",
    fontFamily: "Courier New",
    bold: true,
    color: "#f9f5e8",
    background: "#b83b42",
  },
  {
    id: "sage",
    name: "Sage journal",
    fontFamily: "Georgia",
    color: "#3f5849",
    background: "#e4ebdd",
  },
  {
    id: "electric",
    name: "Electric violet",
    fontFamily: "Impact",
    color: "#d5ff52",
    background: "#6846d8",
  },
  { id: "signature", name: "Signature", fontFamily: "cursive", italic: true, color: "#4c3760" },
  {
    id: "ink",
    name: "Ink on paper",
    fontFamily: "Georgia",
    bold: true,
    color: "#262626",
    background: "#f1eadb",
  },
  {
    id: "ocean",
    name: "Ocean label",
    fontFamily: "Verdana",
    color: "#ffffff",
    background: "#2a7f8c",
  },
  {
    id: "peach",
    name: "Peach postcard",
    fontFamily: "Georgia",
    italic: true,
    color: "#b34c2c",
    background: "#ffe1ce",
  },
];

export function createPhoto(src, name, width = 15, height = 20) {
  return {
    id: crypto.randomUUID(),
    name,
    type: "photo",
    src,
    x: 5,
    y: 5,
    width,
    height,
    rotation: 0,
    placed: false,
    locked: false,
    ratioLocked: true,
    groupId: null,
    borderColor: "#ffffff",
    borderWidth: 0,
    borderSides: "all",
    text: "",
    fontSize: 32,
    fontFamily: "Arial",
    color: "#29263c",
    bold: false,
    italic: false,
    underline: false,
    textStyle: "plain",
    background: "transparent",
  };
}

export function createText(text = "Your words", style = "plain") {
  const preset = TEXT_STYLES.find((item) => item.id === style) || TEXT_STYLES[0];
  return {
    ...createPhoto("", "Text", 30, 10),
    ...preset,
    id: crypto.randomUUID(),
    name: text.slice(0, 30),
    type: "text",
    text,
    placed: true,
    textStyle: preset.id,
    ratioLocked: false,
  };
}

export function createDesign() {
  return {
    version: 1,
    wall: { width: 160, height: 100, color: "#f8f5ef", image: "", opacity: 1 },
    pieces: [],
    print: {
      paper: "A4",
      customWidth: 21,
      customHeight: 29.7,
      margin: 0.5,
      gap: 0.2,
      scale: 100,
      smartRotate: true,
    },
  };
}

export function rotatedBounds(piece) {
  const angle = (piece.rotation * Math.PI) / 180;
  const width = Math.abs(piece.width * Math.cos(angle)) + Math.abs(piece.height * Math.sin(angle));
  const height = Math.abs(piece.width * Math.sin(angle)) + Math.abs(piece.height * Math.cos(angle));
  return {
    x: piece.x + (piece.width - width) / 2,
    y: piece.y + (piece.height - height) / 2,
    width,
    height,
  };
}

// These are shape-inspired arrangements, not AI or a mathematical optimizer.
// Groups move together. A failed arrangement leaves the original design untouched.
export function arrangePieces(pieces, wall, layout = "grid") {
  const units = [];
  for (const piece of pieces.filter((item) => item.placed)) {
    const key = piece.groupId || piece.id;
    let unit = units.find((item) => item.id === key);
    if (!unit) {
      unit = { id: key, members: [] };
      units.push(unit);
    }
    unit.members.push(piece);
  }
  for (const unit of units) {
    const boxes = unit.members.map(rotatedBounds);
    unit.x = Math.min(...boxes.map((box) => box.x));
    unit.y = Math.min(...boxes.map((box) => box.y));
    unit.width = Math.max(...boxes.map((box) => box.x + box.width)) - unit.x;
    unit.height = Math.max(...boxes.map((box) => box.y + box.height)) - unit.y;
    unit.locked = unit.members.some((item) => item.locked);
  }
  const moving = units.filter((unit) => !unit.locked);
  if (!moving.length) return pieces;
  if (layout === "ladder") moving.sort((a, b) => a.width * a.height - b.width * b.height);
  const gap = 2;
  const cellW = Math.max(...moving.map((unit) => unit.width)) + gap;
  const cellH = Math.max(...moving.map((unit) => unit.height)) + gap;
  const columns = Math.max(1, Math.floor(wall.width / cellW));
  const offsets = new Map();
  const occupied = units.filter((unit) => unit.locked);
  moving.forEach((unit, index) => {
    let x = gap + (index % columns) * cellW;
    let y = gap + Math.floor(index / columns) * cellH;
    if (layout === "ladder") {
      x = gap + index * cellW;
      y = gap + index * cellH;
    }
    if (layout === "wave") {
      x = gap + index * cellW;
      y = gap + ((1 + Math.sin(index * 0.9)) * cellH) / 2;
    }
    if (layout === "diamond") {
      const row = Math.floor(index / columns);
      x += (Math.abs(Math.floor(moving.length / columns / 2) - row) * cellW) / 2;
    }
    const candidate = { x, y, width: unit.width, height: unit.height };
    const touches = occupied.some(
      (other) =>
        x < other.x + other.width &&
        x + unit.width > other.x &&
        y < other.y + other.height &&
        y + unit.height > other.y,
    );
    if (x + unit.width > wall.width || y + unit.height > wall.height || touches) {
      throw new Error(
        "This simple layout does not fit. Try Grid, enlarge the wall, or move locked pieces. No sizes were changed.",
      );
    }
    occupied.push(candidate);
    for (const member of unit.members)
      offsets.set(member.id, { x: member.x + x - unit.x, y: member.y + y - unit.y });
  });
  return pieces.map((piece) =>
    offsets.has(piece.id) ? { ...piece, ...offsets.get(piece.id) } : piece,
  );
}

// Backup imports are untrusted input: accept only this edition's bounded schema.
export function readDesign(json) {
  if (typeof json !== "string" || json.length > 8_000_000)
    throw new Error("Design exceeds the 8 MB learning-project limit.");
  const data = JSON.parse(json);
  if (data?.version !== 1 || !data.wall || !Array.isArray(data.pieces) || data.pieces.length > 80) {
    throw new Error(
      "Use a Cutroom Java/React edition backup (version 1, at most 80 pieces). Original app backups use a different format.",
    );
  }
  const bounded = (value, min, max, fallback) =>
    Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
  const color = (value, fallback) => (/^#[0-9a-f]{6}$/i.test(value) ? value : fallback);
  const image = (value) =>
    typeof value === "string" && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)
      ? value
      : "";
  const ids = new Set();
  const wall = {
    width: bounded(data.wall.width, 10, 1000, 160),
    height: bounded(data.wall.height, 10, 1000, 100),
    color: color(data.wall.color, "#f8f5ef"),
    image: image(data.wall.image),
    opacity: bounded(data.wall.opacity, 0, 1, 1),
  };
  const pieces = data.pieces.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid piece in backup.");
    const id =
      typeof item.id === "string" && item.id.length < 100 && !ids.has(item.id)
        ? item.id
        : crypto.randomUUID();
    ids.add(id);
    const preset = TEXT_STYLES.find((style) => style.id === item.textStyle) || TEXT_STYLES[0];
    return {
      ...createPhoto(image(item.src), String(item.name || "Piece").slice(0, 100)),
      id,
      type: item.type === "text" ? "text" : "photo",
      x: bounded(item.x, -1000, 1000, 0),
      y: bounded(item.y, -1000, 1000, 0),
      width: bounded(item.width, 0.1, 1000, 15),
      height: bounded(item.height, 0.1, 1000, 20),
      rotation: bounded(item.rotation, -180, 180, 0),
      placed: Boolean(item.placed),
      locked: Boolean(item.locked),
      ratioLocked: item.type === "text" ? false : item.ratioLocked !== false,
      groupId: typeof item.groupId === "string" && item.groupId.length < 100 ? item.groupId : null,
      text: String(item.text || "").slice(0, 2000),
      fontSize: bounded(item.fontSize, 8, 200, 32),
      fontFamily: TEXT_STYLES.some((style) => style.fontFamily === item.fontFamily)
        ? item.fontFamily
        : "Arial",
      bold: Boolean(item.bold),
      italic: Boolean(item.italic),
      underline: Boolean(item.underline),
      color: color(item.color, "#29263c"),
      background: color(item.background, "transparent"),
      textStyle: preset.id,
      borderColor: color(item.borderColor, "#ffffff"),
      borderWidth: bounded(item.borderWidth, 0, 20, 0),
      borderSides: ["all", "top", "right", "bottom", "left", "top-bottom"].includes(
        item.borderSides,
      )
        ? item.borderSides
        : "all",
    };
  });
  const print = data.print || {};
  return {
    version: 1,
    wall,
    pieces,
    print: {
      paper: PAPER_SIZES[print.paper] || print.paper === "custom" ? print.paper : "A4",
      customWidth: bounded(print.customWidth, 1, 100, 21),
      customHeight: bounded(print.customHeight, 1, 100, 29.7),
      margin: bounded(print.margin, 0, 3, 0.5),
      gap: bounded(print.gap, 0, 2, 0.2),
      scale: bounded(print.scale, 25, 200, 100),
      smartRotate: print.smartRotate !== false,
    },
  };
}
