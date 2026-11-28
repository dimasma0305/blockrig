// Story clips as BlockRig keyframe clips (original). Axes are the character's own: arms/legs +X swing forward,
// knee bend = -X, elbow bend = +X, RightUpperArm +Z / LeftUpperArm -Z out to the side, torso -X leans forward,
// Neck +X looks up. Add a clip here for every new action a shot needs, and check it in the PoseLab composition.
import { clips as base } from "blockrig";

const k = (t: number, poses: Record<string, any>, ease = "Cubic", dir = "InOut") => {
  const o: Record<string, any> = {};
  for (const j in poses) o[j] = Array.isArray(poses[j]) ? { r: poses[j], ease, dir } : { ease, dir, ...poses[j] };
  return { t, poses: o };
};
const hold = (name: string, poses: Record<string, any>, priority = "Action") => ({ name, priority, loop: true, length: 1, keyframes: [k(0, poses), k(1, poses)] });
const loop = (name: string, length: number, frames: [number, Record<string, any>][], priority = "Action") => ({ name, priority, loop: true, length, keyframes: frames.map(([t, p]) => k(t, p)) });

export const idle = base.idle;
export const run = base.run;
export const victory = base.victory;

export const walk = {
  name: "walk", priority: "Movement", loop: true, length: 0.9,
  keyframes: [0, 0.25, 0.5, 0.75, 1].map((t, i) => {
    const s = [1, 0, -1, 0, 1][i], up = [0, 0.12, 0, 0.12, 0][i];
    return k(t * 0.9, {
      LeftUpperLeg: [0.55 * s, 0, 0], RightUpperLeg: [-0.55 * s, 0, 0], LeftLowerLeg: [s < 0 ? -0.6 : -0.15, 0, 0], RightLowerLeg: [s > 0 ? -0.6 : -0.15, 0, 0],
      LeftUpperArm: [-0.45 * s, 0, -0.08], RightUpperArm: [0.45 * s, 0, 0.08], LeftLowerArm: [0.35, 0, 0], RightLowerArm: [0.35, 0, 0],
      UpperTorso: [-0.04, 0.08 * s, 0], HumanoidRootPart: { p: [0, up, 0] },
    }, "Linear");
  }),
};
// weight shifting, a glance about; for crowds (offset each person's start time)
export const crowdIdle = loop("crowdIdle", 3.2, [
  [0, { UpperTorso: [0, 0.06, 0], Neck: [0.05, 0.25, 0], LeftUpperArm: [0.05, 0, -0.1], RightUpperArm: [0.05, 0, 0.1], HumanoidRootPart: { p: [0, 0, 0] } }],
  [1.6, { UpperTorso: [0, -0.06, 0.03], Neck: [0.12, -0.3, 0], LeftUpperArm: [0.1, 0, -0.12], RightUpperArm: [0.12, 0, 0.12], HumanoidRootPart: { p: [0, -0.04, 0] } }],
  [3.2, { UpperTorso: [0, 0.06, 0], Neck: [0.05, 0.25, 0], LeftUpperArm: [0.05, 0, -0.1], RightUpperArm: [0.05, 0, 0.1], HumanoidRootPart: { p: [0, 0, 0] } }],
], "Idle");
export const lookUp = hold("lookUp", { Neck: [0.7, 0, 0], UpperTorso: [0.18, 0, 0], LeftUpperArm: [0.1, 0, -0.3], RightUpperArm: [0.1, 0, 0.3] });
export const slump = hold("slump", { Neck: [-0.55, 0, 0], UpperTorso: [-0.3, 0, 0], LowerTorso: [-0.05, 0, 0], LeftUpperArm: [0.05, 0, -0.05], RightUpperArm: [0.05, 0, 0.05], LeftLowerArm: [0.1, 0, 0], RightLowerArm: [0.1, 0, 0], LeftUpperLeg: [0.1, 0, -0.05], RightUpperLeg: [0.05, 0, 0.05] });
export const smug = hold("smug", { LeftUpperArm: [0.15, 0, -0.75], RightUpperArm: [0.15, 0, 0.75], LeftLowerArm: [1.3, 0, 0.9], RightLowerArm: [1.3, 0, -0.9], UpperTorso: [0.1, 0.12, 0], Neck: [0.12, -0.15, 0.06], LeftUpperLeg: [0, 0, -0.12], RightUpperLeg: [0, 0, 0.12] });
// the pros: laptop raised in the right hand like a weapon, left hand bracing, a wide stance
export const aim = loop("aim", 0.6, [
  [0, { RightUpperArm: [1.45, 0, 0.15], RightLowerArm: [0.35, 0, 0], LeftUpperArm: [1.2, 0, -0.35], LeftLowerArm: [0.9, 0, 0.3], UpperTorso: [-0.08, 0.15, 0], Neck: [0.08, -0.1, 0], LeftUpperLeg: [0.25, 0, -0.18], RightUpperLeg: [-0.2, 0, 0.18], LeftLowerLeg: [-0.25, 0, 0] }],
  [0.3, { RightUpperArm: [1.55, 0, 0.12], RightLowerArm: [0.28, 0, 0], LeftUpperArm: [1.25, 0, -0.33], LeftLowerArm: [0.85, 0, 0.3], UpperTorso: [-0.1, 0.15, 0], Neck: [0.06, -0.1, 0], LeftUpperLeg: [0.25, 0, -0.18], RightUpperLeg: [-0.2, 0, 0.18], LeftLowerLeg: [-0.25, 0, 0] }],
  [0.6, { RightUpperArm: [1.45, 0, 0.15], RightLowerArm: [0.35, 0, 0], LeftUpperArm: [1.2, 0, -0.35], LeftLowerArm: [0.9, 0, 0.3], UpperTorso: [-0.08, 0.15, 0], Neck: [0.08, -0.1, 0], LeftUpperLeg: [0.25, 0, -0.18], RightUpperLeg: [-0.2, 0, 0.18], LeftLowerLeg: [-0.25, 0, 0] }],
]);
// hands working a keyboard in front of the chest (IK pins the hands; this keeps the elbows and head right)
export const type = loop("type", 0.4, [
  [0, { LeftUpperArm: [0.9, 0, -0.15], RightUpperArm: [0.95, 0, 0.15], LeftLowerArm: [0.8, 0, 0.2], RightLowerArm: [0.75, 0, -0.2], Neck: [-0.35, 0, 0], UpperTorso: [-0.12, 0, 0] }],
  [0.2, { LeftUpperArm: [0.95, 0, -0.15], RightUpperArm: [0.9, 0, 0.15], LeftLowerArm: [0.75, 0, 0.2], RightLowerArm: [0.8, 0, -0.2], Neck: [-0.33, 0.03, 0], UpperTorso: [-0.12, 0, 0] }],
  [0.4, { LeftUpperArm: [0.9, 0, -0.15], RightUpperArm: [0.95, 0, 0.15], LeftLowerArm: [0.8, 0, 0.2], RightLowerArm: [0.75, 0, -0.2], Neck: [-0.35, 0, 0], UpperTorso: [-0.12, 0, 0] }],
]);
export const cheer = loop("cheer", 0.5, [
  [0, { LeftUpperArm: [2.7, 0, -0.35], RightUpperArm: [2.7, 0, 0.35], LeftLowerArm: [0.3, 0, 0], RightLowerArm: [0.3, 0, 0], Neck: [0.25, 0, 0], HumanoidRootPart: { p: [0, 0, 0] } }],
  [0.25, { LeftUpperArm: [2.9, 0, -0.5], RightUpperArm: [2.9, 0, 0.5], LeftLowerArm: [0.1, 0, 0], RightLowerArm: [0.1, 0, 0], Neck: [0.35, 0, 0], HumanoidRootPart: { p: [0, 0.35, 0] } }],
  [0.5, { LeftUpperArm: [2.7, 0, -0.35], RightUpperArm: [2.7, 0, 0.35], LeftLowerArm: [0.3, 0, 0], RightLowerArm: [0.3, 0, 0], Neck: [0.25, 0, 0], HumanoidRootPart: { p: [0, 0, 0] } }],
]);
export const gasp = hold("gasp", { LeftUpperArm: [1.0, 0, -0.55], RightUpperArm: [1.0, 0, 0.55], LeftLowerArm: [1.6, 0, 0.4], RightLowerArm: [1.6, 0, -0.4], UpperTorso: [0.2, 0, 0], Neck: [0.25, 0, 0], LeftUpperLeg: [-0.15, 0, 0] });
export const handOver = {
  name: "handOver", priority: "Action", loop: false, length: 0.9,
  keyframes: [k(0, { RightUpperArm: [0.1, 0, 0.1] }), k(0.5, { RightUpperArm: [1.35, 0, 0.1], RightLowerArm: [0.2, 0, 0], RightHand: [-0.3, 0, 0], UpperTorso: [-0.12, 0, 0], Neck: [0.05, 0, 0] }, "Cubic", "Out"), k(0.9, { RightUpperArm: [1.35, 0, 0.1], RightLowerArm: [0.2, 0, 0], RightHand: [-0.3, 0, 0], UpperTorso: [-0.12, 0, 0], Neck: [0.05, 0, 0] })],
};
export const celebrate = {
  name: "celebrate", priority: "Action2", loop: false, length: 0.9,
  keyframes: [
    k(0, { LeftUpperLeg: [0.5, 0, 0], RightUpperLeg: [0.5, 0, 0], LeftLowerLeg: [-1.0, 0, 0], RightLowerLeg: [-1.0, 0, 0], UpperTorso: [-0.25, 0, 0], LeftUpperArm: [-0.3, 0, -0.2], RightUpperArm: [-0.3, 0, 0.2], HumanoidRootPart: { p: [0, -0.5, 0] } }, "Cubic", "Out"),
    k(0.4, { LeftUpperLeg: [0.3, 0, -0.1], RightUpperLeg: [-0.4, 0, 0.1], LeftLowerLeg: [-0.9, 0, 0], RightLowerLeg: [-0.3, 0, 0], UpperTorso: [0.15, 0, 0], LeftUpperArm: [2.8, 0, -0.4], RightUpperArm: [2.9, 0, 0.3], Neck: [0.35, 0, 0], HumanoidRootPart: { p: [0, 1.6, 0] } }, "Cubic", "In"),
    k(0.9, { UpperTorso: [0.1, 0, 0], LeftUpperArm: [2.7, 0, -0.4], RightUpperArm: [2.7, 0, 0.4], Neck: [0.25, 0, 0], HumanoidRootPart: { p: [0, 0, 0] } }, "Bounce", "Out"),
  ],
};

