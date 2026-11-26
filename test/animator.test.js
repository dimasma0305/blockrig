import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Animator, ease } from "../src/animator.js";
import { createRig } from "../src/rig.js";
import { clips } from "../src/clips.js";

const near = (a, b, eps = 1e-4) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
// angle of a joint's rotation relative to its bind pose, recovered through the rig
function jointAngle(rig, name, axis = "x") {
  const probe = createRig({ body: false }); // compare against a fresh rig set to a known angle
  let best = 0, err = Infinity;
  for (let a = -3.2; a <= 3.2; a += 0.001) { probe.setJoint(name, axis === "x" ? a : 0, axis === "y" ? a : 0, axis === "z" ? a : 0); const e = probe.bones[name] ? probe.bones[name].quaternion.angleTo(rig.bones[name].quaternion) : probe.neck.quaternion.angleTo(rig.neck.quaternion); if (e < err) { err = e; best = a; } }
  return best;
}
const clip = (name, keys, extra = {}) => ({ name, loop: true, priority: "Action", ...extra, keyframes: keys });
const arm = (t, x, ease = "Linear", dir = "In") => ({ t, poses: { RightUpperArm: { r: [x, 0, 0], ease, dir } } });

test("easing: endpoints, symmetry and known values", () => {
  for (const s of ["Linear", "Cubic", "Elastic", "Bounce"]) for (const d of ["In", "Out", "InOut"]) { near(ease(s, d, 0), 0); near(ease(s, d, 1), 1); }
  near(ease("Linear", "In", 0.3), 0.3);
  near(ease("Cubic", "In", 0.5), 0.125);
  near(ease("Cubic", "Out", 0.5), 0.875);
  near(ease("Cubic", "InOut", 0.5), 0.5);
  near(ease("Cubic", "InOut", 0.25), 1 - ease("Cubic", "InOut", 0.75));
  near(ease("Bounce", "Out", 1 / 2.75), 1);
  assert.ok(ease("Elastic", "Out", 0.2) > 1, "elastic overshoots");
  near(ease("Constant", "In", 0.99), 0);
});

test("sampling: linear interpolation between keyframes", () => {
  const rig = createRig({ body: false }), an = new Animator(rig);
  an.play(clip("a", [arm(0, 0), arm(1, 1)], { length: 1, loop: false }), { fade: 0 });
  an.update(0.5);
  near(jointAngle(rig, "RightUpperArm"), 0.5, 2e-3);
});

test("sampling: Constant holds the earlier keyframe until the next one", () => {
  const rig = createRig({ body: false }), an = new Animator(rig);
  an.play(clip("c", [arm(0, 0.2, "Constant"), arm(1, 1.2)], { length: 2 }), { fade: 0 });
  an.update(0.99);
  near(jointAngle(rig, "RightUpperArm"), 0.2, 2e-3);
  an.update(0.02);
  near(jointAngle(rig, "RightUpperArm"), 1.2, 2e-3);
});

test("sampling: a joint missing from a keyframe interpolates between the keyframes that have it", () => {
  const rig = createRig({ body: false }), an = new Animator(rig);
  an.play(clip("gap", [arm(0, 0), { t: 0.5, poses: { Neck: { r: [0.3, 0, 0] } } }, arm(1, 1)], { length: 1, loop: false }), { fade: 0 });
  an.update(0.5);
  near(jointAngle(rig, "RightUpperArm"), 0.5, 2e-3);
});

test("looping wraps time; non-looping clips stop and fade out", () => {
  const rig = createRig({ body: false }), an = new Animator(rig);
  const loop = clip("loop", [arm(0, 0), arm(1, 1)], { length: 1 });
  an.play(loop, { fade: 0 }); an.update(1.25);
  near(jointAngle(rig, "RightUpperArm"), 0.25, 2e-3);
  const once = clip("once", [arm(0, 0), arm(1, 1)], { length: 1, loop: false });
  const an2 = new Animator(createRig({ body: false })); const tr = an2.play(once, { fade: 0.2 });
  an2.update(1.05); assert.equal(tr.target, 0);
  an2.update(0.5); assert.equal(an2.tracks.length, 0);
});

