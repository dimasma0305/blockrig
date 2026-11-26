// Reader for the Roblox `.mesh` binary format, versions 2.00 – 7.00.
// Layout follows the community-maintained spec: https://devforum.roblox.com/t/roblox-mesh-format/326114
import { Reader, toBytes, latin1, utf8 } from "./binary.js";

/**
 * @typedef {{ name: string, parent: number, lodParent: number, culling: number,
 *             cframe: { rot: number[], pos: number[] } }} MeshBone
 * @typedef {{ version: string, vertexCount: number, faceCount: number,
 *             positions: Float32Array, normals: Float32Array, uvs: Float32Array, colors: Uint8Array|null,
 *             indices: Uint32Array, lods: number[], bones: MeshBone[],
 *             skinIndex: Uint16Array|null, skinWeight: Float32Array|null,
 *             subsets: { facesBegin:number, facesLength:number, vertsBegin:number, vertsLength:number, boneIndices:number[] }[],
 *             facs: Uint8Array|null }} ParsedMesh
 */

/**
 * Parse a Roblox mesh file.
 * @param {ArrayBuffer|ArrayBufferView} input
 * @param {{ decodeDraco?: (bytes: Uint8Array) => { positions: Float32Array, normals?: Float32Array, uvs?: Float32Array, colors?: Uint8Array, indices: Uint32Array } }} [options]
 * @returns {ParsedMesh}
 */
export function parseMesh(input, options = {}) {
  const bytes = toBytes(input);
  const nl = bytes.indexOf(10);
  if (nl < 0 || nl > 32) throw new Error("blockrig: not a Roblox mesh (no version line)");
  const header = latin1(bytes.subarray(0, nl)).trim();
  const m = /^version (\d+)\.(\d+)$/.exec(header);
  if (!m) throw new Error(`blockrig: not a Roblox mesh (header "${header.slice(0, 20)}")`);
  const major = +m[1];
  const r = new Reader(bytes, nl + 1);
  const out = blank(header);
  if (major === 1) return readV1(bytes.subarray(nl + 1), out, +m[2]);
  if (major === 2) return readV2(r, out);
  if (major === 3) return readV3(r, out);
  if (major === 4 || major === 5) return readV45(r, out, major);
  if (major === 6 || major === 7) return readChunked(r, out, options);
  throw new Error(`blockrig: unsupported mesh version ${header}`);
}

function blank(version) {
  return { version, vertexCount: 0, faceCount: 0, positions: new Float32Array(0), normals: new Float32Array(0), uvs: new Float32Array(0), colors: null, indices: new Uint32Array(0), lods: [], bones: [], skinIndex: null, skinWeight: null, subsets: [], facs: null };
}

function readVerts(r, out, n, size) {
  if (size !== 36 && size !== 40) throw new Error(`blockrig: unexpected vertex size ${size}`);
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), C = size === 40 ? new Uint8Array(n * 4) : null;
  for (let i = 0; i < n; i++) {
    P[i * 3] = r.f32(); P[i * 3 + 1] = r.f32(); P[i * 3 + 2] = r.f32();
    N[i * 3] = r.f32(); N[i * 3 + 1] = r.f32(); N[i * 3 + 2] = r.f32();
    U[i * 2] = r.f32(); U[i * 2 + 1] = r.f32();
    r.skip(4); // tangent (i8 x4)
    if (C) for (let k = 0; k < 4; k++) C[i * 4 + k] = r.u8();
  }
  Object.assign(out, { vertexCount: n, positions: P, normals: N, uvs: U, colors: C });
}

function readFaces(r, out, n) {
  const I = new Uint32Array(n * 3);
  for (let i = 0; i < n * 3; i++) I[i] = r.u32();
  for (let i = 0; i < I.length; i++) if (I[i] >= out.vertexCount) throw new RangeError(`blockrig: face index ${I[i]} out of range`);
  out.faceCount = n; out.indices = I;
}

