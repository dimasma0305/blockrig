import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { decodeFloatCurve, decodeRotationCurve, decodeMarkerCurve, evalFloatCurve, evalRotationCurve, curveAnimationToClip, keyframeSequenceToClip, parseRbxm, parseRbxmx, createRig, Animator } from "../src/index.js";
import { writeRbxm } from "./helpers/rbxm-writer.js";
import { encodeFloatCurve, encodeRotationCurve, encodeMarkerCurve } from "./helpers/curves.js";

const near = (a, b, eps = 1e-5) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const S = 0x01, B = 0x02, E = 0x12;

test("curve blobs: values then times (2400 ticks per second)", () => {
  const f = decodeFloatCurve(encodeFloatCurve([{ t: 0, value: 1, interpolation: "Constant" }, { t: 0.5, value: 2, interpolation: "Cubic", leftTangent: -1, rightTangent: 3 }, { t: 1.25, value: -4 }]));
  assert.deepEqual(f.map((k) => k.t), [0, 0.5, 1.25]);
  assert.deepEqual(f.map((k) => k.interpolation), ["Constant", "Cubic", "Linear"]);
  near(f[1].value, 2); near(f[1].leftTangent, -1); near(f[1].rightTangent, 3);
  const r = decodeRotationCurve(encodeRotationCurve([{ t: 0, q: [0, 0, 0, 1] }, { t: 1, q: [0, Math.SQRT1_2, 0, Math.SQRT1_2], interpolation: "Cubic" }]));
  assert.equal(r[1].interpolation, "Cubic", "stored as 12 + mode");
  near(r[1].q[1], Math.SQRT1_2);
  assert.deepEqual(decodeMarkerCurve(encodeMarkerCurve([{ t: 0.25, value: "left" }, { t: 0.75, value: "" }])), [{ value: "left", t: 0.25 }, { value: "", t: 0.75 }]);
  assert.deepEqual(decodeFloatCurve(new Uint8Array([2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0])), [], "an empty curve");
});

test("curve evaluation: Constant holds, Linear lerps, Cubic is Hermite with the key tangents", () => {
  const k = decodeFloatCurve(encodeFloatCurve([
    { t: 0, value: 0, interpolation: "Constant" }, { t: 1, value: 1, interpolation: "Linear" }, { t: 2, value: 3, interpolation: "Cubic", rightTangent: 0 }, { t: 4, value: 5, leftTangent: 0 },
  ]));
  near(evalFloatCurve(k, 0.99), 0); near(evalFloatCurve(k, 1.5), 2);
  near(evalFloatCurve(k, 3), 4, 1e-6, "flat tangents: Hermite midpoint is the average");
  near(evalFloatCurve(k, 2.5), 3 + 2 * (3 * 0.0625 - 2 * 0.015625)); // h01(0.25) = 3s^2 - 2s^3
  near(evalFloatCurve(k, -1), 0); near(evalFloatCurve(k, 9), 5);
  const steep = decodeFloatCurve(encodeFloatCurve([{ t: 0, value: 0, interpolation: "Cubic", rightTangent: 4 }, { t: 1, value: 0, leftTangent: 0 }]));
  assert.ok(evalFloatCurve(steep, 0.25) > 0.3, "a positive outgoing tangent lifts the curve");
  const r = decodeRotationCurve(encodeRotationCurve([{ t: 0, q: [0, 0, 0, 1] }, { t: 2, q: [0, Math.SQRT1_2, 0, Math.SQRT1_2] }]));
  near(evalRotationCurve(r, 1).angleTo(new THREE.Quaternion()), Math.PI / 4, 1e-5);
});

