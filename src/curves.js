// Import Roblox CurveAnimations: per-channel curves instead of keyframes.
//
// Structure (create.roblox.com/docs/reference/engine/classes/CurveAnimation): curves are stored in folders that
// follow the rig's joint hierarchy, like a KeyframeSequence's Poses:
//   CurveAnimation { Loop, Priority }
//     Folder "HumanoidRootPart"
//       Folder "LowerTorso"
//         Vector3Curve "Position"          { FloatCurve X, Y, Z }        -- Motor6D Transform translation
//         EulerRotationCurve "Rotation"    { FloatCurve X, Y, Z; RotationOrder }  (or a RotationCurve "Rotation")
//         Folder "UpperTorso" ...
//     ... Folder "FaceControls" { FloatCurve "JawDrop", ... }   -- dynamic heads
//     MarkerCurve "<marker name>"                                -- GetMarkerReachedSignal(name), value per marker
//
// The keys live in each curve's ValuesAndTimes BinaryString. Its layout here follows the community description
// in rbx-dom (rojo-rbx/rbx-dom#657, not merged yet): a values section [u32 version, u32 count, keys...] then a
// times section [u32 1, u32 count, i32 ticks...] with 2400 ticks per second, little-endian. Keys:
//   FloatCurve    u8 interpolation, u8 tangent mode, f32 value, f32 left tangent, f32 right tangent
//   RotationCurve u8 interpolation + 12, f32 qx, qy, qz, qw, f32 left tangent, f32 right tangent
//   MarkerCurve   NUL-terminated string
// KeyInterpolationMode: 0 Constant, 1 Linear, 2 Cubic. Not yet checked against a CurveAnimation file from Studio.
import * as THREE from "three";
import { findInstance } from "./rbxm.js";
import { ANIMATION_PRIORITY, R6_C0_ROTATIONS } from "./keyframes.js";

export const TICKS_PER_SECOND = 2400;
export const KEY_INTERPOLATION = { 0: "Constant", 1: "Linear", 2: "Cubic" };
/** Enum.RotationOrder -> three.js Euler order (CFrame.fromEulerAngles(x, y, z, order) builds the same matrix). */
export const ROTATION_ORDER = { 0: "XYZ", 1: "XZY", 2: "YZX", 3: "YXZ", 4: "ZXY", 5: "ZYX" };

const asBytes = (v) => (v instanceof Uint8Array ? v : typeof v === "string" ? new TextEncoder().encode(v) : new Uint8Array(0));

function sections(bytes, perKey) {
  const b = asBytes(bytes); if (b.length < 16) return [];
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = 4; const n = dv.getUint32(o, true); o += 4;
  const keys = [];
  for (let i = 0; i < n; i++) { const [k, len] = perKey(dv, b, o); keys.push(k); o += len; }
  o += 4; const nt = dv.getUint32(o, true); o += 4;
  if (nt !== n) throw new Error(`blockrig: curve has ${n} values but ${nt} times`);
  for (let i = 0; i < n; i++) { keys[i].t = dv.getInt32(o, true) / TICKS_PER_SECOND; o += 4; }
  return keys;
}

/** FloatCurve.ValuesAndTimes -> [{ t, value, interpolation, leftTangent, rightTangent }] */
export function decodeFloatCurve(bytes) {
  return sections(bytes, (dv, b, o) => [{ interpolation: KEY_INTERPOLATION[dv.getUint8(o)] || "Linear", tangentMode: dv.getUint8(o + 1), value: dv.getFloat32(o + 2, true), leftTangent: dv.getFloat32(o + 6, true), rightTangent: dv.getFloat32(o + 10, true) }, 14]);
}
/** RotationCurve.ValuesAndTimes -> [{ t, q: [x, y, z, w], interpolation, leftTangent, rightTangent }] */
export function decodeRotationCurve(bytes) {
  return sections(bytes, (dv, b, o) => [{ interpolation: KEY_INTERPOLATION[dv.getUint8(o) - 12] || "Linear", q: [dv.getFloat32(o + 1, true), dv.getFloat32(o + 5, true), dv.getFloat32(o + 9, true), dv.getFloat32(o + 13, true)], leftTangent: dv.getFloat32(o + 17, true), rightTangent: dv.getFloat32(o + 21, true) }, 25]);
}
/** MarkerCurve.ValuesAndTimes -> [{ t, value }] */
export function decodeMarkerCurve(bytes) {
  return sections(bytes, (dv, b, o) => { let e = o; while (e < b.length && b[e] !== 0) e++; return [{ value: new TextDecoder().decode(b.subarray(o, e)) }, e - o + 1]; });
}

