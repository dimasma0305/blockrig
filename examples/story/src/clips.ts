// Story-specific BlockRig clips (original keyframes). Axes are the character's own: arms/legs +X swing
// forward, knee bend = -X, elbow bend = +X, RightUpperArm +Z / LeftUpperArm -Z out to the side,
// torso -X leans forward, Neck +X looks up.
import { clips as base } from "blockrig";

const k = (t: number, poses: Record<string, any>, ease = "Cubic", dir = "InOut") => {
  const o: Record<string, any> = {};
  for (const j in poses) o[j] = Array.isArray(poses[j]) ? { r: poses[j], ease, dir } : { ease, dir, ...poses[j] };
  return { t, poses: o };
};
const hold = (name: string, poses: Record<string, any>, priority = "Action") => ({ name, priority, loop: true, length: 1, keyframes: [k(0, poses), k(1, poses)] });

export const idle = base.idle;
export const run = base.run;

export const walk = {
  name: "walk", priority: "Movement", loop: true, length: 1.0,
  keyframes: [0, 0.25, 0.5, 0.75, 1].map((t, i) => {
    const s = [1, 0, -1, 0, 1][i], up = [0, 0.12, 0, 0.12, 0][i];
    return k(t, {
      LeftUpperLeg: [0.55 * s, 0, 0], RightUpperLeg: [-0.55 * s, 0, 0],
      LeftLowerLeg: [s < 0 ? -0.6 : -0.15, 0, 0], RightLowerLeg: [s > 0 ? -0.6 : -0.15, 0, 0],
      LeftUpperArm: [-0.45 * s, 0, -0.08], RightUpperArm: [0.45 * s, 0, 0.08], LeftLowerArm: [0.35, 0, 0], RightLowerArm: [0.35, 0, 0],
      UpperTorso: [-0.04, 0.08 * s, 0], HumanoidRootPart: { p: [0, up, 0] },
    }, "Linear");
  }),
};

// the statue's frozen crouch: knees deep, forearms on the knees, head bowed
const CROUCH = {
  LeftUpperLeg: [1.55, 0, -0.25], RightUpperLeg: [1.55, 0, 0.25], LeftLowerLeg: [-2.25, 0, 0], RightLowerLeg: [-2.25, 0, 0], LeftFoot: [0.7, 0, 0], RightFoot: [0.7, 0, 0],
  LowerTorso: [-0.35, 0, 0], UpperTorso: [-0.35, 0, 0],
  LeftUpperArm: [0.9, 0, -0.25], RightUpperArm: [0.9, 0, 0.25], LeftLowerArm: [0.5, 0, 0], RightLowerArm: [0.5, 0, 0],
  Neck: [-0.45, 0, 0],
};
const STAND = {
  LeftUpperLeg: [0, 0, -0.05], RightUpperLeg: [0, 0, 0.05], LeftLowerLeg: [0, 0, 0], RightLowerLeg: [0, 0, 0], LeftFoot: [0, 0, 0], RightFoot: [0, 0, 0],
  LowerTorso: [0, 0, 0], UpperTorso: [0.05, 0, 0],
  LeftUpperArm: [0.1, 0, -0.35], RightUpperArm: [0.1, 0, 0.35], LeftLowerArm: [0.3, 0, 0], RightLowerArm: [0.3, 0, 0],
  Neck: [0.15, 0, 0],
};
export const crouch = hold("crouch", CROUCH, "Action");
export const standUp = {
  name: "standUp", priority: "Action", loop: false, length: 1.3,
  keyframes: [k(0, CROUCH, "Cubic", "In"), k(0.35, { ...CROUCH, Neck: [0.3, 0, 0], UpperTorso: [-0.2, 0, 0] }, "Cubic", "InOut"), k(1.3, STAND, "Bounce", "Out")],
};
export const statueIdle = hold("statueIdle", STAND, "Action");

// kneel on the right knee, reaching the right hand down and forward
const KNEEL = {
  RightUpperLeg: [0.05, 0, 0.1], RightLowerLeg: [-1.55, 0, 0], RightFoot: [0.6, 0, 0],
  LeftUpperLeg: [1.5, 0, -0.15], LeftLowerLeg: [-1.5, 0, 0],
  LowerTorso: [-0.15, 0, 0], UpperTorso: [-0.55, 0.15, 0],
  RightUpperArm: [1.05, 0, 0.12], RightLowerArm: [0.25, 0, 0], RightHand: [0.2, 0, 0],
  LeftUpperArm: [0.4, 0, -0.3], LeftLowerArm: [0.9, 0, 0],
  Neck: [-0.55, 0, 0],
};
export const kneelReach = {
  name: "kneelReach", priority: "Action", loop: false, length: 1.8,
  keyframes: [k(0, STAND), k(0.7, { ...KNEEL, RightUpperArm: [0.6, 0, 0.2] }), k(1.8, KNEEL, "Cubic", "Out")],
};
export const kneelHold = hold("kneelHold", KNEEL, "Action");
export const armsFolded = hold("armsFolded", {
  ...STAND, LeftUpperArm: [0.55, 0, -0.18], RightUpperArm: [0.55, 0, 0.18], LeftLowerArm: [1.75, 0, -0.8], RightLowerArm: [1.75, 0, 0.8], Neck: [-0.1, 0, 0],
}, "Action");

