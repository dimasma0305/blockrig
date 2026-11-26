// Layered clothing fit: WrapLayer -> WrapTarget, the way Roblox fits a garment to a body.
//
// Every Roblox cage is cut from one template, and a cage vertex keeps its template UV, so a UV names the same
// spot on any cage. A body's WrapTarget cages (one per body part) and a garment's WrapLayer inner cage
// (ReferenceMeshId, made around the reference body) therefore correspond vertex by vertex through their UVs.
// Fitting moves every inner-cage vertex onto the body-cage vertex with the same UV and carries the garment mesh
// along: each garment vertex moves by the inverse-distance-weighted displacement of its nearest inner-cage
// vertices. The garment's outer cage (CageMeshId) moves the same way and becomes what the next layer (higher
// Order) fits to.

/** The template UV of a cage vertex, as a lookup key. */
export const cageKey = (u, v) => `${Math.round(u * 1e4)},${Math.round(v * 1e4)}`;

/**
 * A cage as a UV -> position map. `positions` (x, y, z per vertex) are offset by `origin` (and by `at`, e.g. a
 * body part's centre in character space) and scaled by `scale` first.
 */
export function cageMap(cage, { origin = [0, 0, 0], at = [0, 0, 0], scale = [1, 1, 1], into = new Map() } = {}) {
  const { positions: p, uvs } = cage, n = p.length / 3;
  for (let i = 0; i < n; i++) into.set(cageKey(uvs[i * 2], uvs[i * 2 + 1]), [at[0] + (p[i * 3] + origin[0]) * scale[0], at[1] + (p[i * 3 + 1] + origin[1]) * scale[1], at[2] + (p[i * 3 + 2] + origin[2]) * scale[2]]);
  return into;
}

// move points by the inverse-distance-weighted displacement of their k nearest anchors
function carry(points, anchors, disp, k, normals = null, push = 0) {
  const n = points.length / 3, m = anchors.length / 3, out = new Float32Array(points.length);
  const bestD = new Float64Array(k), bestI = new Int32Array(k);
  for (let i = 0; i < n; i++) {
    const x = points[i * 3], y = points[i * 3 + 1], z = points[i * 3 + 2];
    bestD.fill(Infinity); bestI.fill(-1);
    for (let j = 0; j < m; j++) {
      const dx = anchors[j * 3] - x, dy = anchors[j * 3 + 1] - y, dz = anchors[j * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz;
      if (d >= bestD[k - 1]) continue;
      let s = k - 1; while (s > 0 && bestD[s - 1] > d) { bestD[s] = bestD[s - 1]; bestI[s] = bestI[s - 1]; s--; }
      bestD[s] = d; bestI[s] = j;
    }
    let wx = 0, wy = 0, wz = 0, ws = 0;
    // weights 1/d^4 (bestD holds squared distances), so each vertex follows its nearest cage vertices closely
    for (let s = 0; s < k; s++) { const j = bestI[s]; if (j < 0) continue; const w = 1 / (bestD[s] * bestD[s] + 1e-9); wx += w * disp[j * 3]; wy += w * disp[j * 3 + 1]; wz += w * disp[j * 3 + 2]; ws += w; }
    const nx = normals ? normals[i * 3] * push : 0, ny = normals ? normals[i * 3 + 1] * push : 0, nz = normals ? normals[i * 3 + 2] * push : 0;
    out[i * 3] = x + (ws ? wx / ws : 0) + nx; out[i * 3 + 1] = y + (ws ? wy / ws : 0) + ny; out[i * 3 + 2] = z + (ws ? wz / ws : 0) + nz;
  }
  return out;
}

/**
 * Fit one layer to a target cage.
 * @param {Float32Array|number[]} positions the garment mesh's vertices (handle space)
 * @param {{ inner: {positions, uvs}, innerOrigin?: number[], outer?: {positions, uvs}, outerOrigin?: number[] }} layer
 *   the WrapLayer's inner cage (ReferenceMeshId + ReferenceOrigin) and outer cage (CageMeshId + CageOrigin)
 * @param {Map<string, number[]>} target what to fit to: the body's cages, or the layer below's outer cage
 * @param {{ k?: number, normals?: Float32Array|number[], inflate?: number }} [o] k: how many nearest cage vertices
 *   carry each garment vertex (default 6); inflate: push the garment out along its `normals` by this many studs
 *   (each layer a little more than the one below, so layers don't poke through each other or the body)
 * @returns {{ positions: Float32Array, target: Map<string, number[]>, matched: number }}
 *   the fitted vertices (in the target's space), the target for the next layer, and how many inner-cage
 *   vertices found a partner
 */
export function fitLayer(positions, layer, target, { k = 6, normals = null, inflate = 0 } = {}) {
  const inner = layer.inner, io = layer.innerOrigin || [0, 0, 0], n = inner.positions.length / 3;
  const anchors = [], disp = [];
  for (let i = 0; i < n; i++) {
    const t = target.get(cageKey(inner.uvs[i * 2], inner.uvs[i * 2 + 1])); if (!t) continue;
    const x = inner.positions[i * 3] + io[0], y = inner.positions[i * 3 + 1] + io[1], z = inner.positions[i * 3 + 2] + io[2];
    anchors.push(x, y, z); disp.push(t[0] - x, t[1] - y, t[2] - z);
  }
  const matched = anchors.length / 3;
  if (!matched) throw new Error("blockrig: the garment's inner cage shares no vertices with the target cage (different cage templates?)");
  const A = Float32Array.from(anchors), D = Float32Array.from(disp), kk = Math.min(k, matched);
  const fitted = carry(positions, A, D, kk, normals, inflate);
  const next = new Map(target);
  if (layer.outer) {
    const o = layer.outer, oo = layer.outerOrigin || [0, 0, 0], m = o.positions.length / 3, pts = new Float32Array(m * 3);
    for (let i = 0; i < m; i++) { pts[i * 3] = o.positions[i * 3] + oo[0]; pts[i * 3 + 1] = o.positions[i * 3 + 1] + oo[1]; pts[i * 3 + 2] = o.positions[i * 3 + 2] + oo[2]; }
    const moved = carry(pts, A, D, kk, null, 0);
    for (let i = 0; i < m; i++) next.set(cageKey(o.uvs[i * 2], o.uvs[i * 2 + 1]), [moved[i * 3], moved[i * 3 + 1], moved[i * 3 + 2]]);
  }
  return { positions: fitted, target: next, matched };
}
