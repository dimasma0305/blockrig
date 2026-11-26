// Example clips for BlockRig.Animator. Original keyframes (not Roblox's default animations).
// Axes are the character's own (Y up, character faces -Z):
//   arms/legs: +X swings forward (PI = arm straight up), knee bend = -X, elbow bend = +X
//   RightUpperArm +Z / LeftUpperArm -Z = out to the side
//   UpperTorso/LowerTorso: -X leans forward; Neck: +X looks up; +Y turns towards the character's left
//   HumanoidRootPart { p: [x, y, z] } moves the whole body (studs)
const PI = Math.PI;
const k = (t, poses, ease, dir) => {
  const out = {};
  for (const j in poses) out[j] = Array.isArray(poses[j]) ? { r: poses[j], ease, dir } : Object.assign({ ease, dir }, poses[j]);
  return { t, poses: out };
};
const C = "Cubic", IO = "InOut";

const idle = {
  name: "idle", priority: "Idle", loop: true, length: 3,
  keyframes: [
    k(0, { UpperTorso: [0, 0, 0], LeftUpperArm: [0.05, 0, -0.08], RightUpperArm: [0.05, 0, 0.08], LeftLowerArm: [0.15, 0, 0], RightLowerArm: [0.15, 0, 0], Neck: [0, 0, 0] }, C, IO),
    k(1.5, { UpperTorso: [0.035, 0, 0], LeftUpperArm: [0.02, 0, -0.14], RightUpperArm: [0.02, 0, 0.14], LeftLowerArm: [0.22, 0, 0], RightLowerArm: [0.22, 0, 0], Neck: [0.07, 0.12, 0] }, C, IO),
    k(3, { UpperTorso: [0, 0, 0], LeftUpperArm: [0.05, 0, -0.08], RightUpperArm: [0.05, 0, 0.08], LeftLowerArm: [0.15, 0, 0], RightLowerArm: [0.15, 0, 0], Neck: [0, 0, 0] }, C, IO),
  ],
};

const wave = {
  name: "wave", priority: "Action", loop: true, length: 0.9,
  keyframes: [
    k(0, { RightUpperArm: [0.15, 0, 2.55], RightLowerArm: [0, 0, 0.55], RightHand: [0, 0, 0.2], UpperTorso: [0.04, 0, -0.08], Neck: [0.1, -0.2, 0.08], LeftUpperArm: [0, 0, -0.1] }, C, IO),
    k(0.45, { RightUpperArm: [0.15, 0, 2.45], RightLowerArm: [0, 0, -0.45], RightHand: [0, 0, -0.2], UpperTorso: [0.04, 0, -0.05], Neck: [0.1, -0.25, 0.05] }, C, IO),
    k(0.9, { RightUpperArm: [0.15, 0, 2.55], RightLowerArm: [0, 0, 0.55], RightHand: [0, 0, 0.2], UpperTorso: [0.04, 0, -0.08], Neck: [0.1, -0.2, 0.08] }, C, IO),
  ],
};

// a dramatic stance: one hand at the mask, the other flung out, chin up
const showtimePose = (b) => ({
  LeftUpperArm: [2.05 + b, 0, 0.55], LeftLowerArm: [1.75, 0, 0], LeftHand: [0, 0, 0.3],
  RightUpperArm: [0.1, 0, 1.25 + b], RightLowerArm: [0.25, 0, 0.2], RightHand: [0, 0, 0.35],
  UpperTorso: [0.14 + b * 0.5, 0.35, 0.05], LowerTorso: [0, 0.15, 0], Neck: [0.28 + b, -0.25, 0],
  LeftUpperLeg: [0.28, 0, -0.18], LeftLowerLeg: [-0.1, 0, 0], RightUpperLeg: [-0.22, 0, 0.12], RightLowerLeg: [-0.35, 0, 0],
});
const showtime = {
  name: "showtime", priority: "Action", loop: true, length: 2.4,
  keyframes: [k(0, showtimePose(0), C, IO), k(1.2, showtimePose(0.06), C, IO), k(2.4, showtimePose(0), C, IO)],
};

const runPose = (s, up) => ({
  LeftUpperLeg: [0.95 * s, 0, 0], RightUpperLeg: [-0.95 * s, 0, 0],
  LeftLowerLeg: [s > 0 ? -0.35 : -1.35, 0, 0], RightLowerLeg: [s > 0 ? -1.35 : -0.35, 0, 0],
  LeftUpperArm: [-0.95 * s, 0, -0.1], RightUpperArm: [0.95 * s, 0, 0.1],
  LeftLowerArm: [1.1, 0, 0], RightLowerArm: [1.1, 0, 0],
  UpperTorso: [-0.12, -0.12 * s, 0], LowerTorso: [-0.18, 0.1 * s, 0], Neck: [0.18, 0.1 * s, 0],
  HumanoidRootPart: { p: [0, up, 0] },
});
const passPose = (up) => ({
  LeftUpperLeg: [0, 0, 0], RightUpperLeg: [0, 0, 0], LeftLowerLeg: [-0.7, 0, 0], RightLowerLeg: [-0.7, 0, 0],
  LeftUpperArm: [0, 0, -0.1], RightUpperArm: [0, 0, 0.1], UpperTorso: [-0.12, 0, 0], LowerTorso: [-0.18, 0, 0], Neck: [0.18, 0, 0],
  HumanoidRootPart: { p: [0, up, 0] },
});
const run = {
  name: "run", priority: "Movement", loop: true, length: 0.64,
  keyframes: [k(0, runPose(1, 0), "Linear"), k(0.16, passPose(0.3), "Linear"), k(0.32, runPose(-1, 0), "Linear"), k(0.48, passPose(0.3), "Linear"), k(0.64, runPose(1, 0), "Linear")],
};

