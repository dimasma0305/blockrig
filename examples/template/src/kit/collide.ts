// Collision check with Rapier (`npm run collide`): the world's solid things become Rapier colliders, and every
// sampled frame is checked for staging mistakes a viewer would notice:
//   camera-inside   the camera is inside a wall or prop (the frame goes blank or shows a wall's back)
//   hidden          a character in frame is hidden from the camera by a wall or prop
//   inside          a character's torso is inside a wall, prop or furniture
//   floating/sunk   a character's feet (or seated hips) are above, or deeper than the surface's softness into, what is
//                   below (kit/surfaces.ts: a bed or sofa gives ~0.3 studs, a floor nothing)
//   stiff           a character rests exactly on top of something soft (a bed should give a little)
//   overlap         two characters stand inside each other
// The probe runs inside the real render (same scene, poses, cameras), so it checks exactly what the video shows.
// Characters are not colliders (they are checked against the world). Objects with userData.noCollide (clouds,
// birds, the dog, weather) are skipped; a Roblox map brings its own part boxes (userData.colliders), which are
// solid, so "inside a wall" is caught even where a mesh would be hollow.
import * as THREE from "three";
import type RAPIER_NS from "@dimforge/rapier3d-compat";
import { surfaceOf } from "./surfaces";

type R = typeof RAPIER_NS;
export type Issue = { kind: "camera-inside" | "hidden" | "inside" | "floating" | "sunk" | "stiff" | "overlap"; who: string; what: string; amount?: number };
export type Probed = { name: string; rig: { object: THREE.Object3D; jointPosition(n: string, t?: THREE.Vector3): THREE.Vector3 } };

let rapier: Promise<R> | null = null;
/** Rapier's WASM, loaded once per browser tab. */
export function loadRapier(): Promise<R> {
  return (rapier ??= import("@dimforge/rapier3d-compat").then(async (m: any) => { const R = (m.default ?? m) as R; await R.init(); return R; }));
}

function label(o: THREE.Object3D | null): string {
  for (let x = o; x; x = x.parent) if (x.userData.label || x.userData.asset) return x.userData.label ?? x.userData.asset;
  return o?.name || "?";
}
const solidMaterial = (m: any) => m && !m.isShaderMaterial && !m.isPointsMaterial && (m.opacity ?? 1) >= 0.5 && m.visible !== false;