// the key segment around time t: [a, b, s] with s in 0..1 (b === a outside the curve)
function segment(keys, t) {
  if (t <= keys[0].t) return [keys[0], keys[0], 0];
  const last = keys[keys.length - 1]; if (t >= last.t) return [last, last, 0];
  let i = 0; while (keys[i + 1].t < t) i++;
  const a = keys[i], b = keys[i + 1]; return [a, b, (t - a.t) / (b.t - a.t || 1)];
}
/**
 * Value of a FloatCurve at time t. The segment's interpolation is the left key's; Cubic is a Hermite curve
 * through the keys with the left key's right tangent and the right key's left tangent (slopes per second).
 */
export function evalFloatCurve(keys, t) {
  if (!keys.length) return 0;
  const [a, b, s] = segment(keys, t);
  if (a === b || a.interpolation === "Constant") return a.value;
  if (a.interpolation === "Linear") return a.value + (b.value - a.value) * s;
  const dt = b.t - a.t, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * a.value + (s3 - 2 * s2 + s) * dt * a.rightTangent + (-2 * s3 + 3 * s2) * b.value + (s3 - s2) * dt * b.leftTangent;
}
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
/** Rotation of a RotationCurve at time t (slerp; Cubic eases the slerp with the keys' tangents). */
export function evalRotationCurve(keys, t, out = new THREE.Quaternion()) {
  if (!keys.length) return out.identity();
  const [a, b, s] = segment(keys, t);
  qa.fromArray(a.q).normalize();
  if (a === b || a.interpolation === "Constant") return out.copy(qa);
  qb.fromArray(b.q).normalize();
  let f = s;
  if (a.interpolation === "Cubic") { const s2 = s * s, s3 = s2 * s; f = (s3 - 2 * s2 + s) * a.rightTangent + (-2 * s3 + 3 * s2) + (s3 - s2) * b.leftTangent; }
  return out.copy(qa).slerp(qb, f);
}

const curveKeys = (inst, decode) => (inst && inst.props.ValuesAndTimes != null ? decode(inst.props.ValuesAndTimes) : []);
const child = (inst, name, cls) => inst.children.find((c) => c.props.Name === name && (!cls || c.className === cls));

/**
 * Convert a CurveAnimation into a clip for BlockRig.Animator. Curves are sampled at `fps` (default 60) into
 * linear keyframes, plus every key time, so cubic curves keep their shape.
 * @param {object[]} roots instances from parseRbxm()
 * @param {{ rigType?: "R15"|"R6", name?: string, fps?: number }} [o]
 */