// a CurveAnimation like Studio's: joint folders following the rig, Position/Rotation curves, markers, face curves
function curveAnimation({ order = 0, rotation = "euler" } = {}) {
  const fc = (name, keys) => ({ className: "FloatCurve", props: { Name: [S, name], ValuesAndTimes: [S, encodeFloatCurve(keys)] } });
  const lin = (a, b) => [{ t: 0, value: a }, { t: 1, value: b }];
  const rot = rotation === "euler"
    ? { className: "EulerRotationCurve", props: { Name: [S, "Rotation"], RotationOrder: [E, order] }, children: [fc("X", lin(0, 1.2)), fc("Y", lin(0, 0.3)), fc("Z", lin(0, 0))] }
    : { className: "RotationCurve", props: { Name: [S, "Rotation"], ValuesAndTimes: [S, encodeRotationCurve([{ t: 0, q: [0, 0, 0, 1] }, { t: 1, q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.2).toArray() }])] } };
  const folder = (name, children) => ({ className: "Folder", props: { Name: [S, name] }, children });
  return { className: "CurveAnimation", props: { Name: [S, "Wave"], Loop: [B, false], Priority: [E, 2] }, children: [
    folder("HumanoidRootPart", [
      { className: "Vector3Curve", props: { Name: [S, "Position"] }, children: [fc("X", lin(0, 0)), fc("Y", lin(0, 0.5)), fc("Z", lin(0, 0))] },
      folder("LowerTorso", [folder("UpperTorso", [
        folder("RightUpperArm", [rot]),
        folder("Head", [folder("FaceControls", [fc("JawDrop", lin(0, 1))])]),
      ])]),
    ]),
    { className: "MarkerCurve", props: { Name: [S, "Footstep"], ValuesAndTimes: [S, encodeMarkerCurve([{ t: 0.5, value: "right" }])] } },
  ] };
}

test("curveAnimationToClip: joints, root motion, markers, face controls, Loop and Priority", () => {
  const clip = curveAnimationToClip(parseRbxm(writeRbxm([curveAnimation()])), { fps: 10 });
  assert.equal(clip.name, "Wave"); assert.equal(clip.loop, false); assert.equal(clip.priority, "Action");
  near(clip.length, 1);
  assert.equal(clip.keyframes.length, 11, "sampled at 10 fps plus key times");
  assert.deepEqual(clip.markers, [{ t: 0.5, name: "Footstep", value: "right", kind: "marker" }]);
  const mid = clip.keyframes[5]; near(mid.t, 0.5);
  const want = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0.15, 0, "XYZ"));
  assert.ok(new THREE.Quaternion().fromArray(mid.poses.RightUpperArm.q).angleTo(want) < 1e-5, "Euler XYZ, like CFrame.fromEulerAngles(.., XYZ)");
  near(mid.poses.HumanoidRootPart.p[1], 0.25);
  near(mid.faces.JawDrop.v, 0.5);
  assert.equal(mid.poses.LowerTorso, undefined, "folders without curves add no poses");
  // RotationOrder is honoured
  const yxz = curveAnimationToClip(parseRbxm(writeRbxm([curveAnimation({ order: 3 })])), { fps: 10 }).keyframes[5];
  assert.ok(new THREE.Quaternion().fromArray(yxz.poses.RightUpperArm.q).angleTo(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0.15, 0, "YXZ"))) < 1e-5);
  // RotationCurve (quaternion keys) works too, and keyframeSequenceToClip hands CurveAnimations on
  const q = keyframeSequenceToClip(parseRbxm(writeRbxm([curveAnimation({ rotation: "quat" })])), { fps: 10 }).keyframes[5];
  near(new THREE.Quaternion().fromArray(q.poses.RightUpperArm.q).angleTo(new THREE.Quaternion()), 0.6, 1e-5);
});

test("an imported CurveAnimation plays on the Animator", () => {
  const clip = curveAnimationToClip(parseRbxm(writeRbxm([curveAnimation()])));
  const rig = createRig({ body: false }), an = new Animator(rig), probe = createRig({ body: false }), seen = [];
  const tr = an.play(clip, { fade: 0 }); tr.getMarkerReachedSignal("Footstep").connect((v) => seen.push(v));
  an.update(0.75);
  probe.setJointQuat("RightUpperArm", new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, 0.225, 0, "XYZ")));
  assert.ok(rig.bones.RightUpperArm.quaternion.angleTo(probe.bones.RightUpperArm.quaternion) < 1e-3);
  assert.deepEqual(seen, ["right"]);
  near(rig.faceControls.JawDrop, 0.75, 1e-3);
});