// kid
export const touch = {
  name: "touch", priority: "Action", loop: false, length: 0.8,
  keyframes: [k(0, { RightUpperArm: [0.1, 0, 0.1] }), k(0.55, { RightUpperArm: [1.95, 0, 0.05], RightLowerArm: [0.15, 0, 0], UpperTorso: [-0.12, 0, 0], LeftUpperLeg: [0.35, 0, 0], RightUpperLeg: [-0.2, 0, 0], Neck: [0.35, 0, 0] }, "Cubic", "Out"), k(0.8, { RightUpperArm: [1.95, 0, 0.05], RightLowerArm: [0.15, 0, 0], UpperTorso: [-0.12, 0, 0], LeftUpperLeg: [0.35, 0, 0], RightUpperLeg: [-0.2, 0, 0], Neck: [0.35, 0, 0] })],
};
export const lookUp = hold("lookUp", { Neck: [0.75, 0, 0], UpperTorso: [0.2, 0, 0], LeftUpperArm: [0.1, 0, -0.35], RightUpperArm: [0.1, 0, 0.35] });
export const scaredBack = hold("scaredBack", { Neck: [0.55, 0, 0], UpperTorso: [0.25, 0, 0], LeftUpperArm: [1.1, 0, -0.5], RightUpperArm: [1.1, 0, 0.5], LeftLowerArm: [1.2, 0, 0], RightLowerArm: [1.2, 0, 0], LeftUpperLeg: [-0.25, 0, 0], RightUpperLeg: [0.2, 0, 0] });
// sitting on the ground, leaning back on both hands, looking up
const SIT = {
  LeftUpperLeg: [1.45, 0, -0.15], RightUpperLeg: [1.35, 0, 0.2], LeftLowerLeg: [-0.35, 0, 0], RightLowerLeg: [-0.6, 0, 0],
  LowerTorso: [0.15, 0, 0], UpperTorso: [0.35, 0, 0],
  LeftUpperArm: [-0.75, 0, -0.35], RightUpperArm: [-0.75, 0, 0.35], LeftLowerArm: [0.2, 0, 0], RightLowerArm: [0.2, 0, 0],
  Neck: [0.55, 0, 0],
};
export const trip = {
  name: "trip", priority: "Action", loop: false, length: 0.55,
  keyframes: [k(0, { LeftUpperLeg: [0.9, 0, 0], RightUpperLeg: [-0.8, 0, 0], UpperTorso: [-0.3, 0, 0], LeftUpperArm: [-0.9, 0, -0.2], RightUpperArm: [0.9, 0, 0.2] }, "Cubic", "In"), k(0.55, SIT, "Bounce", "Out")],
};
export const sit = hold("sit", SIT);
export const wrapScarf = {
  name: "wrapScarf", priority: "Action", loop: false, length: 0.9,
  keyframes: [k(0, {}), k(0.45, { LeftUpperArm: [2.3, 0, -0.35], RightUpperArm: [2.3, 0, 0.35], LeftLowerArm: [1.7, 0, 0], RightLowerArm: [1.7, 0, 0], Neck: [-0.15, 0, 0] }), k(0.9, { LeftUpperArm: [0.1, 0, -0.2], RightUpperArm: [0.1, 0, 0.2], Neck: [0.15, 0, 0] })],
};
export const smug = hold("smug", { LeftUpperArm: [0.15, 0, -0.75], RightUpperArm: [0.15, 0, 0.75], LeftLowerArm: [1.3, 0, 0.9], RightLowerArm: [1.3, 0, -0.9], UpperTorso: [0.1, 0.12, 0], Neck: [0.12, -0.15, 0.06], LeftUpperLeg: [0, 0, -0.12], RightUpperLeg: [0, 0, 0.12] });
export const point = hold("point", { RightUpperArm: [1.5, 0, 0.25], RightLowerArm: [0.1, 0, 0], Neck: [0, -0.3, 0] });
export const lookAround = {
  name: "lookAround", priority: "Action", loop: true, length: 2.4,
  keyframes: [k(0, { Neck: [0.1, 0.45, 0] }), k(1.2, { Neck: [0.25, -0.45, 0] }), k(2.4, { Neck: [0.1, 0.45, 0] })],
};
