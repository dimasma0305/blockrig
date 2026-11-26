import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Animator, AnimationTrack, createRig } from "../src/index.js";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const arm = (t, x) => ({ t, poses: { RightUpperArm: { r: [x, 0, 0], ease: "Linear", dir: "In" } } });
const ramp = (o = {}) => ({ name: "ramp", length: 1, loop: true, priority: "Action", keyframes: [arm(0, 0), arm(1, 1)], ...o });
// the arm's rotation angle, read back from the bone (the clip only rotates about X)
const angle = (rig) => { const probe = createRig({ body: false }); let best = 0, err = Infinity; for (let a = -0.2; a <= 1.2; a += 0.0005) { probe.setJoint("RightUpperArm", a, 0, 0); const e = probe.bones.RightUpperArm.quaternion.angleTo(rig.bones.RightUpperArm.quaternion); if (e < err) { err = e; best = a; } } return best; };

test("loadAnimation: a track that plays only when told to", () => {
  const rig = createRig({ body: false }), an = new Animator(rig), tr = an.loadAnimation(ramp());
  assert.ok(tr instanceof AnimationTrack);
  assert.equal(tr.isPlaying, false); assert.equal(an.tracks.length, 0);
  assert.equal(tr.length, 1); assert.equal(tr.looped, true); assert.equal(tr.priority, "Action");
  tr.play(0); assert.equal(tr.isPlaying, true); assert.deepEqual(an.getPlayingAnimationTracks(), [tr]);
  an.update(0.25); near(tr.timePosition, 0.25); near(angle(rig), 0.25, 2e-3);
});

test("timePosition: set it to seek; clamped to the clip; frame-pure sampling", () => {
  const rig = createRig({ body: false }), an = new Animator(rig), tr = an.loadAnimation(ramp()).play(0);
  for (const t of [0.7, 0.1, 0.9, 0.4]) { tr.timePosition = t; an.update(0); near(angle(rig), t, 2e-3); }
  tr.timePosition = 5; assert.equal(tr.timePosition, 1);
  tr.timePosition = -1; assert.equal(tr.timePosition, 0);
});

test("adjustSpeed: faster, slower and backwards (wrapping when looped)", () => {
  const an = new Animator(createRig({ body: false })), tr = an.play(ramp(), { fade: 0 });
  tr.adjustSpeed(2); an.update(0.25); near(tr.timePosition, 0.5); assert.equal(tr.speed, 2);
  tr.adjustSpeed(-1); an.update(0.75); near(tr.timePosition, 0.75, 1e-9); // 0.5 -> -0.25 wraps to 0.75
  const once = an.play(ramp({ name: "once", loop: false }), { fade: 0, speed: -1 });
  assert.equal(once.timePosition, 1, "a backwards play starts at the end");
  an.update(0.4); near(once.timePosition, 0.6);
});

test("adjustWeight fades to the new weight; weightCurrent / weightTarget", () => {
  const an = new Animator(createRig({ body: false })), tr = an.play(ramp(), { fade: 0 });
  an.update(0.01); assert.equal(tr.weightCurrent, 1);
  tr.adjustWeight(0.5, 0.2); assert.equal(tr.weightTarget, 0.5);
  an.update(0.1); near(tr.weightCurrent, 0.75); an.update(0.1); near(tr.weightCurrent, 0.5);
  tr.adjustWeight(0.2, 0); an.update(0.01); near(tr.weightCurrent, 0.2);
});

test("looped and priority can be changed per track", () => {
  const rig = createRig({ body: false }), an = new Animator(rig);
  const base = an.play({ name: "base", length: 1, priority: "Idle", keyframes: [arm(0, 0.2)] }, { fade: 0 });
  const top = an.play({ name: "top", length: 1, priority: "Action", keyframes: [arm(0, 0.9)] }, { fade: 0 });
  an.update(0.01); near(angle(rig), 0.9, 2e-3);
  base.priority = "Action4"; an.update(0.01); near(angle(rig), 0.2, 2e-3);
  assert.throws(() => { top.priority = "Loud"; }, /unknown priority/);
  const tr = an.play(ramp({ name: "r2" }), { fade: 0 }); tr.looped = false;
  an.update(1.5); assert.equal(tr.isPlaying, false, "no longer loops");
});

