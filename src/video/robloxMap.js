// Draw a Roblox map or model (a Toolbox map, a place's Workspace) from a JSON part list: Parts, WedgeParts,
// CornerWedgeParts, balls and cylinders (`Part.Shape`), mesh modifiers (SpecialMesh / BlockMesh / CylinderMesh),
// MeshParts, Decals and Textures on faces, and PointLights / SpotLights, the way Roblox shows them. Plain parts are
// merged into one mesh per material (thousands of parts stay fast); the part colour rides in vertex colours and the
// Roblox `Material` picks a look (roughness, metalness, neon, glass) and optionally a PBR surface the caller supplies,
// so a map keeps its own colours with real surface detail.
//
//   const map = buildRobloxMap(data, { meshes, images, pbr: (set) => material })
//   scene.add(map.group)          // studs, Roblox axes (the same as three.js: Y up)
//   map.find(/bed/i)              // Box3 around the parts whose name or model matches: place characters with it
//   map.group.userData.colliders  // one solid box per visible part, for createProbe (the staging check)
//
// Unions (CSG, `UnionOperation`) carry no geometry in the file and are drawn as their bounding box: fine for walls
// and trims, wrong for L-shaped desks, arches and hollow shapes. A desk or table top union that furniture pokes up
// through (nasa: an L-shaped desk top drawn as one box covered the gaming chair and trapped the hero in its collider)
// is trimmed by default to the largest rectangle of its top that clears the furniture (listed in `map.dropped`);
// `unions: "skip"` leaves such unions out, `unions: "box"` keeps every union as its box.
// Docs: https://create.roblox.com/docs/reference/engine/classes/BasePart , .../enums/NormalId , .../enums/Material
import * as THREE from "three";
import { cframeToMatrix } from "../cframe.js";
import { lodIndices } from "../mesh.js";

// Roblox Material enum -> how it looks. `set` names a PBR set the caller's `pbr(set)` returns; `tile` is studs per repeat.
const LOOKS = {
  256: { rough: 0.75 }, 272: { rough: 0.45 }, 288: { rough: 1, neon: true },                                   // Plastic, SmoothPlastic, Neon
  512: { set: "planks", tile: 8, rough: 0.8 }, 528: { set: "planks", tile: 6, rough: 0.8 },                       // Wood, WoodPlanks
  784: { set: "concrete", tile: 12, rough: 0.35 }, 788: { set: "concrete", tile: 8, rough: 0.9 }, 800: { set: "concrete", tile: 8, rough: 0.85 },
  804: { set: "concrete", tile: 8, rough: 0.9 }, 816: { set: "concrete", tile: 10, rough: 0.95 }, 820: { set: "concrete", tile: 10, rough: 0.9 },
  832: { set: "concrete", tile: 8, rough: 0.6 }, 836: { set: "concrete", tile: 8, rough: 0.9 }, 848: { set: "concrete", tile: 6, rough: 0.95 },
  864: { set: "concrete", tile: 4, rough: 0.95 }, 880: { set: "concrete", tile: 6, rough: 0.95 }, 896: { set: "concrete", tile: 10, rough: 0.95 },
  912: { set: "concrete", tile: 10, rough: 0.95 },
  1040: { rough: 0.7, metal: 0.5 }, 1056: { rough: 0.35, metal: 0.8 }, 1072: { rough: 0.25, metal: 0.9 }, 1088: { rough: 0.4, metal: 0.7 },
  1280: { set: "grass", tile: 8, rough: 1 }, 1284: { set: "grass", tile: 8, rough: 1 }, 1296: { rough: 1 }, 1312: { rough: 1 },
  1328: { rough: 0.9 }, 1344: { rough: 1 }, 1360: { rough: 1 }, 1376: { set: "asphalt", tile: 12, rough: 0.95 },
  1536: { rough: 0.15, glass: true }, 1552: { rough: 0.2 }, 1568: { rough: 0.05, glass: true },                   // Ice, Glacier, Glass
};
/** How a Roblox Material enum value is drawn: `{ rough, metal?, neon?, glass?, set?, tile? }`. */
export const materialLook = (m) => LOOKS[m] ?? { rough: 0.75 };

