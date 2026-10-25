import test from "node:test";
import assert from "node:assert/strict";
import { getPrintItems, packItems } from "./packing.js";

const page = { width: 21, height: 29.7, margin: 0.5, gap: 0.2, smartRotate: true };
const item = (id, width, height, rotation) => ({ id, width, height, rotation });

test("sizes are preserved and loose photos are excluded", () => {
  const pieces = [
    { id: "a", name: "First", placed: true, x: 0, y: 0, width: 10, height: 15, rotation: 0 },
    { id: "b", placed: false, x: 0, y: 0, width: 30, height: 30, rotation: 0 },
  ];
  const result = packItems(getPrintItems(pieces), page);
  assert.equal(result.pages[0].length, 1);
  assert.equal(result.pages[0][0].width * result.pages[0][0].height, 150);
});

test("group bounds include overlap and wall rotation", () => {
  const pieces = [
    { id: "a", groupId: "g", placed: true, x: 0, y: 0, width: 10, height: 20, rotation: 90 },
    { id: "b", groupId: "g", placed: true, x: 5, y: 5, width: 5, height: 5, rotation: 0 },
  ];
  const items = getPrintItems(pieces);
  assert.equal(items.length, 1);
  assert.ok(Math.abs(items[0].width - 20) < 1e-6);
  assert.ok(Math.abs(items[0].height - 10) < 1e-6);
  assert.equal(items[0].members.length, 2);
});

test("smart rotation fits a landscape item without resizing", () => {
  const result = packItems([item("a", 25, 18)], page);
  assert.equal(result.pages[0][0].rotation, 90);
  assert.equal(result.pages[0][0].width, 18);
  assert.equal(result.pages[0][0].height, 25);
});

test("manual zero is respected even when smart rotation is enabled", () => {
  const result = packItems([item("a", 25, 18, 0)], page);
  assert.equal(result.pages.length, 0);
  assert.equal(result.oversized.length, 1);
  assert.equal(result.oversized[0].recommendedScale, 0.8);
});

test("manual -90 and 180 rotations are preserved", () => {
  assert.equal(packItems([item("a", 25, 18, -90)], page).pages[0][0].rotation, -90);
  assert.equal(packItems([item("a", 10, 20, 180)], page).pages[0][0].rotation, 180);
});

test("zero margins and gaps do not change dimensions", () => {
  const result = packItems([item("a", 10, 10), item("b", 10, 10)], {
    width: 20,
    height: 10,
    margin: 0,
    gap: 0,
    smartRotate: false,
  });
  assert.equal(result.pages.length, 1);
  assert.deepEqual(
    result.pages[0].map((piece) => [piece.x, piece.y]),
    [
      [0, 0],
      [10, 0],
    ],
  );
});

test("packing never overlaps placements or runs outside the page", () => {
  const input = Array.from({ length: 25 }, (_, index) =>
    item(String(index), 3 + (index % 6), 4 + (index % 9)),
  );
  const { pages, oversized } = packItems(input, page);
  assert.equal(oversized.length, 0);
  assert.equal(pages.flat().length, input.length);
  for (const sheet of pages)
    for (const piece of sheet) {
      assert.ok(piece.x >= page.margin && piece.y >= page.margin);
      assert.ok(piece.x + piece.width <= page.width - page.margin + 1e-6);
      assert.ok(piece.y + piece.height <= page.height - page.margin + 1e-6);
      for (const other of sheet.filter((other) => other.id !== piece.id)) {
        const overlap =
          piece.x < other.x + other.width &&
          piece.x + piece.width > other.x &&
          piece.y < other.y + other.height &&
          piece.y + piece.height > other.y;
        assert.equal(overlap, false);
      }
    }
});

test("invalid page dimensions fail clearly instead of looping", () => {
  assert.throws(() => packItems([], { ...page, margin: 12 }), /no printable area/);
  assert.throws(() => packItems([], { ...page, gap: -1 }), /valid paper/);
});