// ---- everyday story poses ----
export const armsCrossed = hold("armsCrossed", { LeftUpperArm: [0.55, 0, -0.25], RightUpperArm: [0.55, 0, 0.25], LeftLowerArm: [1.9, 0, 1.25], RightLowerArm: [1.9, 0, -1.25], Neck: [-0.05, 0, 0], UpperTorso: [0.06, 0, 0] });
export const point = hold("point", { RightUpperArm: [1.45, 0, 0.15], RightLowerArm: [0.1, 0, 0], UpperTorso: [-0.05, -0.15, 0], Neck: [0, -0.1, 0] });
export const shrug = hold("shrug", { LeftUpperArm: [0.2, 0, -0.45], RightUpperArm: [0.2, 0, 0.45], LeftLowerArm: [1.3, 0, 0.5], RightLowerArm: [1.3, 0, -0.5], Neck: [0, 0, 0.18], UpperTorso: [0, 0, 0] });
export const sit = hold("sit", { LeftUpperLeg: [1.5, 0, -0.05], RightUpperLeg: [1.5, 0, 0.05], LeftLowerLeg: [-1.5, 0, 0], RightLowerLeg: [-1.5, 0, 0], LeftUpperArm: [0.2, 0, -0.1], RightUpperArm: [0.2, 0, 0.1] });
export const panic = loop("panic", 0.5, [
  [0, { LeftUpperArm: [2.6, 0, -0.6], RightUpperArm: [2.6, 0, 0.6], LeftLowerArm: [0.6, 0, 0], RightLowerArm: [0.6, 0, 0], Neck: [0.2, 0.25, 0] }],
  [0.25, { LeftUpperArm: [2.4, 0, -0.8], RightUpperArm: [2.4, 0, 0.8], LeftLowerArm: [0.9, 0, 0], RightLowerArm: [0.9, 0, 0], Neck: [0.2, -0.25, 0] }],
  [0.5, { LeftUpperArm: [2.6, 0, -0.6], RightUpperArm: [2.6, 0, 0.6], LeftLowerArm: [0.6, 0, 0], RightLowerArm: [0.6, 0, 0], Neck: [0.2, 0.25, 0] }],
]);