// ---- shapes, in part-local studs, centred on the part origin
function wedge(sx, sy, sz) {
  // Roblox WedgePart: full at the bottom and the back (+Z), the slope faces the front (-Z)
  const s = new THREE.Shape([new THREE.Vector2(-sz / 2, -sy / 2), new THREE.Vector2(sz / 2, -sy / 2), new THREE.Vector2(sz / 2, sy / 2)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: sx, bevelEnabled: false });
  g.rotateY(-Math.PI / 2); g.translate(sx / 2, 0, 0); // extrude along X; shape x -> part z
  return g;
}
function cornerWedge(sx, sy, sz) {
  const x = sx / 2, y = sy / 2, z = sz / 2;
  const v = [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], [x, y, -z]];
  // the peak stands over the +X/-Z corner; counter-clockwise from outside, so the faces are not culled
  const f = [[0, 1, 2], [0, 2, 3], [4, 2, 1], [4, 1, 0], [4, 0, 3], [4, 3, 2]];
  const pos = []; for (const t of f) for (const i of t) pos.push(...v[i]);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
const cylinderX = (len, r) => new THREE.CylinderGeometry(r, r, len, 20).rotateZ(Math.PI / 2);

/** The part's own shape (no file mesh), in part-local studs. `Part.Shape`: Ball = 0, Block = 1, Cylinder = 2 (along X). */
export function partGeometry(p) {
  const [sx, sy, sz] = p.size, m = p.modifier;
  if (m && m.type !== 5) {
    const s = [sx * m.scale[0], sy * m.scale[1], sz * m.scale[2]];
    let g;
    switch (m.type) {
      case 6: g = new THREE.BoxGeometry(s[0], s[1], s[2]); break;                                                // Brick / BlockMesh
      case -4: g = new THREE.CylinderGeometry(0.5, 0.5, 1, 20).scale(Math.min(s[0], s[2]), s[1], Math.min(s[0], s[2])); break; // CylinderMesh: upright
      case 4: g = cylinderX(s[0], Math.min(s[1], s[2]) / 2); break;                                             // SpecialMesh Cylinder: along X
      case 3: g = new THREE.SphereGeometry(0.5, 20, 14).scale(s[0], s[1], s[2]); break;                         // Sphere: stretched
      case 2: g = wedge(s[0], s[1], s[2]); break;                                                               // Wedge
      case 0: g = new THREE.CylinderGeometry(0.5, 0.5, 1, 20).scale(s[0], s[1], s[2]); break;                   // Head: a rounded cylinder
      default: g = new THREE.BoxGeometry(s[0], s[1], s[2]);
    }
    return g.translate(m.offset[0], m.offset[1], m.offset[2]);
  }
  if (p.cls === "WedgePart") return wedge(sx, sy, sz);
  if (p.cls === "CornerWedgePart") return cornerWedge(sx, sy, sz);
  if (p.shape === 0) return new THREE.SphereGeometry(Math.min(sx, sy, sz) / 2, 20, 14);
  if (p.shape === 2) return cylinderX(sx, Math.min(sy, sz) / 2);
  return new THREE.BoxGeometry(sx, sy, sz);
}

// UVs in studs (box-projected by each face's normal) so a surface tiles at the same size on every part
function studUVs(g, tile) {
  const pos = g.attributes.position, nor = g.attributes.normal, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i)), x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const [u, v] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y];
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// non-indexed geometries with position, normal, uv and color -> one geometry (works on every three.js release)
function merge(geoms) {
  const names = ["position", "normal", "uv", "color"], out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = geoms[0].attributes[n].itemSize, total = geoms.reduce((a, g) => a + g.attributes[n].count * size, 0), arr = new Float32Array(total);
    let o = 0; for (const g of geoms) { arr.set(g.attributes[n].array, o); o += g.attributes[n].count * size; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

function fileMesh(mesh) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(mesh.positions), 3));
  if (mesh.normals?.length && mesh.normals.some((v) => v !== 0)) g.setAttribute("normal", new THREE.BufferAttribute(Float32Array.from(mesh.normals), 3));
  if (mesh.uvs?.length) g.setAttribute("uv", new THREE.BufferAttribute(Float32Array.from(mesh.uvs), 2));
  g.setIndex(new THREE.BufferAttribute(Uint32Array.from(lodIndices(mesh, 0)), 1));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

