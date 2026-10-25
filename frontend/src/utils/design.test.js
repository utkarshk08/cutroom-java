import test from "node:test";
import assert from "node:assert/strict";
import {
  arrangePieces,
  createDesign,
  createPhoto,
  createText,
  readDesign,
  TEXT_STYLES,
} from "./design.js";

test("new photos have unique identities and no automatic border", () => {
  const first = createPhoto("", "one");
  const second = createPhoto("", "two");
  assert.notEqual(first.id, second.id);
  assert.equal(first.borderWidth, 0);
  assert.equal(first.placed, false);
  assert.equal(TEXT_STYLES.length, 20);
  assert.equal(createText().ratioLocked, false);
});

test("backup round trip and hostile URLs", () => {
  const design = createDesign();
  const photo = createPhoto("javascript:alert(1)", "one");
  design.pieces = [photo, { ...photo }];
  const restored = readDesign(JSON.stringify(design));
  assert.equal(restored.pieces[0].src, "");
  assert.notEqual(restored.pieces[0].id, restored.pieces[1].id);
  assert.throws(() => readDesign('{"version":7}'));
});

test("arrangements preserve size, loose items, and group offsets", () => {
  const loose = createPhoto("", "loose");
  const a = { ...createPhoto("", "a"), placed: true, groupId: "g", x: 8, y: 8 };
  const b = { ...createText("hello"), groupId: "g", x: 10, y: 12 };
  const result = arrangePieces([loose, a, b], { width: 160, height: 100 }, "grid");
  assert.deepEqual(result[0], loose);
  assert.equal(result[1].width, a.width);
  assert.equal(result[2].x - result[1].x, 2);
  assert.equal(result[2].y - result[1].y, 4);
});

test("failed layouts do not mutate the input", () => {
  const pieces = [{ ...createPhoto("", "large", 40, 40), placed: true }];
  const original = JSON.stringify(pieces);
  assert.throws(() => arrangePieces(pieces, { width: 20, height: 20 }));
  assert.equal(JSON.stringify(pieces), original);
});