const card = {
  name: "card", priority: "Action", loop: true, length: 1.8,
  markers: [{ t: 0.05, name: "card-show" }, { t: 0.62, name: "card-throw" }],
  keyframes: [
    k(0, { RightUpperArm: [0.2, 0, 0.3], RightLowerArm: [0.3, 0, 0], UpperTorso: [0, 0, 0], Neck: [0, 0, 0], LeftUpperArm: [0, 0, -0.1], LeftUpperLeg: [0, 0, 0], RightUpperLeg: [0, 0, 0] }, C, IO),
    // wind up: card hand cocked back by the shoulder, body turned away
    k(0.45, { RightUpperArm: [1.2, 0, 1.0], RightLowerArm: [2.0, 0, 0], RightHand: [-0.4, 0, 0], UpperTorso: [0.08, 0.55, 0], LowerTorso: [0, 0.25, 0], Neck: [0, -0.5, 0], LeftUpperArm: [0.5, 0, -0.5], LeftUpperLeg: [-0.35, 0, 0], RightUpperLeg: [0.3, 0, 0], RightLowerLeg: [-0.4, 0, 0] }, C, "Out"),
    // flick: arm snaps forward across the body
    k(0.62, { RightUpperArm: [1.55, 0, -0.15], RightLowerArm: [0.15, 0, 0], RightHand: [0.3, 0, 0], UpperTorso: [-0.12, -0.45, 0], LowerTorso: [0, -0.15, 0], Neck: [0.05, 0.35, 0], LeftUpperArm: [-0.4, 0, -0.35], LeftUpperLeg: [0.45, 0, 0], RightUpperLeg: [-0.35, 0, 0], RightLowerLeg: [-0.2, 0, 0] }, "Elastic", "Out"),
    k(1.25, { RightUpperArm: [1.5, 0, -0.1], RightLowerArm: [0.1, 0, 0], UpperTorso: [-0.1, -0.4, 0], Neck: [0.05, 0.3, 0] }, C, IO),
    k(1.8, { RightUpperArm: [0.2, 0, 0.3], RightLowerArm: [0.3, 0, 0], RightHand: [0, 0, 0], UpperTorso: [0, 0, 0], LowerTorso: [0, 0, 0], Neck: [0, 0, 0], LeftUpperArm: [0, 0, -0.1], LeftUpperLeg: [0, 0, 0], RightUpperLeg: [0, 0, 0], RightLowerLeg: [0, 0, 0] }, C, IO),
  ],
};

const crouch = { LeftUpperLeg: [0.75, 0, -0.1], RightUpperLeg: [0.75, 0, 0.1], LeftLowerLeg: [-1.3, 0, 0], RightLowerLeg: [-1.3, 0, 0], LeftFoot: [0.5, 0, 0], RightFoot: [0.5, 0, 0], UpperTorso: [-0.25, 0, 0], LeftUpperArm: [-0.5, 0, -0.3], RightUpperArm: [-0.5, 0, 0.3], Neck: [0.1, 0, 0], HumanoidRootPart: { p: [0, -0.55, 0] } };
const air = { LeftUpperLeg: [0.5, 0, -0.15], RightUpperLeg: [-0.2, 0, 0.15], LeftLowerLeg: [-1.1, 0, 0], RightLowerLeg: [-0.5, 0, 0], LeftFoot: [0, 0, 0], RightFoot: [0, 0, 0], UpperTorso: [0.15, 0, 0], LeftUpperArm: [PI - 0.2, 0, -0.4], RightUpperArm: [PI - 0.2, 0, 0.4], LeftLowerArm: [0.2, 0, 0], RightLowerArm: [0.2, 0, 0], Neck: [0.3, 0, 0], HumanoidRootPart: { p: [0, 1.1, 0] } };
const victory = {
  name: "victory", priority: "Action", loop: true, length: 1.3,
  keyframes: [k(0, crouch, C, "Out"), k(0.4, air, C, "In"), k(0.85, crouch, "Bounce", "Out"), k(1.3, crouch, C, IO)],
};

export const clips = { idle, wave, showtime, run, card, victory };
export { idle, wave, showtime, run, card, victory };