// ---- this video ----
// sitting on the floor, legs out in front (the baby at the laptop); contacts: SEAT
export const floorSit = hold("floorSit", { LeftUpperLeg: [1.5, 0, -0.25], RightUpperLeg: [1.5, 0, 0.25], LeftLowerLeg: [-0.1, 0, 0], RightLowerLeg: [-0.1, 0, 0], LeftUpperArm: [0.8, 0, -0.15], RightUpperArm: [0.8, 0, 0.15], LeftLowerArm: [0.7, 0, 0], RightLowerArm: [0.7, 0, 0], Neck: [-0.25, 0, 0], UpperTorso: [-0.1, 0, 0] });
// the baby's win: arms up, try to stand, flop back onto the bottom (2.4 s, not looped)
export const babyFlop = { name: "babyFlop", priority: "Action2", loop: false, length: 2.4, keyframes: [
  k(0, { LeftUpperLeg: [1.5, 0, -0.25], RightUpperLeg: [1.5, 0, 0.25], LeftLowerLeg: [-0.1, 0, 0], RightLowerLeg: [-0.1, 0, 0], LeftUpperArm: [2.7, 0, -0.4], RightUpperArm: [2.7, 0, 0.4], Neck: [0.3, 0, 0] }),
  k(0.6, { LeftUpperLeg: [1.5, 0, -0.25], RightUpperLeg: [1.5, 0, 0.25], LeftLowerLeg: [-0.1, 0, 0], RightLowerLeg: [-0.1, 0, 0], LeftUpperArm: [2.9, 0, -0.6], RightUpperArm: [2.9, 0, 0.6], Neck: [0.4, 0, 0] }),
  k(1.1, { LeftUpperLeg: [0.6, 0, -0.1], RightUpperLeg: [0.6, 0, 0.1], LeftLowerLeg: [-1.0, 0, 0], RightLowerLeg: [-1.0, 0, 0], UpperTorso: [-0.35, 0, 0], LeftUpperArm: [0.6, 0, -0.6], RightUpperArm: [0.6, 0, 0.6], Neck: [0.1, 0, 0], HumanoidRootPart: { p: [0, 0.9, 0] } }, "Cubic", "Out"),
  k(1.5, { LeftUpperLeg: [1.6, 0, -0.3], RightUpperLeg: [1.6, 0, 0.3], LeftLowerLeg: [-0.05, 0, 0], RightLowerLeg: [-0.05, 0, 0], UpperTorso: [0.15, 0, 0], LeftUpperArm: [0.4, 0, -0.9], RightUpperArm: [0.4, 0, 0.9], Neck: [0.2, 0, 0], HumanoidRootPart: { p: [0, 0, 0] } }, "Bounce", "Out"),
  k(2.4, { LeftUpperLeg: [1.5, 0, -0.25], RightUpperLeg: [1.5, 0, 0.25], LeftLowerLeg: [-0.1, 0, 0], RightLowerLeg: [-0.1, 0, 0], LeftUpperArm: [0.2, 0, -0.5], RightUpperArm: [0.2, 0, 0.5], Neck: [0, 0.25, 0.2] }),
] };
// a slow nod (Dad agreeing, the one nod)
export const nod = loop("nod", 1.2, [[0, { Neck: [0, 0, 0] }], [0.3, { Neck: [-0.35, 0, 0] }], [0.6, { Neck: [0.05, 0, 0] }], [1.2, { Neck: [0, 0, 0] }]], "Action2");
// head tilt (curious / confused)
export const tilt = hold("tilt", { Neck: [0.05, 0.1, 0.35], UpperTorso: [0, 0, 0.05] }, "Action2");
// both hands holding something up in front of the face (the certificate, the plush, the sunscreen)
export const holdUp = hold("holdUp", { LeftUpperArm: [1.7, 0, -0.1], RightUpperArm: [1.7, 0, 0.1], LeftLowerArm: [0.6, 0, 0.35], RightLowerArm: [0.6, 0, -0.35], Neck: [0.1, 0, 0] });
// one hand forward, palm up ("give it here")
export const palm = hold("palm", { RightUpperArm: [1.2, 0, 0.2], RightLowerArm: [0.5, 0, 0], RightHand: [0, 0, -1.2], Neck: [-0.05, 0, 0] }, "Action2");
// carrying a child in both arms in front of the chest
export const carry = hold("carry", { LeftUpperArm: [1.1, 0, -0.25], RightUpperArm: [1.1, 0, 0.25], LeftLowerArm: [1.1, 0, 0.6], RightLowerArm: [1.1, 0, -0.6], UpperTorso: [0.12, 0, 0] });
// being carried: legs kick toward the keyboard, arms reach back
export const kick = loop("kick", 0.36, [
  [0, { LeftUpperLeg: [0.9, 0, 0], RightUpperLeg: [0.2, 0, 0], LeftLowerLeg: [-0.4, 0, 0], RightLowerLeg: [-1.0, 0, 0], RightUpperArm: [2.4, 0, 0.3], LeftUpperArm: [2.1, 0, -0.3], Neck: [0.2, 0, 0] }],
  [0.18, { LeftUpperLeg: [0.2, 0, 0], RightUpperLeg: [0.9, 0, 0], LeftLowerLeg: [-1.0, 0, 0], RightLowerLeg: [-0.4, 0, 0], RightUpperArm: [2.1, 0, 0.3], LeftUpperArm: [2.4, 0, -0.3], Neck: [0.25, 0, 0] }],
  [0.36, { LeftUpperLeg: [0.9, 0, 0], RightUpperLeg: [0.2, 0, 0], LeftLowerLeg: [-0.4, 0, 0], RightLowerLeg: [-1.0, 0, 0], RightUpperArm: [2.4, 0, 0.3], LeftUpperArm: [2.1, 0, -0.3], Neck: [0.2, 0, 0] }],
]);
// a sip from a juice box held in the right hand
export const sip = hold("sip", { RightUpperArm: [1.3, 0, 0.35], RightLowerArm: [2.0, 0, -0.6], Neck: [-0.05, 0, 0] }, "Action2");
// trying to peel the yogurt: both hands in front, tugging
export const peel = loop("peel", 0.5, [[0, { LeftUpperArm: [1.0, 0, -0.1], RightUpperArm: [1.0, 0, 0.1], LeftLowerArm: [1.2, 0, 0.5], RightLowerArm: [1.2, 0, -0.5], Neck: [-0.4, 0, 0] }],
  [0.25, { LeftUpperArm: [0.9, 0, -0.15], RightUpperArm: [1.1, 0, 0.2], LeftLowerArm: [1.3, 0, 0.5], RightLowerArm: [0.9, 0, -0.5], Neck: [-0.45, 0, 0], UpperTorso: [-0.05, 0, 0] }],
  [0.5, { LeftUpperArm: [1.0, 0, -0.1], RightUpperArm: [1.0, 0, 0.1], LeftLowerArm: [1.2, 0, 0.5], RightLowerArm: [1.2, 0, -0.5], Neck: [-0.4, 0, 0] }]]);
