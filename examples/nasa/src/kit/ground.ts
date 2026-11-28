// Ground layers: flat surfaces that lie on top of each other (grass, then soil, then a road, then a puddle) z-fight
// when two of them are at the same height, or so close the depth buffer can't tell them apart at a distance: the
// ground flickers. Every flat ground goes through layer(): it gets its own height step AND a polygon offset (which
// wins at any distance), and checkGround() refuses two overlapping surfaces on the same layer.
//
//   layer(mesh, 2)              // 0 = the base (big grass), higher numbers draw on top
//   checkGround(root)           // after building: throws "ground: x and y overlap on layer 1 (they would flicker)"
import * as THREE from "three";

export const LAYER_STEP = 0.04; // studs between layers (visible gaps start ~0.3; this is a sheet of paper)

/** Put a flat ground mesh on layer n: lifted n * LAYER_STEP above `base`, drawn over lower layers at any distance. */
export function layer<T extends THREE.Mesh>(mesh: T, n: number, base = 0): T {
  mesh.position.y = base + n * LAYER_STEP;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) { m.polygonOffset = true; m.polygonOffsetFactor = -n; m.polygonOffsetUnits = -4 * n; }
  mesh.userData.groundLayer = n; mesh.receiveShadow = true;
  return mesh;
}

/** Throw if two visible-or-switchable ground surfaces on the same layer overlap (they would flicker). */
export function checkGround(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const grounds: { name: string; n: number; box: THREE.Box3; y: number }[] = [];
  root.traverse((o: any) => {
    if (o.isMesh && o.userData.groundLayer !== undefined) {
      const box = new THREE.Box3().setFromObject(o);
      grounds.push({ name: o.userData.label ?? o.name ?? "ground", n: o.userData.groundLayer, box, y: (box.min.y + box.max.y) / 2 });
    }
  });
  const problems: string[] = [];
  for (let i = 0; i < grounds.length; i++) for (let j = i + 1; j < grounds.length; j++) {
    const a = grounds[i], b = grounds[j];
    if (Math.abs(a.y - b.y) > LAYER_STEP / 2) continue; // different heights (or layer bases): fine
    const ix = Math.min(a.box.max.x, b.box.max.x) - Math.max(a.box.min.x, b.box.min.x), iz = Math.min(a.box.max.z, b.box.max.z) - Math.max(a.box.min.z, b.box.min.z);
    if (ix > 0.01 && iz > 0.01) problems.push(`ground: "${a.name}" and "${b.name}" overlap on layer ${a.n} (${ix.toFixed(1)} x ${iz.toFixed(1)} studs): they would flicker; give one a higher layer (src/kit/ground.ts)`);
  }
  if (problems.length) throw new Error(problems.join("\n"));
}
