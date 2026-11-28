// The staging check: the world's solid things become Rapier colliders, and a frame is checked for the staging
// mistakes a viewer would notice:
//   camera-inside   the camera is inside a wall or prop (the frame goes blank or shows a wall's back)
//   hidden          a character the viewer looks at (mid-frame, within 30 studs) is hidden by a wall or prop
//   inside          a character's torso is inside a wall, prop or furniture
//   floating/sunk   a character's feet (or seated hips) are above, or deeper than the surface's softness into, what is
//                   below (surfaceOf: a bed or sofa gives ~0.3 studs, a floor nothing)
//   stiff           a character rests exactly on top of something soft (a bed should give a little)
//   overlap         two characters stand inside each other
// Run it inside the real render (same scene, poses, cameras), so it checks exactly what the video shows. Rebuild the
// probe for every shot from what is visible then (props that move or show only in some shots would otherwise leave
// ghost colliders), and `free()` the old one.
//
//   const R = await loadRapier(() => import("@dimforge/rapier3d-compat"))
//   const probe = createProbe(R, world.root)          // per shot
//   probe.check(camera, [{ name: "mom", rig }])       // -> [{ kind, who, what, amount }]
//
// Characters are not colliders (they are checked against the world). Objects with userData.noCollide (clouds,
// birds, weather, screens) are skipped; a Roblox map brings its own part boxes (userData.colliders from
// buildRobloxMap), which are solid, so "inside a wall" is caught even where a mesh would be hollow. Rapier is the
// caller's dependency (`@dimforge/rapier3d-compat`); BlockRig only takes its namespace. BlockRig extra.
import * as THREE from "three";
import { surfaceOf } from "./surfaces.js";

let rapier = null;
/** Rapier's WASM, loaded and initialised once: pass `() => import("@dimforge/rapier3d-compat")`. */
export function loadRapier(importer) {
  return (rapier ??= importer().then(async (m) => { const R = m.default ?? m; await R.init(); return R; }));
}

function label(o) {
  for (let x = o; x; x = x.parent) if (x.userData.label || x.userData.asset) return x.userData.label ?? x.userData.asset;
  return o?.name || "?";
}
const solidMaterial = (m) => m && !m.isShaderMaterial && !m.isPointsMaterial && (m.opacity ?? 1) >= 0.5 && m.visible !== false;
const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };

/** Colliders for everything visible under `root`, and `check(camera, people)` for one frame. */
export function createProbe(R, root) {
  const world = new R.World({ x: 0, y: 0, z: 0 }), names = new Map(), materials = new Map();
  root.updateMatrixWorld(true);
  const add = (desc, name, material) => { const h = world.createCollider(desc).handle; names.set(h, name); if (material != null) materials.set(h, material); };
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const visit = (o) => {
    if (o.userData.noCollide) return;
    const boxes = o.userData.colliders;
    if (boxes) { // a Roblox map: one solid box per part, named after its model
      if (!shown(o)) return;
      for (const b of boxes) {
        m.multiplyMatrices(o.matrixWorld, b.matrix).decompose(p, q, s);
        add(R.ColliderDesc.cuboid(Math.max(b.size[0] * s.x, 0.05) / 2, Math.max(b.size[1] * s.y, 0.05) / 2, Math.max(b.size[2] * s.z, 0.05) / 2).setTranslation(p.x, p.y, p.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }), b.name, b.material);
      }
      return;
    }
    if (o.isMesh && !o.isInstancedMesh && o.visible && (Array.isArray(o.material) ? o.material.some(solidMaterial) : solidMaterial(o.material)) && shown(o)) {
      const pos = o.geometry.attributes.position, n = pos.count, v = new Float32Array(n * 3), t = new THREE.Vector3();
      for (let i = 0; i < n; i++) { t.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); v[i * 3] = t.x; v[i * 3 + 1] = t.y; v[i * 3 + 2] = t.z; }
      const idx = o.geometry.index ? Uint32Array.from(o.geometry.index.array) : Uint32Array.from({ length: n }, (_, i) => i);
      if (idx.length >= 3) add(R.ColliderDesc.trimesh(v, idx), label(o));
    }
    for (const c of o.children) visit(c);
  };
  visit(root);
  world.step(); // builds the query structures

  const solidAt = (at) => { let hit = null; world.intersectionsWithPoint({ x: at.x, y: at.y, z: at.z }, (c) => { hit = names.get(c.handle) ?? "?"; return false; }); return hit; };
  const ray = (from, dir, max) => {
    const h = world.castRay(new R.Ray({ x: from.x, y: from.y, z: from.z }, { x: dir.x, y: dir.y, z: dir.z }), max, true);
    return h ? { toi: h.timeOfImpact ?? h.toi, name: names.get(h.collider.handle) ?? "?", material: materials.get(h.collider.handle) } : null;
  };

  return {
    free: () => world.free(),
    colliders: names.size,
    /** Is a point inside something solid? The collider's name, or null. */
    solidAt,
    /** Everything wrong in this frame. `people` are the characters placed in the scene (hidden ones are skipped). */
    check(camera, people) {
      camera.updateMatrixWorld(true);
      const out = [], cam = camera.getWorldPosition(new THREE.Vector3());
      const inCam = solidAt(cam); if (inCam) out.push({ kind: "camera-inside", who: "camera", what: inCam });
      const torsos = [];
      for (const c of people) {
        if (!c.rig.object.visible || !c.rig.object.parent) continue;
        const head = c.rig.jointPosition("Neck").add(new THREE.Vector3(0, 0.6, 0)), hip = c.rig.jointPosition("LowerTorso") ?? c.rig.object.position.clone();
        if (cam.distanceTo(head) > 90) continue;
        const ndc = head.clone().project(camera);
        // hidden: something solid between the camera and a face the viewer looks at (in the middle of the frame and
        // within 30 studs); a background extra passing behind a lamp post for a moment is normal
        const watched = Math.abs(ndc.x) < 0.7 && Math.abs(ndc.y) < 0.85 && ndc.z < 1 && cam.distanceTo(head) < 30;
        if (watched && !inCam) {
          const d = head.clone().sub(cam), dist = d.length(), h = ray(cam, d.normalize(), dist - 0.9);
          if (h) out.push({ kind: "hidden", who: c.name, what: h.name, amount: +(dist - h.toi).toFixed(1) });
        }
        // inside: probe points up the torso (solid colliders; trimesh walls are caught where they cross the spine)
        const neck = c.rig.jointPosition("Neck"), mid = hip.clone().lerp(neck, 0.5);
        const inside = solidAt(mid) ?? solidAt(neck.clone().lerp(mid, 0.3));
        if (inside) out.push({ kind: "inside", who: c.name, what: inside });
        // ground: what is under the hips, compared with where the character's feet were put (groundRig records the
        // contact: feet on the ground, or hips on a seat; otherwise the rig's root)
        const ct = c.rig.object.userData.contact;
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
