// Classic Roblox faces: a Decal named "face" whose Texture is replaced, instantly, to change the face. Nothing is drawn
// by BlockRig itself (no procedural expressions, blinking or crossfades).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFace } from "../src/face.js";
import { createRig } from "../src/rig.js";
import { Animator } from "../src/animator.js";
import { mockCanvas } from "./helpers/mock-canvas.js";

const img = (id) => ({ width: 420, height: 420, id });

test("face Decal: replacing its Texture is instant (Roblox's only face behaviour); unknown names throw", () => {
  const c = mockCanvas(), happy = img("happy"), mad = img("mad");
  const f = createFace({ canvas: c, images: { happy, mad } });
  const drawn = () => c.calls.filter((x) => x[0] === "drawImage").map((x) => x[1].id);
  assert.equal(f.name, "happy", "starts on the first image");
  assert.deepEqual(drawn(), ["happy"]);
  let changes = 0; f.onChange(() => changes++);
  f.update(); c.reset(); assert.equal(f.update(), false, "nothing changed: no redraw"); assert.deepEqual(drawn(), []);
  f.set("mad"); c.reset(); assert.equal(f.update(), true);
  assert.deepEqual(drawn(), ["mad"], "one frame: the new image only, no blend");
  assert.equal(changes, 2, "the first update (the initial picture) and the swap"); assert.equal(f.usingImage, true);
  assert.throws(() => f.set("grin"), /no face image "grin"/);
  assert.equal(createFace({ canvas: mockCanvas(), images: { a: img("a"), b: img("b") }, expression: "b" }).name, "b");
  const none = createFace({ canvas: mockCanvas() }); assert.equal(none.name, null, "no images: an empty Decal");
});

test("face Decal on a rig: rig.setExpression and face:<name> markers swap the image; other markers are ignored", () => {
  const face = createFace({ canvas: mockCanvas(), images: { calm: img("calm"), rage: img("rage") } });
  const rig = createRig({ face });
  assert.equal(rig.face, face);
  const an = new Animator(rig);
  an.play({ name: "x", length: 1, markers: [{ t: 0.1, name: "face:rage" }, { t: 0.3, name: "face:unknown" }], keyframes: [{ t: 0, poses: { Neck: { r: [0, 0, 0] } } }] }, { fade: 0 });
  an.update(0.15); assert.equal(face.name, "rage");
  an.update(0.2); assert.equal(face.name, "rage", "a marker naming no image changes nothing");
  rig.setExpression("calm"); rig.updateFace(); assert.equal(face.name, "calm");
});

test("addFaceDecal puts a face Decal on any rig's head", () => {
  const face = createFace({ canvas: mockCanvas(), images: { smile: img("smile"), grin: img("grin") } });
  const rig = createRig({ body: false });
  const decal = rig.addFaceDecal(face, { radius: 0.7 });
  assert.equal(decal.parent, rig.head);
  assert.equal(rig.face, face);
  decal.geometry.computeBoundingBox();
  assert.ok(decal.geometry.boundingBox.min.z < -0.6, "decal sits on the -Z (face) side");
  rig.setExpression("grin"); rig.updateFace();
  assert.equal(face.name, "grin");
});
