// Camera recipes for story shorts. Each returns a Cam (position, look-at, lens, shake) for progress p (0..1)
// through the shot. Aim a little BELOW a head when a name tag floats above it, or the caption covers the face.
// BlockRig extra (Roblox's Camera is game-driven; these are film framings).
import * as THREE from "three";
import { easeInOut, rng } from "./motion.js";

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mix = (a, b, t) => a.clone().lerp(b, t);

/** Move from one framing [pos, target] to another (dolly, crane, push-in, pull-back), eased. */
export const move = (from, to, p, fov = 50, shake = 0) => {
  const e = easeInOut(p); return { pos: mix(from[0], to[0], e), target: mix(from[1], to[1], e), fov, shake };
};
/** Push in on a subject: from `far` to `near` studs along `dir` (from the subject towards the camera). */
export const pushIn = (subject, dir, far, near, p, fov = 45, lift = 0.6) => {
  const d = dir.clone().normalize(), e = easeInOut(p), dist = far + (near - far) * e;
  return { pos: subject.clone().addScaledVector(d, dist).add(V(0, lift, 0)), target: subject.clone(), fov, shake: 0 };
};
/** Orbit a point from angle a0 to a1 (radians, 0 = +Z) at a radius and height. */
export const orbit = (center, radius, a0, a1, height, p, fov = 50) => {
  const a = a0 + (a1 - a0) * easeInOut(p);
  return { pos: V(center.x + Math.sin(a) * radius, center.y + height, center.z + Math.cos(a) * radius), target: center.clone(), fov, shake: 0 };
};
/** Follow a moving subject from a fixed offset (chase cam), looking slightly ahead. */
export const follow = (subject, offset, ahead = V(0, 1.5, 0), fov = 52) => ({ pos: subject.clone().add(offset), target: subject.clone().add(ahead), fov, shake: 0 });
/** Low hero angle: the camera near the ground looking up at a subject. */
export const lowAngle = (subject, dir, dist = 7, fov = 55) => ({ pos: subject.clone().addScaledVector(dir.clone().normalize(), dist).setY(0.8), target: subject.clone().add(V(0, 1.5, 0)), fov, shake: 0 });
/** Top-down (god view) over a point, for crowds and establishing shots. */
export const topDown = (center, height = 26, tilt = 6, fov = 50) => ({ pos: center.clone().add(V(0, height, tilt)), target: center.clone(), fov, shake: 0 });

const tmp = new THREE.Vector3();
/** Apply a Cam to a three.js camera. Shake is seeded by frame, so it is the same on every render. */
export function applyCamera(cam, c, frame) {
  cam.position.copy(c.pos);
  if (c.shake > 0) { const r = rng(frame + 1); cam.position.add(tmp.set(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(c.shake * 2)); }
  // near 0.3 (not 0.1): 3x the depth precision, so close surfaces don't flicker far away
  cam.fov = c.fov; cam.near = 0.3; cam.far = 2000; cam.updateProjectionMatrix();
  cam.up.set(0, 1, 0); cam.lookAt(c.target);
  if (c.roll) cam.rotateZ(c.roll);
}
