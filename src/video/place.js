// Put characters on whatever is under them, by raycast: no hand-measured floor, seat or bed heights (the nasa video
// measured every seat by hand). surfaces(root) looks straight down through the world: Roblox maps by their part
// boxes (with their names and Materials), everything else by its meshes. placeOn() then rests the feet (or the hips,
// for ON_SEAT) on the surface, sunk in by its softness (restOn: a bed gives way, a floor doesn't). Plain three.js,
// no physics engine, frame-pure. BlockRig extra.
//
//   const ground = surfaces(world.root)                      // once (meshes are read where they are at query time)
//   placeOn(rig, ground, x, z)                               // standing on the floor, the lawn, a stage...
//   placeOn(rig, ground, x, z, ON_SEAT, { below: 4 })        // sitting on the sofa (the first surface under 4 studs)
import * as THREE from "three";
import { restOn } from "./surfaces.js";
import { groundRig, FEET } from "./pose.js";

const solid = (m) => m && !m.isShaderMaterial && !m.isPointsMaterial && !m.isSpriteMaterial && (m.opacity ?? 1) >= 0.5 && m.visible !== false;
const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
const labelOf = (o) => { for (let x = o; x; x = x.parent) if (x.userData.label || x.userData.asset) return x.userData.label ?? x.userData.asset; return o.name || "?"; };

/** A downward probe of the surfaces under `root` (Roblox map part boxes, and every visible solid mesh). */
export function surfaces(root) {
  const ray = new THREE.Ray(), down = new THREE.Vector3(0, -1, 0), raycaster = new THREE.Raycaster();
  const m = new THREE.Matrix4(), inv = new THREE.Matrix4(), box = new THREE.Box3(), hit = new THREE.Vector3(), lr = new THREE.Ray();
  return {
    /**
     * The highest surface under (x, z) at or below `below` (default: anything): `{ y, name, material, object }`, or
     * null. Roblox map parts are solid boxes, as Roblox collides them; meshes by their triangles.
     */
    at(x, z, { below = 1e4, skip } = {}) {
      root.updateMatrixWorld(true);
      ray.origin.set(x, below, z); ray.direction.copy(down);
      let best = null;
      const consider = (y, name, material, object) => { if (y <= below + 1e-6 && (!best || y > best.y)) best = { y, name, material, object }; };
      const meshes = [];
      root.traverse((o) => {
        if (o.userData.noCollide || !shown(o) || skip?.(o)) return;
        const boxes = o.userData.colliders;
        if (boxes) {
          for (const b of boxes) {
            m.multiplyMatrices(o.matrixWorld, b.matrix); inv.copy(m).invert();
            lr.copy(ray).applyMatrix4(inv);
            box.min.set(-b.size[0] / 2, -b.size[1] / 2, -b.size[2] / 2); box.max.set(b.size[0] / 2, b.size[1] / 2, b.size[2] / 2);
            // the top of the box where the ray meets it: enter point when starting above, else the box's top face
            if (lr.intersectBox(box, hit)) { hit.applyMatrix4(m); consider(hit.y, b.name, b.material, o); }
          }
          o.traverse((c) => { if (c !== o) c.userData.__inMap = true; });
          return;
        }
        if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !o.userData.__inMap && (Array.isArray(o.material) ? o.material.some(solid) : solid(o.material))) meshes.push(o);
      });
      root.traverse((o) => { delete o.userData.__inMap; });
      raycaster.set(ray.origin, down);
      for (const h of raycaster.intersectObjects(meshes, false)) { consider(h.point.y, labelOf(h.object), undefined, h.object); break; }
      return best;
    },
  };
}

/**
 * Rest a rig on the surface under (x, z): the feet (FEET) or other contacts (ON_SEAT: the hips) at the surface's top,
 * sunk by its softness. Places the rig at (x, z) first. Returns the surface, or null (then the rig stays where it is).
 */
export function placeOn(rig, ground, x, z, contacts = FEET, { below, skip } = {}) {
  rig.object.position.x = x; rig.object.position.z = z;
  const s = ground.at(x, z, { below, skip });
  if (!s) return null;
  groundRig(rig, restOn(s.y, s.name, s.material), contacts);
  return s;
}
