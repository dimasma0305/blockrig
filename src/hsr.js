// Hidden Surface Removal, as Roblox does for layered clothing: body surfaces that a garment covers are not drawn,
// so rigid body parts can't poke through the clothing when joints bend. A triangle is hidden when every one of its
// sample points (the centroid, plus each corner pulled slightly toward it) can see the garment within `maxDist`
// along the triangle's outward normal. Everything is in bind-pose character space.

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const at = (p, i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];

/**
 * Prepare an occluder (garment) for ray tests: its triangles with their bounding boxes.
 * @param {ArrayLike<number>} positions xyz per vertex
 * @param {ArrayLike<number>|null} index triangle indices (null = non-indexed)
 */
export function occluder(positions, index = null) {
  const n = index ? index.length / 3 : positions.length / 9, tris = new Float32Array(n * 9), box = new Float32Array(n * 6);
  for (let t = 0; t < n; t++) {
    for (let k = 0; k < 3; k++) {
      const v = index ? index[t * 3 + k] : t * 3 + k;
      for (let c = 0; c < 3; c++) tris[t * 9 + k * 3 + c] = positions[v * 3 + c];
    }
    for (let c = 0; c < 3; c++) {
      const a = tris[t * 9 + c], b = tris[t * 9 + 3 + c], d = tris[t * 9 + 6 + c];
      box[t * 6 + c] = Math.min(a, b, d); box[t * 6 + 3 + c] = Math.max(a, b, d);
    }
  }
  return { tris, box, count: n };
}

/** Join several occluders into one. */
export function mergeOccluders(list) {
  const count = list.reduce((s, o) => s + o.count, 0), tris = new Float32Array(count * 9), box = new Float32Array(count * 6);
  let t = 0;
  for (const o of list) { tris.set(o.tris, t * 9); box.set(o.box, t * 6); t += o.count; }
  return { tris, box, count };
}

// distance along the ray to the nearest occluder triangle (either side), or Infinity
function cast(occ, o, d, far) {
  let best = Infinity;
  const inv = [1 / d[0], 1 / d[1], 1 / d[2]];
  for (let t = 0; t < occ.count; t++) {
    // slab test against the triangle's box first
    let t0 = 0, t1 = Math.min(far, best);
    for (let c = 0; c < 3 && t0 <= t1; c++) {
      const lo = occ.box[t * 6 + c], hi = occ.box[t * 6 + 3 + c];
      if (!isFinite(inv[c])) { if (o[c] < lo - 1e-6 || o[c] > hi + 1e-6) t0 = Infinity; continue; }
      let a = (lo - o[c]) * inv[c], b = (hi - o[c]) * inv[c];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a - 1e-6); t1 = Math.min(t1, b + 1e-6);
    }
    if (t0 > t1) continue;
    // Moller-Trumbore
    const T = occ.tris, i = t * 9;
    const v0 = [T[i], T[i + 1], T[i + 2]], e1 = [T[i + 3] - v0[0], T[i + 4] - v0[1], T[i + 5] - v0[2]], e2 = [T[i + 6] - v0[0], T[i + 7] - v0[1], T[i + 8] - v0[2]];
    const p = cross(d, e2), det = dot(e1, p);
    if (Math.abs(det) < 1e-12) continue;
    const s = sub(o, v0), u = dot(s, p) / det;
    if (u < -1e-5 || u > 1 + 1e-5) continue;
    const q = cross(s, e1), v = dot(d, q) / det;
    if (v < -1e-5 || u + v > 1 + 1e-5) continue;
    const dist = dot(e2, q) / det;
    if (dist >= 0 && dist < best) best = dist;
  }
  return best;
}

/**
 * How many of a triangle's 4 sample points the occluder covers (0-4). a, b, c are [x, y, z].
 */
export function triangleCoverage(a, b, c, occ, { maxDist = 0.6, inset = 0.1 } = {}) {
  let nn = cross(sub(b, a), sub(c, a));
  const len = Math.hypot(nn[0], nn[1], nn[2]);
  if (len < 1e-12) return 4; // degenerate: nothing to draw anyway
  nn = nn.map((x) => x / len);
  const back = 0.02; // start just under the surface, so a garment lying on it still counts
  const m = [0, 1, 2].map((k) => (a[k] + b[k] + c[k]) / 3);
  let hits = 0;
  for (const s of [m, ...[a, b, c].map((p) => p.map((x, k) => x + (m[k] - x) * inset))]) {
    const o = s.map((x, k) => x - nn[k] * back);
    if (cast(occ, o, nn, maxDist + back) <= maxDist + back) hits++;
  }
  return hits;
}

/**
 * Which triangles of a surface the occluder covers.
 * @param {ArrayLike<number>} positions the surface's xyz per vertex
 * @param {ArrayLike<number>|null} index its triangle indices (null = non-indexed)
 * @param {{tris, box, count}} occ from occluder()
 * @param {{ maxDist?: number, inset?: number }} [o] maxDist: how far out the garment may sit (studs)
 * @returns {Uint8Array} 1 per covered triangle
 */
export function coveredTriangles(positions, index, occ, { maxDist = 0.6, inset = 0.1 } = {}) {
  const n = index ? index.length / 3 : positions.length / 9, out = new Uint8Array(n);
  if (!occ.count) return out;
  const back = 0.02; // start just under the surface, so a garment lying on it still counts
  for (let t = 0; t < n; t++) {
    const v = [0, 1, 2].map((k) => at(positions, index ? index[t * 3 + k] : t * 3 + k));
    let nn = cross(sub(v[1], v[0]), sub(v[2], v[0]));
    const len = Math.hypot(nn[0], nn[1], nn[2]);
    if (len < 1e-12) { out[t] = 1; continue; } // degenerate: nothing to draw anyway
    nn = nn.map((x) => x / len);
    const c = [0, 1, 2].map((k) => (v[0][k] + v[1][k] + v[2][k]) / 3);
    const samples = [c, ...v.map((p) => p.map((x, k) => x + (c[k] - x) * inset))];
    let all = true;
    for (const s of samples) {
      const o = s.map((x, k) => x - nn[k] * back);
      if (cast(occ, o, nn, maxDist + back) > maxDist + back) { all = false; break; }
    }
    out[t] = all ? 1 : 0;
  }
  return out;
}