// v1.00 / v1.01: ASCII. A face-count line, then for every face three vertices, each written as three
// bracketed triples: [position][normal][uv w]. v1.00 positions are at double scale (multiply by 0.5).
// UVs are stored with v pointing down; flip to match the binary versions.
function readV1(body, out, minor) {
  const text = latin1(body);
  const nl = text.indexOf("\n");
  const nFaces = parseInt(text.slice(0, nl < 0 ? undefined : nl), 10);
  if (!(nFaces >= 0)) throw new Error("blockrig: mesh v1 is missing its face count");
  const nums = [];
  for (const t of text.slice(nl + 1).matchAll(/\[([^\]]*)\]/g)) { const p = t[1].split(","); nums.push(+p[0], +p[1], +p[2]); }
  const nV = nFaces * 3;
  if (nums.length < nV * 9) throw new RangeError(`blockrig: mesh v1 has ${nums.length / 9} vertices, expected ${nV}`);
  const scale = minor === 0 ? 0.5 : 1;
  const P = new Float32Array(nV * 3), N = new Float32Array(nV * 3), U = new Float32Array(nV * 2), I = new Uint32Array(nV);
  for (let i = 0; i < nV; i++) {
    const o = i * 9;
    for (let k = 0; k < 3; k++) { P[i * 3 + k] = nums[o + k] * scale; N[i * 3 + k] = nums[o + 3 + k]; }
    U[i * 2] = nums[o + 6]; U[i * 2 + 1] = 1 - nums[o + 7];
    I[i] = i;
  }
  Object.assign(out, { vertexCount: nV, faceCount: nFaces, positions: P, normals: N, uvs: U, indices: I, lods: [0, nFaces] });
  return out;
}

function readV2(r, out) {
  const hdr = r.u16(), vsz = r.u8(), fsz = r.u8(), nV = r.u32(), nF = r.u32();
  r.skip(hdr - 12);
  if (fsz !== 12) throw new Error(`blockrig: unexpected face size ${fsz}`);
  readVerts(r, out, nV, vsz); readFaces(r, out, nF);
  out.lods = [0, nF];
  return out;
}

function readV3(r, out) {
  const hdr = r.u16(), vsz = r.u8(), fsz = r.u8(), lodSize = r.u16(), nLods = r.u16(), nV = r.u32(), nF = r.u32();
  r.skip(hdr - 16);
  if (fsz !== 12 || lodSize !== 4) throw new Error("blockrig: unexpected v3 sizes");
  readVerts(r, out, nV, vsz); readFaces(r, out, nF);
  for (let i = 0; i < nLods; i++) out.lods.push(r.u32());
  if (!out.lods.length) out.lods = [0, nF];
  return out;
}

function readSkin(r, n) { const idx = new Uint8Array(n * 4), w = new Uint8Array(n * 4); for (let i = 0; i < n; i++) { for (let k = 0; k < 4; k++) idx[i * 4 + k] = r.u8(); for (let k = 0; k < 4; k++) w[i * 4 + k] = r.u8(); } return { idx, w }; }
function readBones(r, n) {
  const raw = [];
  for (let i = 0; i < n; i++) {
    const nameOff = r.u32(), parent = r.u16(), lodParent = r.u16(), culling = r.f32();
    const rot = []; for (let k = 0; k < 9; k++) rot.push(r.f32());
    const pos = [r.f32(), r.f32(), r.f32()];
    raw.push({ nameOff, parent: parent === 0xffff ? -1 : parent, lodParent: lodParent === 0xffff ? -1 : lodParent, culling, cframe: { rot, pos } });
  }
  return raw;
}
function readNames(r, size, raw) {
  const blob = r.slice(size);
  return raw.map(({ nameOff, ...b }) => { let e = nameOff; while (e < blob.length && blob[e] !== 0) e++; return { name: utf8(blob.subarray(nameOff, e)), ...b }; });
}
function readSubsets(r, n) {
  const s = [];
  for (let i = 0; i < n; i++) {
    const facesBegin = r.u32(), facesLength = r.u32(), vertsBegin = r.u32(), vertsLength = r.u32(), numBoneIndices = r.u32();
    const boneIndices = []; for (let k = 0; k < 26; k++) { const b = r.u16(); if (k < numBoneIndices && b !== 0xffff) boneIndices.push(b); }
    s.push({ facesBegin, facesLength, vertsBegin, vertsLength, boneIndices });
  }
  return s;
}

