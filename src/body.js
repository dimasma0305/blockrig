// Body definitions: the classic R6 rig and R15 rigs in several shapes, with Roblox-style
// height / width / depth / head scaling. A body is a bind skeleton plus the blocky parts that hang on it.
//
// All positions are character space in studs: Y up, the character faces -Z.
// R15 bind poses follow the clothing-skeleton convention (torso bones turned 180° about Y, limb bones
// 180° about X), so layered clothing made for R15 binds to them directly.
import { ROT_X180, ROT_Y180 } from "./cframe.js";

const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/**
 * R15 shapes. Widths are in studs before scaling; `limbs` and `torso` stretch lengths.
 * `classic` reproduces the standard blocky R15 body exactly; the others are BlockRig's own proportions.
 */
export const R15_SHAPES = {
  classic: { top: 2, waist: 2, depth: 1, arm: 1, leg: 1, legX: 0.5, limbs: 1, torso: 1 },
  slender: { top: 1.62, waist: 1.3, depth: 0.86, arm: 0.76, leg: 0.72, legX: 0.4, limbs: 1, torso: 1 },
  buff: { top: 2.6, waist: 2.05, depth: 1.2, arm: 1.25, leg: 1.15, legX: 0.58, limbs: 1, torso: 1.06 },
  tall: { top: 1.8, waist: 1.55, depth: 0.9, arm: 0.85, leg: 0.85, legX: 0.45, limbs: 1.32, torso: 1.16 },
  child: { top: 1.9, waist: 1.9, depth: 0.95, arm: 0.9, leg: 0.95, legX: 0.48, limbs: 0.7, torso: 0.78 },
};

// classic R15 segment lengths (studs) measured from the standard clothing skeleton
const SEG = { foot: 0.3, lowerLeg: 0.926, upperLeg: 0.822, lowerTorso: 0.4, upperTorso: 1.6, shoulderDrop: 0.237, upperArm: 0.728, lowerArm: 0.76, hand: 0.3, root: 1.0 };
const FLOOR = -2.232; // feet of the classic body, relative to the skinning origin

/**
 * @typedef {{ name: string, parent: string|null, pos: number[], rot: number[] }} BindBone
 * @typedef {{ bone: string, size: number[], center: number[], kind: "shirt"|"pants"|"skin"|"shoes", taper?: number }} BodyPart
 * @typedef {{ rigType: "R15"|"R6", bind: BindBone[], parts: BodyPart[], floor: number, neck: { parent: string, pos: number[] }, headScale: number }} Body
 */

/**
 * Build a body definition.
 * @param {{ rigType?: "R15"|"R6", shape?: keyof R15_SHAPES | object,
 *           scale?: { height?: number, width?: number, depth?: number, head?: number } }} [o]
 * @returns {Body}
 */
export function buildBody(o = {}) {
  const rigType = (o.rigType || "R15").toUpperCase();
  const s = Object.assign({ height: 1, width: 1, depth: 1, head: 1 }, o.scale);
  for (const k of ["height", "width", "depth", "head"]) if (!(s[k] > 0)) throw new RangeError(`blockrig: scale.${k} must be > 0`);
  const body = rigType === "R6" ? r6() : r15(typeof o.shape === "object" ? Object.assign({}, R15_SHAPES.classic, o.shape) : R15_SHAPES[o.shape || "classic"]);
  if (!body) throw new Error(`blockrig: unknown shape "${o.shape}" (try ${Object.keys(R15_SHAPES).join(", ")})`);
  return applyScale(body, s);
}

