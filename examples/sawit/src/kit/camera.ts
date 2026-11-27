// Camera recipes for story shorts. Each returns a Cam (position, look-at, lens, shake) for progress p (0..1)
// through the shot; src/direction/camera.ts picks one per shot. Aim at a point a little BELOW a head when a
// rank tag or name floats above it, or the caption ends up over the face (see the camera skill).
import * as THREE from "three";
import { easeInOut, rng } from "./rng";

export type Cam = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; shake: number; roll?: number };
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);

/** Move from one framing to another (dolly, crane, push-in, pull-back), eased. */
export const move = (from: [THREE.Vector3, THREE.Vector3], to: [THREE.Vector3, THREE.Vector3], p: number, fov = 50, shake = 0): Cam => {
  const e = easeInOut(p); return { pos: mix(from[0], to[0], e), target: mix(from[1], to[1], e), fov, shake };
};
/** Push in on a subject: start `far` studs away and end `near`, from direction `dir` (unit, from subject to camera). */
export const pushIn = (subject: THREE.Vector3, dir: THREE.Vector3, far: number, near: number, p: number, fov = 45, lift = 0.6): Cam => {
  const d = dir.clone().normalize(), e = easeInOut(p), dist = far + (near - far) * e;
  return { pos: subject.clone().addScaledVector(d, dist).add(V(0, lift, 0)), target: subject.clone(), fov, shake: 0 };
};
/** Orbit around a point from angle a0 to a1 (radians, 0 = +Z) at a radius and height. */
export const orbit = (center: THREE.Vector3, radius: number, a0: number, a1: number, height: number, p: number, fov = 50): Cam => {
  const a = a0 + (a1 - a0) * easeInOut(p);
  return { pos: V(center.x + Math.sin(a) * radius, center.y + height, center.z + Math.cos(a) * radius), target: center.clone(), fov, shake: 0 };
};
/** Follow a moving subject from a fixed offset (chase cam), looking slightly ahead. */
export const follow = (subject: THREE.Vector3, offset: THREE.Vector3, ahead = V(0, 1.5, 0), fov = 52): Cam => ({ pos: subject.clone().add(offset), target: subject.clone().add(ahead), fov, shake: 0 });
/** Low hero angle: camera near the ground looking up at a subject. */
export const lowAngle = (subject: THREE.Vector3, dir: THREE.Vector3, dist = 7, fov = 55): Cam => ({ pos: subject.clone().addScaledVector(dir.clone().normalize(), dist).setY(0.8), target: subject.clone().add(V(0, 1.5, 0)), fov, shake: 0 });
/** Top-down (god view) over a point, for crowds and "this town" establishing shots. */
export const topDown = (center: THREE.Vector3, height = 26, tilt = 6, fov = 50): Cam => ({ pos: center.clone().add(V(0, height, tilt)), target: center.clone(), fov, shake: 0 });

const tmp = new THREE.Vector3();
/** Apply a Cam to a three camera. Shake is seeded by frame, so it is the same on every render. */
export function applyCamera(cam: THREE.PerspectiveCamera, c: Cam, frame: number) {
  cam.position.copy(c.pos);
  if (c.shake > 0) { const r = rng(frame + 1); cam.position.add(tmp.set(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(c.shake * 2)); }
  cam.fov = c.fov; cam.near = 0.3; cam.far = 2000; cam.updateProjectionMatrix(); // near 0.3 (not 0.1): 3x the depth precision, so close surfaces don't flicker far away
  cam.up.set(0, 1, 0); cam.lookAt(c.target);
  if (c.roll) cam.rotateZ(c.roll);
}