// subset-local skin indices -> global bone indices, weights -> 0..1 (normalised)
function resolveSkin(out, skin) {
  const n = out.vertexCount, subsetOf = new Int32Array(n).fill(-1);
  out.subsets.forEach((s, si) => { for (let v = s.vertsBegin; v < s.vertsBegin + s.vertsLength && v < n; v++) subsetOf[v] = si; });
  const SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) {
    const sub = out.subsets[subsetOf[v]];
    let sum = 0; for (let k = 0; k < 4; k++) sum += skin.w[v * 4 + k];
    for (let k = 0; k < 4; k++) {
      const w = skin.w[v * 4 + k];
      if (!w) continue;
      const local = skin.idx[v * 4 + k];
      const g = sub ? sub.boneIndices[local] : local;
      if (g === undefined || g >= out.bones.length) throw new RangeError(`blockrig: vertex ${v} references missing bone ${local}`);
      SI[v * 4 + k] = g; SW[v * 4 + k] = w / sum;
    }
  }
  out.skinIndex = SI; out.skinWeight = SW;
}

function readV45(r, out, major) {
  const hdr = r.u16(); r.u16(); // lodType
  const nV = r.u32(), nF = r.u32(), nLods = r.u16(), nBones = r.u16(), namesSize = r.u32(), nSubsets = r.u16(); r.u8(); r.u8();
  let facsSize = 0;
  if (major === 5) { r.u32(); facsSize = r.u32(); }
  r.skip(hdr - (major === 5 ? 32 : 24));
  readVerts(r, out, nV, 40);
  const skin = nBones > 0 ? readSkin(r, nV) : null;
  readFaces(r, out, nF);
  for (let i = 0; i < nLods; i++) out.lods.push(r.u32());
  if (!out.lods.length) out.lods = [0, nF];
  const raw = readBones(r, nBones);
  out.bones = readNames(r, namesSize, raw);
  out.subsets = readSubsets(r, nSubsets);
  if (facsSize) out.facs = r.slice(facsSize);
  if (skin) resolveSkin(out, skin);
  return out;
}

function readChunked(r, out, options) {
  let skin = null;
  while (r.left >= 16) {
    const type = r.ascii(8).replace(/\0+$/, ""), ver = r.u32(), size = r.u32();
    const body = new Reader(r.slice(size));
    if (type === "COREMESH") {
      if (ver === 1) { const nV = body.u32(); readVerts(body, out, nV, 40); const nF = body.u32(); readFaces(body, out, nF); }
      else if (ver === 2) {
        if (!options.decodeDraco) throw new Error("blockrig: mesh v7 is Draco-compressed; pass options.decodeDraco");
        const len = body.u32(), d = options.decodeDraco(body.slice(len));
        Object.assign(out, { positions: d.positions, normals: d.normals || new Float32Array(d.positions.length), uvs: d.uvs || new Float32Array((d.positions.length / 3) * 2), colors: d.colors || null, indices: d.indices, vertexCount: d.positions.length / 3, faceCount: d.indices.length / 3 });
      } else throw new Error(`blockrig: COREMESH chunk version ${ver} not supported`);
    } else if (type === "LODS") {
      body.u16(); body.u8(); const n = body.u32(); out.lods = []; for (let i = 0; i < n; i++) out.lods.push(body.u32());
    } else if (type === "SKINNING") {
      const nSkin = body.u32(); skin = readSkin(body, nSkin);
      const nBones = body.u32(), raw = readBones(body, nBones);
      const namesSize = body.u32(); out.bones = readNames(body, namesSize, raw);
      const nSubsets = body.u32(); out.subsets = readSubsets(body, nSubsets);
    } else if (type === "FACS") {
      const n = body.u32(); out.facs = body.slice(n);
    } // HSRAVIS and unknown chunks are skipped
  }
  if (!out.lods.length) out.lods = [0, out.faceCount];
  if (skin) resolveSkin(out, skin);
  return out;
}

/** Index buffer for one level of detail (0 = highest). */
export function lodIndices(mesh, level = 0) {
  const begin = mesh.lods[level] ?? 0, end = mesh.lods[level + 1] ?? mesh.faceCount;
  // some real meshes carry a degenerate LOD table such as [0, 0]: then the whole mesh is the first level
  if (end <= begin) return level === 0 ? mesh.indices.subarray(0, mesh.faceCount * 3) : mesh.indices.subarray(0, 0);
  return mesh.indices.subarray(begin * 3, end * 3);
}
