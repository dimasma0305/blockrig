// One camera recipe per shot: position, look-at target and lens, as eased functions of shot progress.
// Targets follow the characters' joints, so framing survives changes to the animation.
import * as THREE from "three";
import type { Cast } from "./characters";
import type { Shot } from "./timeline";
import { easeInOut, easeOut, lerp, rng } from "./lib/rng";
import { PLINTH, STREET_X } from "./layout";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const joint = (rig: any, name: string) => rig.jointPosition(name, new THREE.Vector3());
const head = (rig: any) => { const n = joint(rig, "Neck"); return n.add(V(0, 0.6 * rig.body.headScale * rig.object.scale.y, 0)); };
const mix = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);

export type Cam = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; shake: number };

export function cameraFor(shot: Shot, p: number, local: number, cast: Cast): Cam {
  const { kid, statue, folks } = cast;
  const e = easeInOut(p), o = easeOut(p);
  switch (shot.id) {
    case "s01": return { pos: mix(V(26, 34, 44), V(14, 15, 26), e), target: V(0, PLINTH.height + 4, 0), fov: 48, shake: 0 };
    case "s02": { const h = head(statue); return { pos: mix(h.clone().add(V(3.5, -3.6, 8.5)), h.clone().add(V(2.4, -2.2, 6.6)), e), target: h.clone().add(V(0, lerp(-0.6, 0.3, e), 0)), fov: 40, shake: 0 }; }
    case "s03": { const f = joint(folks[0], "UpperTorso"); return { pos: f.clone().add(V(lerp(3.5, 2.5, e), 1.2, 7.5)), target: f.clone().add(V(-0.5, 0.8, 0)), fov: 46, shake: 0 }; }
    case "s04": { const k = joint(kid, "UpperTorso"); return { pos: V(k.x - lerp(2.2, 11, e), k.y + lerp(1.6, 3, e), Math.max(k.z - lerp(7.5, 9.5, e), PLINTH.size / 2 + 2)), target: k.clone().add(V(0, 0.8, 0)), fov: lerp(44, 50, e), shake: 0 }; }
    case "s05": { const k = joint(kid, "UpperTorso"); const m = mix(k, V(0, PLINTH.height + 3, 1), 0.4); return { pos: m.clone().add(V(lerp(9, 7.5, o), 2.5, lerp(14, 12, o))), target: m, fov: 48, shake: 0 }; }
    case "s06": return { pos: mix(V(10, 5, 20), V(13, 9, 24), e), target: V(0, PLINTH.height + 4, 3), fov: 52, shake: 0 };
    case "s07": { const h = head(statue); const d = local < 0.2 ? 8.5 : lerp(8.5, 6.2, easeOut((local - 0.2) / 0.25)); return { pos: h.clone().add(V(0.5, -2.6, d)), target: h.clone().add(V(0, -0.7, 0)), fov: 36, shake: local > 0.2 && local < 0.45 ? 0.08 : 0 }; }
    case "s08": { const k = joint(kid, "LowerTorso"); return { pos: k.clone().add(V(2.0, -0.6, 5.0)), target: mix(joint(statue, "UpperTorso"), head(statue), 0.5), fov: 62, shake: 0.22 * (1 - p) }; }
    case "s09": return { pos: mix(V(30, 7, 18), V(26, 6, 22), e), target: V(0, 4, 5), fov: 52, shake: 0.06 };
    case "s10": { const h = head(kid); return { pos: h.clone().add(V(0.4, lerp(3.2, 2.5, e), lerp(-4.6, -3.6, e))), target: h, fov: 42, shake: 0 }; }
    case "s11": { const m = mix(head(kid), joint(statue, "RightHand"), 0.5); return { pos: m.clone().add(V(lerp(11, 10, e), 4, lerp(17, 15, e))), target: m.clone().add(V(0, 1, 0)), fov: 50, shake: 0 }; }
    case "s12": { const hand = joint(statue, "RightHand"), k = head(kid); const focus = mix(mix(hand, k, 0.5), mix(k, head(statue), 0.4), e); return { pos: focus.clone().add(V(lerp(6.5, 10, e), lerp(2, 3.5, e), lerp(10, 16, e))), target: focus, fov: 48, shake: 0 }; }
    case "s13": { const k = joint(kid, "UpperTorso"); return { pos: V(STREET_X + 24, 5.5, k.z + 3), target: mix(k, head(statue), 0.4), fov: 56, shake: 0 }; }
    case "s14": { const k = joint(kid, "UpperTorso"); return { pos: k.clone().add(V(0.8, lerp(1.0, 0.6, e), lerp(16, 10, e))), target: k.clone().add(V(0, lerp(3.5, 2.4, e), 0)), fov: 46, shake: 0 }; }
  }
  return { pos: V(20, 12, 20), target: V(0, 4, 0), fov: 50, shake: 0 };
}

const tmp = new THREE.Vector3();
export function applyCamera(cam: THREE.PerspectiveCamera, c: Cam, time: number) {
  cam.position.copy(c.pos);
  if (c.shake > 0) { const r = rng(Math.floor(time * 60) + 1); cam.position.add(tmp.set(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(c.shake * 2)); }
  cam.fov = c.fov; cam.near = 0.1; cam.far = 900; cam.updateProjectionMatrix();
  cam.lookAt(c.target);
}