function r15(sh) {
  if (!sh) return null;
  const L = sh.limbs, T = sh.torso;
  const ankle = FLOOR + SEG.foot * L, knee = ankle + SEG.lowerLeg * L, hip = knee + SEG.upperLeg * L;
  const waist = hip + SEG.lowerTorso * T, neckY = waist + SEG.upperTorso * T;
  const shoulder = neckY - SEG.shoulderDrop * T, elbow = shoulder - SEG.upperArm * L, wrist = elbow - SEG.lowerArm * L;
  const sx = sh.top / 2, ax = sh.top / 2 + sh.arm / 2, lx = sh.legX;
  const bind = [
    { name: "HumanoidRootPart", parent: null, pos: [0, hip + SEG.root * T, 0], rot: ROT_Y180 },
    { name: "LowerTorso", parent: "HumanoidRootPart", pos: [0, hip, 0], rot: ROT_Y180 },
    { name: "UpperTorso", parent: "LowerTorso", pos: [0, waist, 0], rot: ROT_Y180 },
    { name: "LeftUpperArm", parent: "UpperTorso", pos: [-sx, shoulder, 0], rot: ROT_X180 },
    { name: "LeftLowerArm", parent: "LeftUpperArm", pos: [-ax, elbow, 0], rot: ROT_X180 },
    { name: "LeftHand", parent: "LeftLowerArm", pos: [-ax, wrist, 0], rot: ROT_X180 },
    { name: "RightUpperArm", parent: "UpperTorso", pos: [sx, shoulder, 0], rot: ROT_X180 },
    { name: "RightLowerArm", parent: "RightUpperArm", pos: [ax, elbow, 0], rot: ROT_X180 },
    { name: "RightHand", parent: "RightLowerArm", pos: [ax, wrist, 0], rot: ROT_X180 },
    { name: "LeftUpperLeg", parent: "LowerTorso", pos: [-lx, hip, 0], rot: ROT_X180 },
    { name: "LeftLowerLeg", parent: "LeftUpperLeg", pos: [-lx, knee, 0], rot: ROT_X180 },
    { name: "LeftFoot", parent: "LeftLowerLeg", pos: [-lx, ankle, 0], rot: ROT_X180 },
    { name: "RightUpperLeg", parent: "LowerTorso", pos: [lx, hip, 0], rot: ROT_X180 },
    { name: "RightLowerLeg", parent: "RightUpperLeg", pos: [lx, knee, 0], rot: ROT_X180 },
    { name: "RightFoot", parent: "RightLowerLeg", pos: [lx, ankle, 0], rot: ROT_X180 },
  ];
  const d = sh.depth, parts = [
    { bone: "LowerTorso", size: [sh.waist, waist - hip, d], center: [0, (waist + hip) / 2, 0], kind: "shirt" },
    { bone: "UpperTorso", size: [sh.top, neckY - waist, d], center: [0, (neckY + waist) / 2, 0], kind: "shirt", taper: sh.waist / sh.top },
  ];
  for (const side of ["Left", "Right"]) {
    const k = side === "Left" ? -1 : 1, x = k * ax, xl = k * lx;
    parts.push(
      { bone: side + "UpperArm", size: [sh.arm, neckY - elbow, sh.arm], center: [x, (neckY + elbow) / 2, 0], kind: "shirt" },
      { bone: side + "LowerArm", size: [sh.arm * 0.98, elbow - wrist, sh.arm * 0.98], center: [x, (elbow + wrist) / 2, 0], kind: "shirt" },
      { bone: side + "Hand", size: [sh.arm * 0.98, SEG.hand * L, sh.arm * 0.98], center: [x, wrist - (SEG.hand * L) / 2, 0], kind: "skin" },
      { bone: side + "UpperLeg", size: [sh.leg, hip - knee, sh.leg], center: [xl, (hip + knee) / 2, 0], kind: "pants" },
      { bone: side + "LowerLeg", size: [sh.leg * 0.98, knee - ankle, sh.leg * 0.98], center: [xl, (knee + ankle) / 2, 0], kind: "pants" },
      { bone: side + "Foot", size: [sh.leg, ankle - FLOOR, sh.leg], center: [xl, (ankle + FLOOR) / 2, 0], kind: "shoes" },
    );
  }
  return { rigType: "R15", bind, parts, floor: FLOOR, neck: { parent: "UpperTorso", pos: [0, neckY, 0] }, headScale: 1 };
}

// Classic R6: six parts. Joint pivots follow the classic rig: shoulders at the top inner edge of each arm,
// hips at the top *outer* corner of each leg (which is why R6 legs swing slightly outward).
function r6() {
  const bind = [
    { name: "HumanoidRootPart", parent: null, pos: [0, 3, 0], rot: I3 },
    { name: "Torso", parent: "HumanoidRootPart", pos: [0, 3, 0], rot: I3 },
    { name: "Left Arm", parent: "Torso", pos: [-1, 3.5, 0], rot: I3 },
    { name: "Right Arm", parent: "Torso", pos: [1, 3.5, 0], rot: I3 },
    { name: "Left Leg", parent: "Torso", pos: [-1, 2, 0], rot: I3 },
    { name: "Right Leg", parent: "Torso", pos: [1, 2, 0], rot: I3 },
  ];
  const parts = [
    { bone: "Torso", size: [2, 2, 1], center: [0, 3, 0], kind: "shirt" },
    { bone: "Left Arm", size: [1, 2, 1], center: [-1.5, 3, 0], kind: "shirt", hand: 0.3 },
    { bone: "Right Arm", size: [1, 2, 1], center: [1.5, 3, 0], kind: "shirt", hand: 0.3 },
    { bone: "Left Leg", size: [1, 2, 1], center: [-0.5, 1, 0], kind: "pants", shoe: 0.3 },
    { bone: "Right Leg", size: [1, 2, 1], center: [0.5, 1, 0], kind: "pants", shoe: 0.3 },
  ];
  return { rigType: "R6", bind, parts, floor: 0, neck: { parent: "Torso", pos: [0, 4, 0] }, headScale: 1 };
}

function applyScale(b, s) {
  const f = b.floor, P = ([x, y, z]) => [x * s.width, (y - f) * s.height + f, z * s.depth];
  return {
    ...b,
    bind: b.bind.map((x) => ({ ...x, pos: P(x.pos) })),
    parts: b.parts.map((p) => ({ ...p, size: [p.size[0] * s.width, p.size[1] * s.height, p.size[2] * s.depth], center: P(p.center), hand: p.hand && p.hand * s.height, shoe: p.shoe && p.shoe * s.height })),
    neck: { ...b.neck, pos: P(b.neck.pos) },
    headScale: s.head,
    scale: s,
  };
}

/** Joint names a body exposes to poses and clips (bones plus "Neck"). */
export const jointsOf = (body) => body.bind.map((b) => b.name).concat("Neck");
