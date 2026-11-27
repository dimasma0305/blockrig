// One camera recipe per shot (position, look-at, lens, shake), eased over the shot. Targets follow the cast.
import * as THREE from "three";
import type { Cast } from "../cast/characters";
import type { Shot } from "../kit";
import { easeInOut, easeOut, lerp, rng } from "../kit/rng";
import { BAKERY, SCHOOL, HERO_STREET, PX, VAULT, TERMINAL } from "../world/layout";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);
const head = (rig: any) => rig.jointPosition("Neck", new THREE.Vector3()).add(V(0, 0.6, 0));
export type Cam = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; shake: number };

export function cameraFor(shot: Shot, p: number, local: number, cast: Cast): Cam {
  const e = easeInOut(p), o = easeOut(p), { hero } = cast;
  switch (shot.id) {
    case "s01": return { pos: mix(V(2, 78, 30), V(3, 4.5, 26), e), target: mix(V(0, 70, -150), V(0, 4, -24), e), fov: 50, shake: 0 };
    case "s02": return { pos: mix(V(4.4, 3.8, 2.6), V(5.2, 3.6, 1.2), e), target: V(BAKERY.x, 3.6, BAKERY.z), fov: 46, shake: 0 };
    case "s03": return { pos: mix(V(1.8, 1.4, -18.5), V(0.6, 1.6, -19.5), e), target: V(SCHOOL.x + 1.5, 3.6, SCHOOL.z), fov: 54, shake: 0 };
    case "s04": { const h = head(hero.rig); return { pos: mix(h.clone().add(V(0.8, -1.3, 5.2)), h.clone().add(V(0.6, -1.0, 6.2)), e), target: mix(h.clone().add(V(0, -1.1, 0)), h.clone().add(V(0, -0.8, 0)), o), fov: 44, shake: 0 }; }
    case "s05": { const a = lerp(0.5, 0.15, e), r = 72; return { pos: V(PX + Math.sin(a) * r, lerp(5, 9, e), VAULT.z + Math.cos(a) * r), target: V(PX, 15, VAULT.z), fov: 50, shake: 0 }; }
    case "s06": return { pos: mix(V(PX + 3.5, 1.1, -4.2), V(PX + 2.5, 1.3, -2.5), e), target: V(PX, 4.6, 8), fov: 56, shake: 0 };
    case "s07": return { pos: mix(V(PX + 46, 9, 24), V(PX + 40, 11, 14), e), target: V(PX, 9, -10), fov: 56, shake: 0.16 };
    case "s08": return { pos: V(PX + 5, 7, 44), target: V(PX, 11, VAULT.z), fov: 44, shake: local < 0.2 ? 0.1 : 0 };
    case "s09": { const h = hero.rig.object.position; return { pos: h.clone().add(V(0.6, 15, 5)), target: h.clone().add(V(0, 0, -1.5)), fov: 50, shake: 0 }; }
    case "s10": return { pos: mix(V(PX + 8.5, 4.8, TERMINAL.z + 2.6), V(PX + 7.4, 4.4, TERMINAL.z + 1.8), e), target: V(PX - 0.3, 3.5, TERMINAL.z + 0.4), fov: 50, shake: 0 };
    case "s11": return { pos: V(PX + 0.05, 3.3, TERMINAL.z + 2.2), target: V(PX - 0.05, 2.95, TERMINAL.z - 0.05), fov: lerp(30, 21, e), shake: 0 };
    case "s12": return { pos: mix(V(PX + 5, 3.5, TERMINAL.z + 9), V(PX + 16, 14, TERMINAL.z + 34), o), target: V(PX, 7, VAULT.z + 6), fov: 52, shake: local < 0.6 ? 0.15 : 0 };
    case "s13": { const h = head(hero.rig); return { pos: h.clone().add(V(2.6, -1.8, 12)), target: h.clone().add(V(0, 1.4, 0)), fov: 54, shake: 0 }; }
    case "s14": return { pos: mix(V(0.5, 4.5, 17), V(0, 34, 34), easeInOut(Math.max(0, (p - 0.35) / 0.65))), target: mix(V(0, 3.2, 0), V(0, 62, -150), easeInOut(Math.max(0, (p - 0.35) / 0.65))), fov: 50, shake: 0 };
  }
  return { pos: V(HERO_STREET.x + 20, 12, 20), target: V(0, 4, 0), fov: 50, shake: 0 };
}

const tmp = new THREE.Vector3();
export function applyCamera(cam: THREE.PerspectiveCamera, c: Cam, time: number) {
  cam.position.copy(c.pos);
  if (c.shake > 0) { const r = rng(Math.floor(time * 60) + 1); cam.position.add(tmp.set(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(c.shake * 2)); }
  cam.fov = c.fov; cam.near = 0.05; cam.far = 1200; cam.updateProjectionMatrix();
  cam.lookAt(c.target);
}
