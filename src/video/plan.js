// A 2D blueprint of a location on the ground plane (x, z), drawn before anything becomes 3D: roads, sidewalks, lots,
// footprints, paths and "stage" areas where characters act and cameras look. Fixes "town layout must be realistic:
// objects placed by rules, not overlapping": trees never stand in a driveway, fences never cross a path, and nothing
// lands where the hero acts. Plain polygon maths in studs (no GIS library). BlockRig extra.
//
//   const plan = new Plan();
//   plan.zone("road", rect(0, 0, 15, 240));                   // keep-out: nothing is placed on it
//   const lot = plan.area("lot-R2", rect(40, 20, 54, 38));    // somewhere things may go
//   if (plan.place("house-R2", rect(48, 20, 22, 18, angle))) scene.add(house);   // false if it would overlap
//   for (const [x, z] of plan.scatter(lot, { count: 3, radius: 3, gap: 9, rng })) addTree(x, z);
//   plan.along([x0, z0], [x1, z1], 4.8)                        // fence posts / lamps along a line, skipping blocked spots
//   plan.conflicts()                                           // overlaps that were forced

/** A polygon on the ground plane: its ring of [x, z] points (studs), not closed. */
export const polygon = (pts) => ({ type: "polygon", points: pts.map(([x, z]) => [x, z]) });
/** A rectangle w (x) by d (z) centred on (cx, cz), turned like a three.js rotation.y of `angle`. */
export function rect(cx, cz, w, d, angle = 0) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return polygon([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => [cx + x * c + z * s, cz - x * s + z * c]));
}
/** A circle as an n-gon. */
export const circle = (cx, cz, r, n = 20) => polygon(Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cz + Math.sin((i / n) * Math.PI * 2) * r]));
/** A shape's ring of [x, z] points (for drawing it). */
export const points = (s) => s.points;

/** Is (x, z) inside the shape (or on its edge)? */
export function inside(s, x, z) {
  const p = s.points; let inn = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if (onSegment(x, z, xi, zi, xj, zj)) return true;
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inn = !inn;
  }
  return inn;
}
const EPS = 1e-9;
const cross = (ax, az, bx, bz, cx, cz) => (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
function onSegment(x, z, ax, az, bx, bz) {
  return Math.abs(cross(ax, az, bx, bz, x, z)) <= EPS * Math.max(1, Math.hypot(bx - ax, bz - az)) && x >= Math.min(ax, bx) - EPS && x <= Math.max(ax, bx) + EPS && z >= Math.min(az, bz) - EPS && z <= Math.max(az, bz) + EPS;
}
function segmentsMeet(a, b, c, d) {
  const d1 = cross(c[0], c[1], d[0], d[1], a[0], a[1]), d2 = cross(c[0], c[1], d[0], d[1], b[0], b[1]);
  const d3 = cross(a[0], a[1], b[0], b[1], c[0], c[1]), d4 = cross(a[0], a[1], b[0], b[1], d[0], d[1]);
  if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) return true;
  return onSegment(a[0], a[1], c[0], c[1], d[0], d[1]) || onSegment(b[0], b[1], c[0], c[1], d[0], d[1]) || onSegment(c[0], c[1], a[0], a[1], b[0], b[1]) || onSegment(d[0], d[1], a[0], a[1], b[0], b[1]);
}
const bbox = (s) => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of s.points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return [x0, x1, z0, z1]; };
/** Do two shapes overlap or touch? (any polygons, convex or not) */
export function intersects(a, b) {
  const [ax0, ax1, az0, az1] = bbox(a), [bx0, bx1, bz0, bz1] = bbox(b);
  if (ax1 < bx0 - EPS || bx1 < ax0 - EPS || az1 < bz0 - EPS || bz1 < az0 - EPS) return false;
  const p = a.points, q = b.points;
  for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) if (segmentsMeet(p[i], p[(i + 1) % p.length], q[j], q[(j + 1) % q.length])) return true;
  return inside(b, p[0][0], p[0][1]) || inside(a, q[0][0], q[0][1]);
}

export class Plan {
  constructor() { this.items = []; }
  blocked(shape, except = []) { return this.items.find((i) => i.kind !== "area" && !except.includes(i.name) && intersects(i.shape, shape)); }
  /** A keep-out zone (road, sidewalk, path, driveway, stage): nothing is placed on it. */
  zone(name, shape, color = "#e0564f") { this.items.push({ name, kind: "zone", shape, color }); return shape; }
  /** An area things may be placed in (a lot, a yard); not an obstacle itself. */
  area(name, shape, color = "#58a55c") { this.items.push({ name, kind: "area", shape, color }); return shape; }
  /** Is this footprint clear of zones and of everything placed so far (except the names given)? */
  free(shape, except = []) { return !this.blocked(shape, except); }
  /** Place a footprint if it is clear (or always with force: then conflicts() lists it). */
  place(name, shape, o = {}) {
    const hit = this.blocked(shape, o.except);
    if (hit && !o.force) return false;
    this.items.push({ name, kind: "footprint", shape, color: o.color ?? "#4f7fe0", except: o.except });
    return true;
  }
  /** Up to `count` spots inside `area` whose circle of `radius` is clear, at least `gap` apart (seeded rng). */
  scatter(area, o) {
    const [minX, maxX, minZ, maxZ] = bbox(area), out = [];
    for (let t = 0; t < (o.tries ?? 60) && out.length < o.count; t++) {
      const x = minX + o.rng() * (maxX - minX), z = minZ + o.rng() * (maxZ - minZ);
      if (!inside(area, x, z) || out.some(([a, b]) => Math.hypot(a - x, b - z) < (o.gap ?? o.radius * 2))) continue;
      const fp = circle(x, z, o.radius, 10);
      if (!this.free(fp)) continue;
      if (o.name) this.place(`${o.name}-${out.length}`, fp, { color: "#3c8a3c" });
      out.push([x, z]);
    }
    return out;
  }
  /** Points every `step` studs from a to b whose `radius` circle is clear (fences, lamps, hedges). */
  along(a, b, step, radius = 0.5) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(len / step), out = [];
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0.5, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      if (this.free(circle(x, z, radius, 8))) out.push([x, z]);
    }
    return out;
  }
  /** Footprints that overlap a zone or each other without being allowed to (placed with force). */
  conflicts() {
    const fps = this.items.filter((i) => i.kind === "footprint"), out = [];
    const allowed = (a, b) => a.except?.includes(b.name) || b.except?.includes(a.name);
    fps.forEach((a, i) => { for (const b of this.items) if (b !== a && b.kind !== "area" && (b.kind === "zone" || fps.indexOf(b) > i) && !allowed(a, b) && intersects(a.shape, b.shape)) out.push(`${a.name} overlaps ${b.name}`); });
    return out;
  }
}
