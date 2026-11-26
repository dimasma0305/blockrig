import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import zlib from "node:zlib";
import { parseRbxm } from "../src/rbxm.js";
import { keyframeSequenceToClip } from "../src/keyframes.js";
import { createRig } from "../src/rig.js";
import { Animator } from "../src/animator.js";
import { writeRbxm } from "./helpers/rbxm-writer.js";

const S = 0x01, B = 0x02, F = 0x04, CF = 0x10, E = 0x12;
const near = (a, b, eps = 1e-4) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const close = (a, b, eps = 1e-4) => a.forEach((x, i) => near(x, b[i], eps));
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const rotX = (a) => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
const pose = (name, cf, children = [], style = 0, dir = 0, weight = 1) => ({ className: "Pose", props: { Name: [S, name], CFrame: [CF, cf], EasingStyle: [E, style], EasingDirection: [E, dir], Weight: [F, weight] }, children });
const keyframe = (t, poses, name = "Keyframe", markers = []) => ({ className: "Keyframe", props: { Name: [S, name], Time: [F, t] }, children: [pose("HumanoidRootPart", { rot: I3, pos: [0, 0, 0] }, poses), ...markers] });
const sequence = (frames, { loop = true, priority = 2, name = "Wave" } = {}) => ({ className: "KeyframeSequence", props: { Name: [S, name], Loop: [B, loop], Priority: [E, priority] }, children: frames });
const load = (ks, o) => keyframeSequenceToClip(parseRbxm(writeRbxm([ks], { mode: zlib.zstdCompressSync ? "zstd" : "lz4" }), { zstd: (b) => zlib.zstdDecompressSync(b) }), o);

// a small R15 animation: raise the right arm over 1 s, with a bob of the lower torso and a named keyframe + marker
const wave = sequence([
  keyframe(0, [pose("LowerTorso", { rot: I3, pos: [0, 0, 0] }, [pose("UpperTorso", { rot: I3, pos: [0, 0, 0] }, [pose("RightUpperArm", { rot: I3, pos: [0, 0, 0] }, [], 0, 0)])])]),
  keyframe(0.5, [pose("LowerTorso", { rot: I3, pos: [0, -0.3, 0] }, [], 3, 1)], "Dip", [{ className: "KeyframeMarker", props: { Name: [S, "Sound"], Value: [S, "whoosh"] } }]),
  keyframe(1, [pose("LowerTorso", { rot: I3, pos: [0, 0, 0] }, [pose("UpperTorso", { rot: I3, pos: [0, 0, 0] }, [pose("RightUpperArm", { rot: rotX(Math.PI), pos: [0, 0, 0] })])])]),
]);

test("KeyframeSequence -> clip: timing, Loop, Priority, names, KeyframeReached and markers", () => {
  const c = load(wave);
  assert.equal(c.name, "Wave"); assert.equal(c.length, 1); assert.equal(c.loop, true); assert.equal(c.priority, "Action");
  assert.deepEqual(c.keyframes.map((k) => k.t), [0, 0.5, 1]);
  assert.ok(!("HumanoidRootPart" in c.keyframes[0].poses), "the HumanoidRootPart pose has no motor and is skipped");
  assert.deepEqual(Object.keys(c.keyframes[0].poses).sort(), ["LowerTorso", "RightUpperArm", "UpperTorso"]);
  assert.deepEqual(c.markers, [{ t: 0.5, name: "Sound", value: "whoosh" }, { t: 0.5, name: "Dip" }]);
  close(c.keyframes[1].poses.LowerTorso.p, [0, -0.3, 0]);
  assert.equal(c.keyframes[0].poses.RightUpperArm.p, undefined, "zero translation is left out");
});