test("binary strings: raw bytes from .rbxm, base64 from .rbxmx", () => {
  const bytes = encodeFloatCurve([{ t: 0, value: 1 }, { t: 1, value: 2 }]);
  const fromBin = parseRbxm(writeRbxm([{ className: "FloatCurve", props: { Name: [S, "X"], ValuesAndTimes: [S, bytes] } }]))[0];
  assert.ok(fromBin.props.ValuesAndTimes instanceof Uint8Array, "not valid UTF-8, so kept as bytes");
  assert.deepEqual([...fromBin.props.ValuesAndTimes], [...bytes]);
  const xml = `<roblox version="4"><Item class="FloatCurve" referent="R1"><Properties><string name="Name">X</string><BinaryString name="ValuesAndTimes">${Buffer.from(bytes).toString("base64")}</BinaryString></Properties></Item></roblox>`;
  const fromXml = parseRbxmx(xml)[0];
  assert.deepEqual(decodeFloatCurve(fromXml.props.ValuesAndTimes).map((k) => k.value), [1, 2]);
});

// Real data: a CurveAnimation built in Roblox Studio 0.748 (our own keys, test/fixtures/studio-curves.lua), saved
// to file, and the values Studio itself evaluated from those curves.
import fs from "node:fs";
test("Roblox Studio curves: the blobs decode, and evaluate to what Studio returns", () => {
  const fx = JSON.parse(fs.readFileSync(new URL("./fixtures/studio-curves.json", import.meta.url), "utf8"));
  const blob = (path) => new Uint8Array(Buffer.from(fx.curves.find((c) => c.path === path).valuesAndTimes, "base64"));
  for (const [path, vals] of Object.entries(fx.expected.float)) {
    const keys = decodeFloatCurve(blob(path));
    for (const [t, v] of Object.entries(vals)) near(evalFloatCurve(keys, +t), v, 2e-6);
  }
  for (const [path, vals] of Object.entries(fx.expected.rotation)) {
    const keys = decodeRotationCurve(blob(path));
    for (const [t, [x, y, z, a]] of Object.entries(vals)) assert.ok(evalRotationCurve(keys, +t).angleTo(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z).normalize(), a)) < 1e-4, `rotation at ${t}`);
  }
  // explicit tangents, the Constant mode, the 1/3 s key (800 ticks) and the marker strings come back as written
  const x = decodeFloatCurve(blob("HumanoidRootPart/LowerTorso/UpperTorso/RightUpperArm/Rotation/X"));
  assert.deepEqual(x.map((k) => k.interpolation), ["Linear", "Cubic", "Constant", "Linear"]);
  near(x[1].leftTangent, 0.5); near(x[1].rightTangent, -2); assert.equal(x[1].tangentMode, 3);
  near(decodeFloatCurve(blob("HumanoidRootPart/LowerTorso/UpperTorso/RightUpperArm/Rotation/Y"))[1].t, 1 / 3, 1e-9);
  assert.deepEqual(decodeMarkerCurve(blob("Footstep")).map((m) => [m.t, m.value]), fx.expected.markers.map((m) => [m.t, m.value]));
  // the Euler curve's YXZ order: Studio's YXZ readback is the channel values, so the clip's rotation is Ry * Rx * Rz
  const ex = decodeFloatCurve(blob("HumanoidRootPart/LowerTorso/UpperTorso/RightUpperArm/Rotation/X")), ey = decodeFloatCurve(blob("HumanoidRootPart/LowerTorso/UpperTorso/RightUpperArm/Rotation/Y"));
  for (const [t, [ax, ay]] of Object.entries(fx.expected.eulerYXZ["HumanoidRootPart/LowerTorso/UpperTorso/RightUpperArm/Rotation"])) { near(evalFloatCurve(ex, +t), ax, 1e-4); near(evalFloatCurve(ey, +t), ay, 1e-4); }
  assert.equal(fx.curves.find((c) => c.className === "EulerRotationCurve").props.RotationOrder, 3, "YXZ");
});
