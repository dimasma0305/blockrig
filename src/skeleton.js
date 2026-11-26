// The default R15 bind pose used by layered clothing: joint positions in studs, character space
// (Y up, the character faces -Z, origin at the HumanoidRootPart's skinning origin).
// Torso bones are turned 180° about Y and limb bones 180° about X, as in Roblox clothing skeletons.
import { ROT_X180, ROT_Y180 } from "./cframe.js";

/** @type {{ name: string, parent: string|null, pos: number[], rot: number[] }[]} */
export const R15_BIND = [
  { name: "HumanoidRootPart", parent: null, pos: [0, 0.816, 0], rot: ROT_Y180 },
  { name: "LowerTorso", parent: "HumanoidRootPart", pos: [0, -0.184, 0], rot: ROT_Y180 },
  { name: "UpperTorso", parent: "LowerTorso", pos: [0, 0.216, 0], rot: ROT_Y180 },
  { name: "LeftUpperArm", parent: "UpperTorso", pos: [-1, 1.579, 0], rot: ROT_X180 },
  { name: "LeftLowerArm", parent: "LeftUpperArm", pos: [-1.5, 0.851, 0], rot: ROT_X180 },
  { name: "LeftHand", parent: "LeftLowerArm", pos: [-1.5, 0.091, 0], rot: ROT_X180 },
  { name: "RightUpperArm", parent: "UpperTorso", pos: [1, 1.579, 0], rot: ROT_X180 },
  { name: "RightLowerArm", parent: "RightUpperArm", pos: [1.5, 0.851, 0], rot: ROT_X180 },
  { name: "RightHand", parent: "RightLowerArm", pos: [1.5, 0.091, 0], rot: ROT_X180 },
  { name: "LeftUpperLeg", parent: "LowerTorso", pos: [-0.5, -0.184, 0], rot: ROT_X180 },
  { name: "LeftLowerLeg", parent: "LeftUpperLeg", pos: [-0.5, -1.006, 0], rot: ROT_X180 },
  { name: "LeftFoot", parent: "LeftLowerLeg", pos: [-0.5, -1.932, 0], rot: ROT_X180 },
  { name: "RightUpperLeg", parent: "LowerTorso", pos: [0.5, -0.184, 0], rot: ROT_X180 },
  { name: "RightLowerLeg", parent: "RightUpperLeg", pos: [0.5, -1.006, 0], rot: ROT_X180 },
  { name: "RightFoot", parent: "RightLowerLeg", pos: [0.5, -1.932, 0], rot: ROT_X180 },
];

export const R15_JOINTS = R15_BIND.map((b) => b.name).concat("Neck");

/** Bottom of the feet in the bind pose (foot joint minus the 0.3-stud foot). */
export const R15_FLOOR = -1.932 - 0.3;
/** Top of UpperTorso, where the neck joint sits. */
export const R15_NECK_Y = 0.216 + 1.6;

/** Body attachments for rigid accessories, in head space (origin at the neck, Y up, face towards -Z). */
export const HEAD_ATTACHMENTS = {
  HairAttachment: [0, 1.2, 0],
  HatAttachment: [0, 1.2, 0],
  FaceFrontAttachment: [0, 0.6, -0.6],
  FaceCenterAttachment: [0, 0.6, 0],
};
