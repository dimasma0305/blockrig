import { test } from "node:test";
import assert from "node:assert/strict";
import { createFace, drawFace, expression, mixFace, EXPRESSIONS, FACE_DEFAULTS } from "../src/face.js";
import { createRig } from "../src/rig.js";
import { Animator } from "../src/animator.js";
import { mockCanvas } from "./helpers/mock-canvas.js";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const ops = (c) => c.calls.map((x) => x[0]);

test("every expression only uses known parameters with sane values", () => {
  assert.ok(Object.keys(EXPRESSIONS).length >= 15);
  for (const [name, e] of Object.entries(EXPRESSIONS)) {
    for (const [k, v] of Object.entries(e)) {
      assert.ok(k in FACE_DEFAULTS, `${name}: unknown parameter ${k}`);
      assert.ok(Number.isFinite(v) && v >= -1 && v <= 1.5, `${name}.${k} = ${v}`);
    }
    const full = expression(name);
    assert.deepEqual(Object.keys(full).sort(), Object.keys(FACE_DEFAULTS).sort());
  }
  assert.throws(() => expression("confused-ish"), /unknown expression/);
  assert.equal(expression({ mouthOpen: 0.5 }).mouthOpen, 0.5);
});

test("drawFace: each expression draws, and its features show up as the right shapes", () => {
  const c = mockCanvas();
  const draw = (name) => { c.reset(); drawFace(c.getContext(), expression(name)); return ops(c); };
  for (const name of Object.keys(EXPRESSIONS)) { const o = draw(name); assert.equal(o[0], "save"); assert.equal(o.at(-1), "restore"); }
  // a closed mouth is one stroked curve; an open one is filled and clipped (for teeth/tongue)
  assert.ok(!draw("neutral").includes("clip"));
  assert.ok(draw("roar").includes("clip") && draw("roar").includes("fillRect"));
  // x eyes and >< eyes are strokes, not filled ellipses
  const dazed = draw("dazed"), hurt = draw("hurt");
  assert.ok(dazed.filter((x) => x === "lineTo").length >= 4);
  assert.ok(hurt.filter((x) => x === "lineTo").length >= 4);
  // a background colour fills the decal before drawing (to cover a baked-in face)
  c.reset(); drawFace(c.getContext(), expression("happy"), { background: "#ddd" });
  assert.deepEqual(c.calls.find((x) => x[0] === "fillRect"), ["fillRect", 0, 0, 256, 256]);
});

test("mixFace blends linearly", () => {
  const a = expression("neutral"), b = expression("angry"), m = mixFace(a, b, 0.25);
  near(m.browAngle, a.browAngle + (b.browAngle - a.browAngle) * 0.25);
});

test("createFace: fades towards the target, instant when fade is 0", () => {
  const f = createFace({ canvas: mockCanvas(), blink: false });
  f.set("angry", { fade: 0.2 });
  f.update(0.1);
  assert.ok(f.current.browAngle > 0.4 && f.current.browAngle < 1);
  for (let i = 0; i < 60; i++) f.update(0.05);
  near(f.current.browAngle, 1, 1e-3);
  f.set("sad", { fade: 0 });
  near(f.current.browAngle, EXPRESSIONS.sad.browAngle);
  assert.equal(f.name, "sad");
});

test("createFace: blinks on its own, never while knocked out", () => {
  const f = createFace({ canvas: mockCanvas(), seed: 3 });
  let closed = 0;
  for (let i = 0; i < 600; i++) { f.update(1 / 60); if (f.params().eyeOpen < 0.3) closed++; }
  assert.ok(closed > 0, "should blink within 10 s");
  const ko = createFace({ canvas: mockCanvas(), expression: "dazed" });
  for (let i = 0; i < 600; i++) { ko.update(1 / 60); assert.equal(ko.blinkT, -1); }
});

test("createFace: lookAt and talk feed into the drawn parameters; onChange fires on redraw", () => {
  const f = createFace({ canvas: mockCanvas(), blink: false });
  let n = 0; f.onChange(() => n++);
  f.lookAt(0.5, -0.25); f.update(0.016);
  near(f.params().lookX, 0.5); near(f.params().lookY, -0.25);
  assert.ok(n >= 1);
  const quiet = n; f.update(0.016); assert.equal(n, quiet, "no redraw when nothing changed");
  f.talk(true); let open = 0; for (let i = 0; i < 20; i++) { f.update(0.02); open = Math.max(open, f.params().mouthOpen); }
  assert.ok(open > 0.3);
});

test("rig + animator: face markers change the expression and the animator keeps the face updating", () => {
  const face = createFace({ canvas: mockCanvas(), blink: false });
  const rig = createRig({ face });
  assert.equal(rig.face, face);
  const an = new Animator(rig);
  an.play({ name: "taunt", length: 1, markers: [{ t: 0.1, name: "face:furious" }, { t: 0.6, name: "face:laugh" }], keyframes: [{ t: 0, poses: { Neck: { r: [0, 0, 0] } } }] }, { fade: 0 });
  an.update(0.2); for (let i = 0; i < 10; i++) an.update(0.02);
  assert.equal(face.name, "furious");
  near(face.current.browAngle, 1, 0.05);
  an.update(0.5);
  assert.equal(face.name, "laugh");
  rig.setExpression("sad", { fade: 0 });
  assert.equal(face.name, "sad");
});

test("addFaceDecal puts a live face on any rig's head", () => {
  const face = createFace({ canvas: mockCanvas(), blink: false });
  const rig = createRig({ body: false });
  const decal = rig.addFaceDecal(face, { radius: 0.7 });
  assert.equal(decal.parent, rig.head);
  assert.equal(rig.face, face);
  decal.geometry.computeBoundingBox();
  assert.ok(decal.geometry.boundingBox.min.z < -0.6, "decal sits on the -Z (face) side");
  rig.setExpression("grin"); rig.updateFace(1);
  assert.equal(face.name, "grin");
});
