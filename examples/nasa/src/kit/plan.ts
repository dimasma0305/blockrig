// A 2D blueprint of a location on the ground plane (x, z), drawn with Turf before anything becomes 3D:
// roads, sidewalks, lots, footprints, paths and "stage" areas where characters act and cameras look.
//   const plan = new Plan();
//   plan.zone("road", rect(0, 0, 15, 240));                  // keep-out: nothing is placed on it
//   const lot = plan.area("lot-R2", rect(40, 20, 54, 38));   // somewhere things may go
//   if (plan.place("house-R2", rect(48, 20, 22, 18, angle))) scene.add(house);   // false if it would overlap
//   for (const [x, z] of plan.scatter(lot, { count: 3, radius: 3, gap: 9, rng })) addTree(x, z);
//   plan.along([x0, z0], [x1, z1], 4.8)                       // fence posts / lamps along a line, skipping blocked spots
// Every footprint is checked against the keep-out zones and everything already placed, so trees never stand in a
// driveway, fences never cross a path, and nothing lands where the hero acts. `plan.conflicts()` lists overlaps
// (forced placements), and PlanLab (debug composition) draws the plan over the real town from above.
// Coordinates are studs; Turf sees them scaled to small degrees near (0, 0), where its math is effectively flat.
import { polygon, point, booleanIntersects, booleanPointInPolygon } from "@turf/turf";
import type { Feature, Polygon } from "geojson";

const S = 1e-3; // studs -> degrees for Turf
export type Shape = Feature<Polygon>;
export type Item = { name: string; kind: "zone" | "area" | "footprint"; shape: Shape; color?: string; except?: string[] };

const ring = (pts: [number, number][]) => { const r = pts.map(([x, z]) => [x * S, z * S]); r.push(r[0]); return r; };
/** A rectangle w (x) by d (z) centred on (cx, cz), turned like a three.js rotation.y of `angle`. */
export function rect(cx: number, cz: number, w: number, d: number, angle = 0): Shape {
  const c = Math.cos(angle), s = Math.sin(angle);
  const pts: [number, number][] = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => [cx + x * c + z * s, cz - x * s + z * c]);
  return polygon([ring(pts)]);
}
export function circle(cx: number, cz: number, r: number, n = 20): Shape {
  return polygon([ring(Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cz + Math.sin((i / n) * Math.PI * 2) * r] as [number, number]))]);
}
/** The plan coordinates of a shape's ring (studs), e.g. for drawing it. */
export const points = (s: Shape) => s.geometry.coordinates[0].map(([x, z]) => [x / S, z / S] as [number, number]);
export const inside = (s: Shape, x: number, z: number) => booleanPointInPolygon(point([x * S, z * S]), s);

export class Plan {
  items: Item[] = [];
  private blocked = (shape: Shape, except: string[] = []) => this.items.find((i) => i.kind !== "area" && !except.includes(i.name) && booleanIntersects(i.shape, shape));
  /** A keep-out zone (road, sidewalk, path, driveway, stage): nothing is placed on it. */
  zone(name: string, shape: Shape, color = "#e0564f") { this.items.push({ name, kind: "zone", shape, color }); return shape; }
  /** An area things may be placed in (a lot, a yard); not an obstacle itself. */
  area(name: string, shape: Shape, color = "#58a55c") { this.items.push({ name, kind: "area", shape, color }); return shape; }
  /** Is this footprint clear of zones and of everything placed so far (except the names given)? */
  free(shape: Shape, except: string[] = []) { return !this.blocked(shape, except); }
  /** Place a footprint if it is clear (or always with force: then it is listed by conflicts()). */
  place(name: string, shape: Shape, o: { force?: boolean; except?: string[]; color?: string } = {}) {
    const hit = this.blocked(shape, o.except);
    if (hit && !o.force) return false;
    this.items.push({ name, kind: "footprint", shape, color: o.color ?? "#4f7fe0", except: o.except });
    return true;
  }
  /** Up to `count` spots inside `area` whose circle of `radius` is clear, at least `gap` apart (seeded rng). */
  scatter(area: Shape, o: { count: number; radius: number; gap?: number; rng: () => number; tries?: number; name?: string }) {
    const xs = points(area), minX = Math.min(...xs.map((p) => p[0])), maxX = Math.max(...xs.map((p) => p[0])), minZ = Math.min(...xs.map((p) => p[1])), maxZ = Math.max(...xs.map((p) => p[1]));
    const out: [number, number][] = [];
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
  along(a: [number, number], b: [number, number], step: number, radius = 0.5) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(len / step), out: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0.5, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      if (this.free(circle(x, z, radius, 8))) out.push([x, z]);
    }
    return out;
  }
  /** Footprints that overlap a zone or each other without being allowed to (placed with force). */
  conflicts() {
    const fps = this.items.filter((i) => i.kind === "footprint"), out: string[] = [];
    const allowed = (a: Item, b: Item) => a.except?.includes(b.name) || b.except?.includes(a.name);
    fps.forEach((a, i) => { for (const b of this.items) if (b !== a && b.kind !== "area" && (b.kind === "zone" || fps.indexOf(b) > i) && !allowed(a, b) && booleanIntersects(a.shape, b.shape)) out.push(`${a.name} overlaps ${b.name}`); });
    return out;
  }
}