test("priority: a higher-priority clip overrides only the joints it keys", () => {
  const rig = createRig({ body: false }), an = new Animator(rig);
  an.play({ name: "low", priority: "Idle", length: 1, keyframes: [{ t: 0, poses: { RightUpperArm: { r: [0.4, 0, 0] }, LeftUpperArm: { r: [0.7, 0, 0] } } }] }, { fade: 0 });
  an.play({ name: "high", priority: "Action", length: 1, keyframes: [{ t: 0, poses: { RightUpperArm: { r: [1.5, 0, 0] } } }] }, { fade: 0 });
  an.update(0.1);
  near(jointAngle(rig, "RightUpperArm"), 1.5, 2e-3);
  near(jointAngle(rig, "LeftUpperArm"), 0.7, 2e-3);
});

test("weights: same priority averages; partial weight lays over the lower result", () => {
  const rig = createRig({ body: false }), an = new Animator(rig);
  const k = (x) => ({ length: 1, priority: "Action", keyframes: [{ t: 0, poses: { RightUpperArm: { r: [x, 0, 0] } } }] });
  an.play({ name: "a", ...k(0) }, { fade: 0, weight: 1 }); an.play({ name: "b", ...k(1) }, { fade: 0, weight: 1 });
  an.update(0.01);
  near(jointAngle(rig, "RightUpperArm"), 0.5, 3e-3);
  const rig2 = createRig({ body: false }), an2 = new Animator(rig2);
  an2.play({ name: "base", ...k(0), priority: "Idle" }, { fade: 0 }); an2.play({ name: "top", ...k(1) }, { fade: 0, weight: 0.25 });
  an2.update(0.01);
  near(jointAngle(rig2, "RightUpperArm"), 0.25, 3e-3);
});

test("fades are linear in time", () => {
  const rig = createRig({ body: false }), an = new Animator(rig);
  const tr = an.play(clip("f", [arm(0, 1)], { length: 1 }), { fade: 0.4 });
  an.update(0.1); near(tr.weight, 0.25);
  an.update(0.1); near(tr.weight, 0.5);
  // fadeTime is the time to reach the target from the current weight (Roblox): 0.5 -> 0 over 0.2 s
  an.stop("f", 0.2); an.update(0.1); near(tr.weight, 0.25); an.update(0.1); near(tr.weight, 0);
});

test("markers fire once per loop, including across the wrap", () => {
  const an = new Animator(createRig({ body: false })), seen = [];
  an.onMarker((n) => seen.push(n));
  an.play(clip("m", [arm(0, 0), arm(1, 0)], { length: 1, markers: [{ t: 0.5, name: "mid" }, { t: 0.95, name: "late" }] }), { fade: 0 });
  for (let i = 0; i < 30; i++) an.update(0.1); // 3 loops
  assert.deepEqual(seen.filter((x) => x === "mid").length, 3);
  assert.deepEqual(seen.filter((x) => x === "late").length, 3);
});

test("root offset (HumanoidRootPart position keys) moves the body", () => {
  const rig = createRig({ body: false }), an = new Animator(rig);
  const y0 = rig.jointPosition("LowerTorso").y;
  an.play({ name: "hop", length: 1, loop: false, keyframes: [{ t: 0, poses: { HumanoidRootPart: { p: [0, 0, 0], ease: "Linear" } } }, { t: 1, poses: { HumanoidRootPart: { p: [0, 2, 0] } } }] }, { fade: 0 });
  an.update(0.5);
  near(rig.jointPosition("LowerTorso").y - y0, 1, 1e-4);
});

test("bundled clips are well-formed and only key real joints", () => {
  const rig = createRig({ body: false });
  const joints = new Set([...rig.joints, "HumanoidRootPart"]);
  for (const [name, c] of Object.entries(clips)) {
    assert.equal(c.name, name);
    assert.ok(c.length > 0);
    let last = -1;
    for (const k of c.keyframes) { assert.ok(k.t >= last && k.t <= c.length); last = k.t; for (const j of Object.keys(k.poses)) assert.ok(joints.has(j), `${name}: unknown joint ${j}`); }
    const an = new Animator(createRig({ body: false })); an.play(c, { fade: 0 });
    for (let i = 0; i < 40; i++) an.update(c.length / 37);
    an.rig.object.updateMatrixWorld(true);
    an.rig.object.traverse((o) => { if (o.isBone) for (const e of o.matrixWorld.elements) assert.ok(Number.isFinite(e)); });
  }
});