test("events: stopped, ended (after the fade), didLoop", () => {
  const an = new Animator(createRig({ body: false })), log = [];
  const tr = an.play(ramp(), { fade: 0 });
  tr.didLoop.connect(() => log.push("loop")); tr.stopped.connect(() => log.push("stopped")); tr.ended.connect(() => log.push("ended"));
  an.update(0.6); an.update(0.6); an.update(2.0);
  assert.deepEqual(log, ["loop", "loop", "loop"], "one didLoop per wrap, even several in one step");
  tr.stop(0.2); assert.deepEqual(log.slice(3), ["stopped"], "stopped fires when stop() is called");
  an.update(0.1); assert.equal(log.length, 4);
  an.update(0.15); assert.deepEqual(log.slice(4), ["ended"], "ended fires once fully faded");
  assert.equal(an.tracks.length, 0);
  // a non-looped track reaching its end stops by itself
  const once = an.play(ramp({ name: "once", loop: false }), { fade: 0 }), seen = [];
  once.stopped.connect(() => seen.push("stopped")); once.ended.connect(() => seen.push("ended"));
  an.update(1.1); an.update(0.2);
  assert.deepEqual(seen, ["stopped", "ended"]);
});

test("markers: getMarkerReachedSignal gets the value, keyframeReached the keyframe name", () => {
  const an = new Animator(createRig({ body: false })), marks = [], keys = [], all = [];
  const clip = ramp({ markers: [{ t: 0.3, name: "Step", value: "left", kind: "marker" }, { t: 0.6, name: "Step", value: "right", kind: "marker" }, { t: 0.5, name: "Apex", kind: "keyframe" }] });
  const tr = an.play(clip, { fade: 0 });
  const c = tr.getMarkerReachedSignal("Step").connect((v) => marks.push(v));
  tr.keyframeReached.connect((n) => keys.push(n));
  an.onMarker((n, cl, v) => all.push(`${n}:${v ?? ""}`));
  an.update(0.7);
  assert.deepEqual(marks, ["left", "right"]); assert.deepEqual(keys, ["Apex"]);
  assert.deepEqual(all, ["Step:left", "Apex:", "Step:right"]);
  c.disconnect(); an.update(1.0); assert.equal(marks.length, 2, "disconnected");
  assert.equal(tr.getTimeOfKeyframe("Apex"), 0.5);
  assert.throws(() => tr.getTimeOfKeyframe("Nope"), /no keyframe named/);
  // seeking doesn't fire markers; playing backwards does, in reverse
  const back = []; tr.getMarkerReachedSignal("Step").connect((v) => back.push(v));
  tr.timePosition = 0.9; an.update(0);
  tr.adjustSpeed(-1); an.update(0.65); assert.deepEqual(back, ["right", "left"]);
});

test("frame-pure posing: seek every track to its own time and step 0", () => {
  // what a renderer that draws frames in any order (Remotion) needs: no state carried between frames
  const rig = createRig({ body: false }), an = new Animator(rig), tr = an.loadAnimation(ramp()).play(0);
  const at = (t) => { tr.timePosition = t % tr.length; an.update(0); return rig.bones.RightUpperArm.quaternion.clone(); };
  const a = at(0.3), b = at(0.8), a2 = at(1.3);
  assert.ok(a.angleTo(a2) < 1e-9, "same time, same pose, whatever was drawn before");
  assert.ok(a.angleTo(b) > 0.1);
  assert.ok(createRig({ body: false }).bones.RightUpperArm.quaternion.angleTo(at(0)) < 1e-9, "time 0 is the rest pose (the clip keys 0 there)");
});
