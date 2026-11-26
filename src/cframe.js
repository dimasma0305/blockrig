// CFrame helpers. A Roblox CFrame is a rotation matrix (row-major R00..R22) plus a position.
// Its columns are the RightVector, UpVector and ZVector (LookVector = -ZVector), right-handed, Y up.
import * as THREE from "three";

/** @param {{rot:number[], pos:number[]}|number[]} cf  {rot,pos} or a flat [x,y,z,R00..R22] array */
export function cframeToMatrix(cf, target = new THREE.Matrix4()) {
  const rot = Array.isArray(cf) ? cf.slice(3, 12) : cf.rot;
  const pos = Array.isArray(cf) ? cf.slice(0, 3) : cf.pos;
  return target.set(rot[0], rot[1], rot[2], pos[0], rot[3], rot[4], rot[5], pos[1], rot[6], rot[7], rot[8], pos[2], 0, 0, 0, 1);
}

export function matrixToCFrame(m) {
  const e = m.elements; // column-major
  return { rot: [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]], pos: [e[12], e[13], e[14]] };
}

/**
 * Motor6D: Part1 = Part0 * C0 * Transform * C1^-1
 * @returns {THREE.Matrix4} world matrix of Part1
 */
export function motor6D(part0, c0, transform, c1) {
  return new THREE.Matrix4().copy(part0).multiply(c0).multiply(transform).multiply(new THREE.Matrix4().copy(c1).invert());
}

/** Rigid accessory weld: Handle = BodyPart * BodyAttachment * HandleAttachment^-1 */
export function accessoryWeld(bodyPart, bodyAttachment, handleAttachment) {
  return new THREE.Matrix4().copy(bodyPart).multiply(bodyAttachment).multiply(new THREE.Matrix4().copy(handleAttachment).invert());
}

export const ROT_Y180 = [-1, 0, 0, 0, 1, 0, 0, 0, -1];
export const ROT_X180 = [1, 0, 0, 0, -1, 0, 0, 0, -1];
