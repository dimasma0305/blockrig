// Ground layers: flat surfaces lying on each other (grass, then soil, then a road, then a puddle) z-fight when two
// are at the same height, or so close the depth buffer can't tell them apart at a distance: the ground flickers.
// Every flat ground goes through layer(): its own height step AND a polygon offset (which wins at any distance), and
// checkGround() lists two overlapping surfaces on the same layer. BlockRig extra.
//
//   layer(mesh, 2)              // 0 = the base (big grass), higher numbers draw on top
//   checkGround(root)           // after building: [] or ["ground: x and y overlap on layer 1 ..."]
import * as THREE from "three";

export const LAYER_STEP = 0.04; // studs between layers (visible gaps start ~0.3; this is a sheet of paper)

/** Put a flat ground mesh on layer n: lifted n * LAYER_STEP above `base`, drawn over lower layers at any distance. */
export function layer(mesh, n, base = 0) {
  mesh.position.y = base + n * LAYER_STEP;
  for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { m.polygonOffset = true; m.polygonOffsetFactor = -n; m.polygonOffsetUnits = -4 * n; }
  mesh.userData.groundLayer = n; mesh.receiveShadow = true;
  return mesh;
}

/** Ground surfaces on the same layer that overlap (they would flicker): a list of messages, empty when fine. */
export function groundConflicts(root) {
  root.updateMatrixWorld(true);
  const grounds = [];
  root.traverse((o) => {
    if (o.isMesh && o.userData.groundLayer !== undefined) {
      const box = new THREE.Box3().setFromObject(o);
      grounds.push({ name: o.userData.label ?? (o.name || "ground"), n: o.userData.groundLayer, box, y: (box.min.y + box.max.y) / 2 });
    }
  });
  const out = [];
  for (let i = 0; i < grounds.length; i++) for (let j = i + 1; j < grounds.length; j++) {
    const a = grounds[i], b = grounds[j];
    if (Math.abs(a.y - b.y) > LAYER_STEP / 2) continue; // different heights (or layer bases): fine
    const ix = Math.min(a.box.max.x, b.box.max.x) - Math.max(a.box.min.x, b.box.min.x), iz = Math.min(a.box.max.z, b.box.max.z) - Math.max(a.box.min.z, b.box.min.z);
    if (ix > 0.01 && iz > 0.01) out.push(`ground: "${a.name}" and "${b.name}" overlap on layer ${a.n} (${ix.toFixed(1)} x ${iz.toFixed(1)} studs): they would flicker; give one a higher layer`);
  }
  return out;
}
/** Throw if any ground surfaces would flicker (see groundConflicts). */
export function checkGround(root) { const p = groundConflicts(root); if (p.length) throw new Error(p.join("\n")); }