// hands on the head (panic at the keyboard)
export const handsHead = loop("handsHead", 0.6, [[0, { LeftUpperArm: [2.5, 0, -0.9], RightUpperArm: [2.5, 0, 0.9], LeftLowerArm: [1.9, 0, 0], RightLowerArm: [1.9, 0, 0], Neck: [0.15, 0.15, 0] }], [0.3, { LeftUpperArm: [2.6, 0, -0.85], RightUpperArm: [2.6, 0, 0.85], LeftLowerArm: [1.95, 0, 0], RightLowerArm: [1.95, 0, 0], Neck: [0.15, -0.15, 0] }], [0.6, { LeftUpperArm: [2.5, 0, -0.9], RightUpperArm: [2.5, 0, 0.9], LeftLowerArm: [1.9, 0, 0], RightLowerArm: [1.9, 0, 0], Neck: [0.15, 0.15, 0] }]]);
// one finger presses a key (Enter), then lifts
export const press = { name: "press", priority: "Action2", loop: false, length: 0.8, keyframes: [
  k(0, { RightUpperArm: [1.2, 0, 0.1], RightLowerArm: [0.4, 0, 0], Neck: [-0.3, 0, 0] }), k(0.3, { RightUpperArm: [0.85, 0, 0.1], RightLowerArm: [0.6, 0, 0], Neck: [-0.35, 0, 0] }, "Cubic", "In"), k(0.8, { RightUpperArm: [1.1, 0, 0.1], RightLowerArm: [0.45, 0, 0], Neck: [-0.2, 0, 0] })] };
