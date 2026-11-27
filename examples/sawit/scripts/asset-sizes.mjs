// Print the size (bounding box, in the file's units) of GLB models, to pick a scale and spacing before placing
// them. Reads only the glTF JSON (accessor min/max of POSITION, with node scales/translations applied roughly).
//   node scripts/asset-sizes.mjs assets/kenney/city-kit-suburban/building-type-a.glb assets/polypizza/*.glb
import fs from "node:fs";

function gltfJson(file) {
  const b = fs.readFileSync(file);
  if (b.toString("ascii", 0, 4) !== "glTF") return JSON.parse(b.toString("utf8")); // .gltf
  const len = b.readUInt32LE(12);
  return JSON.parse(b.toString("utf8", 20, 20 + len));
}
function size(file) {
  const j = gltfJson(file), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const visit = (ni, s = [1, 1, 1], t = [0, 0, 0]) => {
    const n = j.nodes[ni], sc = n.scale ?? [1, 1, 1], tr = n.translation ?? [0, 0, 0];
    const S = s.map((v, i) => v * sc[i]), T = t.map((v, i) => v + tr[i] * s[i]);
    if (n.mesh !== undefined) for (const p of j.meshes[n.mesh].primitives) {
      const a = j.accessors[p.attributes.POSITION];
      if (a?.min) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], T[i] + a.min[i] * S[i]); max[i] = Math.max(max[i], T[i] + a.max[i] * S[i]); }
    }
    for (const c of n.children ?? []) visit(c, S, T);
  };
  for (const r of j.scenes[j.scene ?? 0].nodes) visit(r);
  return { w: max[0] - min[0], h: max[1] - min[1], d: max[2] - min[2], minY: min[1], anims: (j.animations ?? []).map((a) => a.name) };
}
for (const f of process.argv.slice(2)) {
  try { const s = size(f); console.log(`${f.split("/").slice(-2).join("/").padEnd(48)} w ${s.w.toFixed(2)}  h ${s.h.toFixed(2)}  d ${s.d.toFixed(2)}  minY ${s.minY.toFixed(2)}${s.anims.length ? `  anims: ${s.anims.join(", ")}` : ""}`); }
  catch (e) { console.log(`${f}: ${e.message}`); }
}