/** Colliders for everything under `root` (built once per tab; the world does not move except noCollide things). */
export function createProbe(R: R, root: THREE.Object3D) {
  const world = new R.World({ x: 0, y: 0, z: 0 }), names = new Map<number, string>(), materials = new Map<number, number>();
  root.updateMatrixWorld(true);
  const add = (desc: any, name: string, material?: number) => { const h = world.createCollider(desc).handle; names.set(h, name); if (material != null) materials.set(h, material); };
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const visit = (o: THREE.Object3D) => {
    if (o.userData.noCollide) return;
    const boxes = o.userData.colliders as { size: number[]; matrix: THREE.Matrix4; name: string; material?: number }[] | undefined;
    if (boxes) { // a Roblox map: one solid box per part, named after its model
      for (const b of boxes) {
        m.multiplyMatrices(o.matrixWorld, b.matrix).decompose(p, q, s);
        add(R.ColliderDesc.cuboid(Math.max(b.size[0], 0.05) / 2, Math.max(b.size[1], 0.05) / 2, Math.max(b.size[2], 0.05) / 2).setTranslation(p.x, p.y, p.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }), b.name, b.material);
      }
      return;
    }
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(mesh as any).isInstancedMesh && o.visible && (Array.isArray(mesh.material) ? mesh.material.some(solidMaterial) : solidMaterial(mesh.material))) {
      const pos = mesh.geometry.attributes.position, n = pos.count, v = new Float32Array(n * 3), t = new THREE.Vector3();
      for (let i = 0; i < n; i++) { t.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); v[i * 3] = t.x; v[i * 3 + 1] = t.y; v[i * 3 + 2] = t.z; }
      const idx = mesh.geometry.index ? Uint32Array.from(mesh.geometry.index.array) : Uint32Array.from({ length: n }, (_, i) => i);
      if (idx.length >= 3) add(R.ColliderDesc.trimesh(v, idx), label(o));
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  world.step(); // builds the query structures

  const solidAt = (at: THREE.Vector3) => { let hit: string | null = null; world.intersectionsWithPoint({ x: at.x, y: at.y, z: at.z }, (c) => { hit = names.get(c.handle) ?? "?"; return false; }); return hit as string | null; };
  const ray = (from: THREE.Vector3, dir: THREE.Vector3, max: number) => {
    const h = world.castRay(new R.Ray({ x: from.x, y: from.y, z: from.z }, { x: dir.x, y: dir.y, z: dir.z }), max, true);
    return h ? { toi: h.timeOfImpact, name: names.get(h.collider.handle) ?? "?", material: materials.get(h.collider.handle) } : null;
  };

  return {
    colliders: names.size,
    /** Everything wrong in this frame. `people` are the characters placed in the scene (hidden ones are skipped). */
    check(camera: THREE.PerspectiveCamera, people: Probed[]): Issue[] {
      const out: Issue[] = [], cam = camera.getWorldPosition(new THREE.Vector3());
      camera.updateMatrixWorld(true);
      const inCam = solidAt(cam); if (inCam) out.push({ kind: "camera-inside", who: "camera", what: inCam });
      const torsos: { name: string; at: THREE.Vector3 }[] = [];
      for (const c of people) {
        if (!c.rig.object.visible || !c.rig.object.parent) continue;
        const head = c.rig.jointPosition("Neck").add(new THREE.Vector3(0, 0.6, 0)), hip = c.rig.jointPosition("LowerTorso" as any) ?? c.rig.object.position.clone();
        if (cam.distanceTo(head) > 90) continue;
        const ndc = head.clone().project(camera), onScreen = Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && ndc.z < 1;
        // hidden: something solid between the camera and the face
        if (onScreen && !inCam) {
          const d = head.clone().sub(cam), dist = d.length(), h = ray(cam, d.normalize(), dist - 0.9);
          if (h) out.push({ kind: "hidden", who: c.name, what: h.name, amount: +(dist - h.toi).toFixed(1) });
        }
        // inside: probe points up the torso (solid colliders; trimesh walls are caught where they cross the spine)
        const neck = c.rig.jointPosition("Neck"), mid = hip.clone().lerp(neck, 0.5);
        const inside = solidAt(mid) ?? solidAt(neck.clone().lerp(mid, 0.3));
        if (inside) out.push({ kind: "inside", who: c.name, what: inside });
        // ground: what is under the hips, compared with where the character's feet were put
        // (groundRig records the contact: feet on the ground, or hips on a seat; otherwise the rig's root)
        const ct = c.rig.object.userData.contact as { ground: number; x: number; z: number } | undefined;
        const feet = ct?.ground ?? c.rig.object.position.y, from = new THREE.Vector3(ct?.x ?? hip.x, feet + 1.2, ct?.z ?? hip.z);
        if (!solidAt(from)) {
          // a soft surface (bed, sofa, pillow) should take the body in by about its `sink`; a hard one not at all
          const g = ray(from, new THREE.Vector3(0, -1, 0), 12), ground = g ? from.y - g.toi : -Infinity, gap = feet - ground;
          const sink = g ? surfaceOf(g.name, g.material).sink : 0;
          if (!g) out.push({ kind: "floating", who: c.name, what: "nothing below", amount: 12 });
          else if (gap > 0.45) out.push({ kind: "floating", who: c.name, what: g.name, amount: +gap.toFixed(2) });
          else if (gap < -(sink + 0.4)) out.push({ kind: "sunk", who: c.name, what: g.name, amount: +(-gap).toFixed(2) });
          else if (sink >= 0.2 && gap > -sink * 0.4) out.push({ kind: "stiff", who: c.name, what: g.name, amount: sink });
        }
        torsos.push({ name: c.name, at: mid });
      }
      for (let i = 0; i < torsos.length; i++) for (let j = i + 1; j < torsos.length; j++) {
        const a = torsos[i].at, b = torsos[j].at, flat = Math.hypot(a.x - b.x, a.z - b.z);
        if (flat < 1.5 && Math.abs(a.y - b.y) < 2.5) out.push({ kind: "overlap", who: torsos[i].name, what: torsos[j].name, amount: +flat.toFixed(2) });
      }
      return out;
    },
  };
}
export type Probe = ReturnType<typeof createProbe>;