// straightening my shirt: both hands tug the hem down, chin up
export const tug = hold("tug", { LeftUpperArm: [0.3, 0, -0.2], RightUpperArm: [0.3, 0, 0.2], LeftLowerArm: [0.9, 0, 0.6], RightLowerArm: [0.9, 0, -0.6], Neck: [0.2, 0.35, 0], UpperTorso: [0.05, 0, 0] }, "Action2");
// eating a sandwich while walking: right hand at the mouth
export const eat = hold("eat", { RightUpperArm: [1.25, 0, 0.3], RightLowerArm: [1.9, 0, -0.5] }, "Action2");
// a phone held to the ear (right hand)
export const phoneEar = hold("phoneEar", { RightUpperArm: [0.4, 0, 1.2], RightLowerArm: [2.3, 0, 0], Neck: [0, 0, 0.12] }, "Action2");
// leaning over a shoulder, hands forward
export const lean = hold("lean", { UpperTorso: [-0.35, 0, 0], LeftUpperArm: [0.9, 0, -0.1], RightUpperArm: [0.9, 0, 0.1], LeftLowerArm: [0.3, 0, 0], RightLowerArm: [0.3, 0, 0], Neck: [-0.2, 0, 0] });
// patting the box: right hand bobs
export const pat = loop("pat", 0.6, [[0, { RightUpperArm: [1.0, 0, 0.2], RightLowerArm: [0.3, 0, 0] }], [0.3, { RightUpperArm: [0.75, 0, 0.2], RightLowerArm: [0.35, 0, 0] }], [0.6, { RightUpperArm: [1.0, 0, 0.2], RightLowerArm: [0.3, 0, 0] }]], "Action2");
// putting the hat on: both arms above the other's head
export const crown = hold("crown", { LeftUpperArm: [2.3, 0, -0.2], RightUpperArm: [2.3, 0, 0.2], LeftLowerArm: [0.6, 0, 0.3], RightLowerArm: [0.6, 0, -0.3], UpperTorso: [-0.1, 0, 0] });
// reading a sheet held in both hands, head down
export const read = hold("read", { LeftUpperArm: [1.0, 0, -0.15], RightUpperArm: [1.0, 0, 0.15], LeftLowerArm: [1.0, 0, 0.45], RightLowerArm: [1.0, 0, -0.45], Neck: [-0.4, 0, 0] });
// holding a flag up (right arm raised, forearm up)
export const flagUp = hold("flagUp", { RightUpperArm: [1.6, 0, 0.3], RightLowerArm: [0.9, 0, 0], Neck: [0.05, 0, 0] }, "Action2");
export const flagDown = hold("flagDown", { RightUpperArm: [0.3, 0, 0.15], RightLowerArm: [0.3, 0, 0], Neck: [-0.35, 0, 0] }, "Action2");
export const ALL: Record<string, any> = { floorSit, babyFlop, nod, tilt, holdUp, palm, carry, kick, sip, peel, handsHead, press, tug, eat, phoneEar, lean, pat, crown, read, flagUp, flagDown, idle, run, victory, walk, crowdIdle, lookUp, slump, smug, aim, type, cheer, gasp, handOver, celebrate, armsCrossed, point, shrug, sit, panic };
