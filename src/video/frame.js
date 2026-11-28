// Framing by where faces should land, not by hand-placed camera positions. Give the faces (head points) and the side
// to shoot from; frame() finds the camera distance and height so every face sits at the chosen height in the frame,
// inside the side margins (clear of the app buttons on the right), and out of the caption band. The camera looks
// level along the chosen direction (or tilted by `from`'s y), so a frame is a pure function of the subjects: it
// follows them as they move. Fixes the template's s01 / s07 (captions over faces) at the source. BlockRig extra.
//
//   applyCamera(camera, frame([head(hero), head(sister)], { from: V(-1, 0.1, 0), fov: 50 }), frameNumber)
//   frame([head(hero)], { from: V(0.3, 0.2, 1), faceY: 0.3, size: 0.16 })    // a close single
import * as THREE from "three";
import { ZONES, captionBand } from "./zones.js";

const DEFAULTS = {
  from: new THREE.Vector3(0, 0.15, 1), fov: 45, aspect: 9 / 16,
  /** where faces sit, as a fraction of the frame height from the top */
  faceY: 0.36,
  /** where faces may be across the frame (fractions from the left): clear of the edges and the app buttons */
  x: [0.1, ZONES.buttons.x[0] - 0.02],
  /** faces stay between these heights (from the top) */
  y: [ZONES.top + 0.05, ZONES.bottom - 0.04],
  /** bands faces must stay out of (from the top): the captions */
  avoid: [captionBand()],
  minDistance: 2.5, maxDistance: 400,
  /** how big a head is: the fraction of the frame height a 1.2-stud head covers (0.1 = a medium shot); the camera
   *  starts there and backs off only as far as the faces need to fit */
  size: 0.1,
  /** > 1 backs off further (a wider frame), e.g. 1.3 */
  wide: 1,
  /** studs either side of each face that must stay inside the margins too: shoulders and arms (a Roblox body is ~2
   *  studs wide; arms swing out further) */
  body: 1.6,
};

const tmp = new THREE.Vector3();
/** Where points land on screen from a camera at `pos` looking along `f` (unit) with world up: fractions from left / top. */
export function screenOf(points, pos, f, fov, aspect) {
  const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), u = new THREE.Vector3().crossVectors(r, f);
  const tv = Math.tan(THREE.MathUtils.degToRad(fov) / 2), th = tv * aspect;
  return points.map((p) => { tmp.copy(p).sub(pos); const z = tmp.dot(f); return { x: (tmp.dot(r) / (z * th) + 1) / 2, y: (1 - tmp.dot(u) / (z * tv)) / 2, z }; });
}

/**
 * A Cam (`{ pos, target, fov, shake }`, for applyCamera) framing `faces` (Vector3 head points) from direction `from`
 * (from the subjects towards the camera). Returns also `distance` and `screen` (where each face lands).
 */
export function frame(faces, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const c = faces.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / faces.length);
  const dir = o.from.clone().normalize(), f = dir.clone().negate();
  const up = new THREE.Vector3(0, 1, 0);
  // camera position for distance D and height offset h (along world up)
  const posAt = (D, h) => c.clone().addScaledVector(dir, D).addScaledVector(up, h);
  const meanY = (D, h) => { const s = screenOf(faces, posAt(D, h), f, o.fov, o.aspect); return s.reduce((a, q) => a + q.y, 0) / s.length; };
  // the height that puts the faces' mean at faceY (raising the camera lowers the faces on screen): bisection
  const heightFor = (D) => { let lo = -D, hi = D; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (meanY(D, m) < o.faceY) lo = m; else hi = m; } return (lo + hi) / 2; };
  const right = new THREE.Vector3().crossVectors(f, up).normalize();
  const sides = faces.flatMap((p) => [p.clone().addScaledVector(right, o.body), p.clone().addScaledVector(right, -o.body)]);
  const ok = (D) => {
    const h = heightFor(D), pos = posAt(D, h), s = screenOf(faces, pos, f, o.fov, o.aspect);
    return s.every((q) => q.z > 0.5 && q.y >= o.y[0] && q.y <= o.y[1] && !o.avoid.some(([a, b]) => q.y >= a && q.y <= b))
      && screenOf([...faces, ...sides], pos, f, o.fov, o.aspect).every((q) => q.x >= o.x[0] && q.x <= o.x[1]);
  };
  // start at the distance that gives heads their size, back off until every face fits, then `wide`
  const tv = Math.tan(THREE.MathUtils.degToRad(o.fov) / 2);
  let D = Math.max(o.minDistance, 1.2 / (2 * tv * o.size));
  while (D < o.maxDistance && !ok(D)) D *= 1.04;
  const fits = D < o.maxDistance;
  D = Math.min(D, o.maxDistance) * Math.max(1, o.wide);
  const h = heightFor(D), pos = posAt(D, h);
  return { pos, target: pos.clone().addScaledVector(f, D), fov: o.fov, shake: 0, distance: D, screen: screenOf(faces, pos, f, o.fov, o.aspect), fits };
}