export function curveAnimationToClip(roots, o = {}) {
  const ca = findInstance(roots, (x) => x.className === "CurveAnimation");
  if (!ca) throw new Error("blockrig: no CurveAnimation in this model");
  const rigType = (o.rigType || "R15").toUpperCase(), fps = o.fps || 60;
  const joints = {}, faces = {}, markers = [], times = new Set([0]);
  const addTimes = (keys) => keys.forEach((k) => times.add(k.t));
  const walk = (node) => {
    for (const c of node.children) {
      if (c.className === "MarkerCurve") { for (const k of curveKeys(c, decodeMarkerCurve)) markers.push({ t: k.t, name: c.props.Name, value: k.value, kind: "marker" }); continue; }
      if (c.className !== "Folder") continue;
      const name = c.props.Name;
      if (name === "FaceControls") {
        for (const f of c.children) if (f.className === "FloatCurve") { const k = curveKeys(f, decodeFloatCurve); if (k.length) { faces[f.props.Name] = k; addTimes(k); } }
        continue;
      }
      const j = {}, pos = child(c, "Position", "Vector3Curve"), rot = child(c, "Rotation");
      if (pos) { j.pos = ["X", "Y", "Z"].map((a) => curveKeys(child(pos, a, "FloatCurve"), decodeFloatCurve)); j.pos.forEach(addTimes); }
      if (rot && rot.className === "EulerRotationCurve") {
        j.euler = ["X", "Y", "Z"].map((a) => curveKeys(child(rot, a, "FloatCurve"), decodeFloatCurve)); j.euler.forEach(addTimes);
        j.order = ROTATION_ORDER[rot.props.RotationOrder ?? 0] || "XYZ";
      } else if (rot && rot.className === "RotationCurve") { j.quat = curveKeys(rot, decodeRotationCurve); addTimes(j.quat); }
      if (name !== "HumanoidRootPart" && (j.pos || j.euler || j.quat)) joints[name] = j;
      else if (name === "HumanoidRootPart" && j.pos) joints[name] = j;
      walk(c);
    }
  };
  walk(ca);
  markers.forEach((m) => times.add(m.t));
  const length = Math.max(0, ...times);
  for (let t = 0; t < length; t += 1 / fps) times.add(Math.round(t * TICKS_PER_SECOND) / TICKS_PER_SECOND);
  const sorted = [...times].sort((a, b) => a - b);
  const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), qC0 = new THREE.Quaternion(), qC0i = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  const has = (list) => list && list.some((k) => k.length);
  const keyframes = sorted.map((t) => {
    const poses = {};
    for (const [name, j] of Object.entries(joints)) {
      const pose = { ease: "Linear", dir: "In" };
      if (j.quat && j.quat.length) evalRotationCurve(j.quat, t, q);
      else if (has(j.euler)) q.setFromEuler(e.set(evalFloatCurve(j.euler[0], t), evalFloatCurve(j.euler[1], t), evalFloatCurve(j.euler[2], t), j.order));
      else q.identity();
      v.set(0, 0, 0); if (has(j.pos)) v.set(evalFloatCurve(j.pos[0], t), evalFloatCurve(j.pos[1], t), evalFloatCurve(j.pos[2], t));
      const c0 = rigType === "R6" && R6_C0_ROTATIONS[name];
      if (c0) { qC0.setFromRotationMatrix(m4.set(c0[0], c0[1], c0[2], 0, c0[3], c0[4], c0[5], 0, c0[6], c0[7], c0[8], 0, 0, 0, 0, 1)); qC0i.copy(qC0).invert(); q.premultiply(qC0).multiply(qC0i); v.applyQuaternion(qC0); }
      if (name !== "HumanoidRootPart" && (j.quat || j.euler)) pose.q = q.toArray();
      if (v.lengthSq() > 1e-12 || (name === "HumanoidRootPart" && has(j.pos))) pose.p = v.toArray();
      if (pose.q || pose.p) poses[name] = pose;
    }
    const kf = { t, poses };
    const fv = {}; for (const [n, k] of Object.entries(faces)) fv[n] = { v: evalFloatCurve(k, t), ease: "Linear", dir: "In" };
    if (Object.keys(fv).length) kf.faces = fv;
    return kf;
  });
  return {
    name: o.name || ca.props.Name || "Animation",
    length, loop: ca.props.Loop ?? true,
    priority: ANIMATION_PRIORITY[ca.props.Priority ?? 1000] || "Core",
    keyframes, markers: markers.sort((a, b) => a.t - b.t),
  };
}