/** A thin plane on a part face for a Decal or Texture. `NormalId`: Right = 0 (+X), Top = 1 (+Y), Back = 2 (+Z),
 *  Left = 3 (-X), Bottom = 4 (-Y), Front = 5 (-Z). Returns the plane and its size in studs. */
export function facePlane(size, face) {
  const [sx, sy, sz] = size, e = 0.012;
  const dims = [[sz, sy], [sx, sz], [sx, sy], [sz, sy], [sx, sz], [sx, sy]][face] ?? [sx, sy];
  const g = new THREE.PlaneGeometry(dims[0], dims[1]);
  if (face === 0) g.rotateY(Math.PI / 2).translate(sx / 2 + e, 0, 0);
  else if (face === 3) g.rotateY(-Math.PI / 2).translate(-sx / 2 - e, 0, 0);
  else if (face === 1) g.rotateX(-Math.PI / 2).translate(0, sy / 2 + e, 0);
  else if (face === 4) g.rotateX(Math.PI / 2).translate(0, -sy / 2 - e, 0);
  else if (face === 2) g.translate(0, 0, sz / 2 + e);
  else g.rotateY(Math.PI).translate(0, 0, -sz / 2 - e);
  return { g, dims };
}

// A PBR set's colour map as grey grain around 0.5 (so `color * 2` keeps the part's colour on average), with its
// contrast lifted a little: Roblox materials tint one texture by the part's colour the same way. Browser only.
const grains = new WeakMap();
function grain(map) {
  const img = map.image;
  if (!img || !img.width || typeof document === "undefined") return null;
  const cached = grains.get(img); if (cached) return cached;
  const size = 512, c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0, size, size);
  const d = g.getImageData(0, 0, size, size), px = d.data; let mean = 0;
  for (let i = 0; i < px.length; i += 4) mean += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
  mean /= px.length / 4;
  for (let i = 0; i < px.length; i += 4) {
    const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2], v = Math.max(0, Math.min(255, 128 + (l - mean) * 1.4));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace;
  grains.set(img, t); return t;
}
const toLinear = (c) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);

/**
 * @param {{ parts: object[], lights: object[] }} data the part list (see index.d.ts `MapPart`)
 * @param {{ meshes: Record<string, any>, images: Record<string, any>, pbr?: (set: string) => THREE.MeshStandardMaterial }} assets
 *   parsed `.mesh` files and loaded images by asset id; `pbr(set)` gives normal / roughness / colour maps for a look's set
 * @param {{ maxLights?: number, lightScale?: number, shadows?: boolean, skip?: (part: object) => boolean }} [o]
 */
const isUnion = (p) => p.cls === "UnionOperation" || p.union != null;
const partBox = (p) => new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(...p.size)).applyMatrix4(cframeToMatrix(p.cframe, new THREE.Matrix4()));
// a desk / table top union (flat slab) and, in its own frame, the footprint of each other model passing up through it
function piercings(u, solid) {
  const [sx, sy, sz] = u.size, r = u.cframe.rot;
  if (!(sy <= 0.6 && sy < Math.min(sx, sz) && Math.max(sx, sz) <= 16 && Math.abs(r[4]) > 0.99)) return null; // a flat slab
  const inv = cframeToMatrix(u.cframe, new THREE.Matrix4()).invert(), local = new THREE.Vector3(), corner = new THREE.Vector3();
  const top = u.cframe.pos[1] + sy / 2, model = u.model ?? null, by = new Map();
  for (const { p, box, c } of solid) {
    const m = p.model ?? null; if (m === model) continue;
    local.copy(c).applyMatrix4(inv);
    if (!(Math.abs(local.x) < sx / 2 && Math.abs(local.z) < sz / 2 && box.min.y < top && box.max.y > top + 0.2)) continue;
    let f = by.get(m); if (!f) by.set(m, (f = { n: 0, x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }));
    f.n++;
    for (const cx of [box.min.x, box.max.x]) for (const cz of [box.min.z, box.max.z]) { corner.set(cx, top, cz).applyMatrix4(inv); f.x0 = Math.min(f.x0, corner.x); f.x1 = Math.max(f.x1, corner.x); f.z0 = Math.min(f.z0, corner.z); f.z1 = Math.max(f.z1, corner.z); }
  }
  return [...by.values()].filter((f) => f.n >= 2);
}
const solidParts = (parts) => parts.filter((p) => !isUnion(p) && p.transparency < 0.98 && Math.min(...p.size) >= 0.4).map((p) => { const box = partBox(p); return { p, box, c: box.getCenter(new THREE.Vector3()) }; });