test("easing enums map to Roblox's PoseEasingStyle / PoseEasingDirection, with the legacy Cubic direction quirk", () => {
  const c = load(wave);
  const dip = c.keyframes[1].poses.LowerTorso; // EasingStyle 3 (Cubic), EasingDirection 1 (Out)
  assert.equal(dip.ease, "Cubic");
  assert.equal(dip.dir, "In", "legacy Cubic plays reversed at runtime");
  assert.equal(load(wave, { cubicLegacy: "named" }).keyframes[1].poses.LowerTorso.dir, "Out");
  const v2 = load(sequence([keyframe(0, [pose("LowerTorso", { rot: I3, pos: [0, 0, 0] }, [], 5, 1)]), keyframe(1, [])]));
  assert.deepEqual([v2.keyframes[0].poses.LowerTorso.ease, v2.keyframes[0].poses.LowerTorso.dir], ["Cubic", "Out"]);
  const lin = c.keyframes[0].poses.RightUpperArm; assert.deepEqual([lin.ease, lin.dir], ["Linear", "In"]);
});

test("Pose.CFrame drives the joint like Motor6D.Transform: rotation and translation", () => {
  const rig = createRig(), an = new Animator(rig);
  const ref = createRig(); ref.setJoint("RightUpperArm", Math.PI / 2, 0, 0);
  an.play(load(wave), { fade: 0 });
  an.update(0.5); // halfway between 0 and PI, linear
  assert.ok(rig.bones.RightUpperArm.quaternion.angleTo(ref.bones.RightUpperArm.quaternion) < 1e-3);
  // the lower torso translation moves the whole upper body down by the Transform offset
  const y0 = createRig().jointPosition("UpperTorso").y;
  near(rig.jointPosition("UpperTorso").y, y0 - 0.3, 1e-3);
});

test("Pose.Weight scales how much a pose counts when blending", () => {
  const half = sequence([keyframe(0, [pose("LowerTorso", { rot: I3, pos: [0, 0, 0] }, [pose("UpperTorso", { rot: I3, pos: [0, 0, 0] }, [pose("RightUpperArm", { rot: rotX(1), pos: [0, 0, 0] }, [], 0, 0, 0.5)])])]), keyframe(1, [])]);
  const rig = createRig(), an = new Animator(rig);
  an.play(load(half), { fade: 0 }); an.update(0.01);
  const ref = createRig(); ref.setJoint("RightUpperArm", 0.5, 0, 0);
  assert.ok(rig.bones.RightUpperArm.quaternion.angleTo(ref.bones.RightUpperArm.quaternion) < 2e-3);
});

test("R6 poses are converted out of their rotated C0 joint frames", () => {
  // Right Shoulder C0 is turned so that a Transform about its Z axis swings the arm forward/up
  const zRot = (a) => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
  const ks = sequence([keyframe(0, [pose("Torso", { rot: I3, pos: [0, 0, 0] }, [pose("Right Arm", { rot: zRot(Math.PI / 2), pos: [0, 0, 0] })])]), keyframe(1, [])]);
  const c = load(ks, { rigType: "R6" });
  const rig = createRig({ rigType: "R6" }), an = new Animator(rig);
  an.play(c, { fade: 0 }); an.update(0.01);
  rig.object.updateMatrixWorld(true);
  const arm = new THREE.Box3().setFromObject(rig.parts["Right Arm"]).getCenter(new THREE.Vector3());
  const shoulder = rig.jointPosition("Right Arm");
  // in Roblox, +90° about the Right Shoulder's Z raises the arm forward to horizontal
  // the R6 shoulder pivot is 0.5 above the arm's centre, so the centre swings up level with it and 0.5 forward
  // (character forward is -Z, which is +Z in world after the stage turn)
  near(arm.y, shoulder.y, 0.05);
  near(arm.z - shoulder.z, 0.5, 0.05);
});

test("errors: no KeyframeSequence", () => {
  assert.throws(() => keyframeSequenceToClip(parseRbxm(writeRbxm([{ className: "Folder", props: { Name: [S, "x"] } }]))), /KeyframeSequence/);
});
