// Clips for the CTF story (original keyframes). Axes are the character's own: arms/legs +X swing forward,
// knee bend = -X, elbow bend = +X, RightUpperArm +Z / LeftUpperArm -Z out to the side, torso -X leans forward,
// Neck +X looks up.
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