/**
 * Unions that swallow furniture: a desk or table top that is a union (a flat slab at most 0.6 studs thick and 16
 * studs across) with two or more solid parts of one other model passing up through it inside its footprint. Drawn
 * as one box, an L-shaped desk top covers the chair standing in its corner (nasa). Walls, roofs and dormers (unions
 * with windows set in them) are never matched. Returns those union parts.
 */
export function swallowingUnions(parts) {
  const solid = solidParts(parts);
  return parts.filter((u) => isUnion(u) && piercings(u, solid)?.length);
}

/**
 * The stand-in for a swallowing slab: the largest rectangle of its top that clears the furniture passing through it
 * (one arm of an L-shaped desk), as a plain part in the same frame; null when nothing useful (under 1 stud) is left.
 */
export function trimUnion(u, parts) {
  const fs = piercings(u, solidParts(parts)); if (!fs?.length) return null;
  const [sx, sy, sz] = u.size, gap = 0.1;
  const x0 = Math.min(...fs.map((f) => f.x0)) - gap, x1 = Math.max(...fs.map((f) => f.x1)) + gap, z0 = Math.min(...fs.map((f) => f.z0)) - gap, z1 = Math.max(...fs.map((f) => f.z1)) + gap;
  const cands = [[-sx / 2, Math.max(-sx / 2, x0), -sz / 2, sz / 2], [Math.min(sx / 2, x1), sx / 2, -sz / 2, sz / 2], [-sx / 2, sx / 2, -sz / 2, Math.max(-sz / 2, z0)], [-sx / 2, sx / 2, Math.min(sz / 2, z1), sz / 2]];
  const [a, b, c, d] = cands.sort((p, q) => (q[1] - q[0]) * (q[3] - q[2]) - (p[1] - p[0]) * (p[3] - p[2]))[0];
  if (b - a < 1 || d - c < 1) return null;
  const r = u.cframe.rot, lx = (a + b) / 2, lz = (c + d) / 2;
  const pos = [u.cframe.pos[0] + r[0] * lx + r[2] * lz, u.cframe.pos[1] + r[3] * lx + r[5] * lz, u.cframe.pos[2] + r[6] * lx + r[8] * lz];
  const { union, ...rest } = u;
  return { ...rest, cls: "Part", shape: 1, name: `${u.name ?? "Union"} (trimmed)`, size: [b - a, sy, d - c], cframe: { rot: r, pos } };
}

export function buildRobloxMap(data, assets, o = {}) {
  const group = new THREE.Group(); group.name = "roblox-map";
  // desk and table tops drawn as one box over the furniture standing in them: trimmed to the part that clears it
  // ("trim", the default), left out ("skip"), or kept as boxes ("box")
  const mode = o.unions ?? "trim", dropped = mode === "box" ? [] : swallowingUnions(data.parts), drop = new Set(dropped);
  const standIns = dropped.map((u) => (mode === "trim" ? trimUnion(u, data.parts) : null));
  if (dropped.length && o.warn !== false) console.warn(`roblox map: ${mode === "trim" ? "trimmed" : "left out"} ${dropped.length} union(s) drawn as boxes over furniture: ${dropped.map((p) => `${p.model ?? "?"}/${p.name ?? "Union"}`).join(", ")}`);
  const shadows = o.shadows ?? true, boxes = [], colliders = [];
  const buckets = new Map(), texCache = new Map();
  const texture = (id, mesh) => {
    if (id == null) return undefined; const img = assets.images?.[String(id)]; if (!img) return undefined;
    const k = `${id}|${mesh}`; let t = texCache.get(k);
    if (!t) { t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.flipY = !mesh; t.anisotropy = 8; t.needsUpdate = true; texCache.set(k, t); }
    return t;
  };
  const add = (key, g, lk, opacity) => { let b = buckets.get(key); if (!b) buckets.set(key, (b = { geoms: [], look: lk, opacity })); b.geoms.push(g); };

  for (const p of [...data.parts.filter((q) => !drop.has(q)), ...standIns.filter(Boolean)]) {
    if (o.skip?.(p)) continue;
    const lk = materialLook(p.material), matrix = cframeToMatrix(p.cframe, new THREE.Matrix4());
    const opacity = lk.glass ? Math.min(1 - p.transparency, 0.45) : 1 - p.transparency;
    const visible = p.transparency < 0.98;
    const fileId = p.cls === "MeshPart" ? p.mesh : p.modifier?.type === 5 ? p.modifier.mesh : undefined;
    if (visible && fileId != null) {
      // a file mesh: its own mesh, with its texture when it has one
      const src = assets.meshes?.[String(fileId)];
      if (src) {
        const g = fileMesh(src); g.computeBoundingBox();
        if (p.cls === "MeshPart") {
          // a MeshPart's mesh is fitted to its Size
          const bb = g.boundingBox, size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
          g.translate(-c.x, -c.y, -c.z).scale(p.size[0] / (size.x || 1), p.size[1] / (size.y || 1), p.size[2] / (size.z || 1));
        } else { const m = p.modifier; g.scale(m.scale[0], m.scale[1], m.scale[2]).translate(m.offset[0], m.offset[1], m.offset[2]); }
        const texId = p.cls === "MeshPart" ? p.texture : p.modifier?.texture, map = texture(texId, true);
        const tint = map ? (p.modifier ? p.modifier.vertexColor : [1, 1, 1]) : p.color;
        const mat = new THREE.MeshStandardMaterial({ color: toLinear(tint), map: map ?? null, roughness: lk.rough, metalness: lk.metal ?? 0, transparent: opacity < 1 || !!map, opacity, alphaTest: map ? 0.3 : 0, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(g, mat); mesh.applyMatrix4(matrix); mesh.castShadow = shadows; mesh.receiveShadow = true; mesh.name = p.name ?? "MeshPart";
        group.add(mesh);
      }
    } else if (visible) {
      const g0 = partGeometry(p); if (!g0) continue;
      const g = g0.index ? g0.toNonIndexed() : g0; if (!g.attributes.normal) g.computeVertexNormals();
      studUVs(g, lk.tile ?? 8);
      const c = toLinear(p.color), col = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < col.length; i += 3) { col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b; }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.applyMatrix4(matrix);
      const q = Math.round(opacity * 10) / 10;
      add(`${lk.neon ? "neon" : p.material}|${q}`, g, lk, q);
    }
    // decals and textures: a thin plane on the face
    for (const d of p.decals ?? []) {
      const map = texture(d.image, false); if (!map) continue;
      const { g, dims } = facePlane(p.size, d.face); let tex = map;
      if (d.cls === "Texture") { tex = map.clone(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(dims[0] / (d.studsU || 2), dims[1] / (d.studsV || 2)); tex.offset.set(d.offsetU / (d.studsU || 2), d.offsetV / (d.studsV || 2)); tex.needsUpdate = true; }
      const mat = new THREE.MeshStandardMaterial({ map: tex, color: toLinear(d.color), transparent: true, opacity: 1 - d.transparency, alphaTest: 0.05, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const mesh = new THREE.Mesh(g, mat); mesh.applyMatrix4(matrix); mesh.receiveShadow = true; mesh.renderOrder = 1; group.add(mesh);
    }
    const bb = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(...p.size)).applyMatrix4(matrix);
    boxes.push({ box: bb, part: p });
    // solid boxes for the staging check, like Roblox's own collisions: one per visible part
    if (p.transparency <= 0.3) colliders.push({ size: p.size, matrix, name: p.model && p.model !== "Model" ? `${p.model}/${p.name ?? "part"}` : p.name ?? p.cls, material: p.material });
  }

  // one mesh per material bucket
  for (const [key, b] of buckets) {
    const g = merge(b.geoms);
    let mat;
    if (b.look.neon) mat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) });
    else {
      const sm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.look.rough, metalness: b.look.metal ?? 0, transparent: b.opacity < 1, opacity: b.opacity, depthWrite: b.opacity >= 0.6 });
      if (b.look.set && assets.pbr) {
        try {
          const src = assets.pbr(b.look.set);
          sm.normalMap = src.normalMap; sm.normalScale.set(1.3, 1.3); sm.roughnessMap = src.roughnessMap;
          if (sm.normalMap) sm.normalMap.repeat.set(1, 1); if (sm.roughnessMap) sm.roughnessMap.repeat.set(1, 1);
          // the texture's grain without its colour: the part keeps its Roblox colour, the surface reads as brick or wood
          const detail = src.map && grain(src.map); if (detail) { sm.map = detail; sm.color.setScalar(2); }
        } catch { /* the set is not in the caller's asset list */ }
      }
      mat = sm;
    }
    const mesh = new THREE.Mesh(g, mat); mesh.name = `parts:${key}`; mesh.castShadow = shadows && b.opacity > 0.5; mesh.receiveShadow = true;
    group.add(mesh);
  }

  // lights: the brightest few (every light costs shader time), as point lights or spots facing their face
  const lights = [...(data.lights ?? [])].sort((a, b) => b.brightness * b.range - a.brightness * a.range).slice(0, o.maxLights ?? 6);
  for (const l of lights) {
    const k = (o.lightScale ?? 1) * l.brightness * 6, c = new THREE.Color(l.color[0], l.color[1], l.color[2]);
    const light = l.cls === "PointLight" ? new THREE.PointLight(c, k, l.range * 1.5, 1.2) : new THREE.SpotLight(c, k * 1.5, l.range * 1.5, THREE.MathUtils.degToRad(Math.min(l.angle, 170) / 2), 0.5, 1.2);
    light.position.set(l.at[0], l.at[1], l.at[2]);
    if (light.isSpotLight) {
      const dirs = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1]], d = new THREE.Vector3(...(dirs[l.face] ?? [0, -1, 0]));
      const r = l.rot; d.set(r[0] * d.x + r[1] * d.y + r[2] * d.z, r[3] * d.x + r[4] * d.y + r[5] * d.z, r[6] * d.x + r[7] * d.y + r[8] * d.z);
      light.target.position.copy(light.position).addScaledVector(d, 4); group.add(light.target);
    }
    group.add(light);
  }

  const all = new THREE.Box3(); for (const b of boxes) all.union(b.box);
  group.userData.box = all; group.userData.colliders = colliders;
  return {
    group, box: all, colliders,
    /** Unions left out because their box swallowed furniture (draw a stand-in where it matters): `{ part, box }`. */
    dropped: dropped.map((part, i) => ({ part, box: partBox(part), standIn: standIns[i] })),
    /** Box around every part whose name or model name matches. */
    find(re) { const out = new THREE.Box3(); for (const b of boxes) if (re.test(b.part.name ?? "") || re.test(b.part.model ?? "")) out.union(b.box); return out; },
    /** Model (or part) names with their part counts, most parts first. */
    names() { const s = new Map(); for (const b of boxes) { const n = b.part.model ?? b.part.name ?? "?"; s.set(n, (s.get(n) ?? 0) + 1); } return [...s].sort((a, b) => b[1] - a[1]); },
  };
}
