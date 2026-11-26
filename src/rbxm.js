// Reader for the binary Roblox model format (.rbxm / .rbxl).
// Format reference: https://dom.rojo.space/binary.html
import { Reader, toBytes, latin1, utf8, lz4Block } from "./binary.js";
import { parseRbxmx } from "./rbxmx.js";

const MAGIC = "<roblox!";

/**
 * @typedef {{ className: string, ref: number, props: Record<string, any>, children: RbxInstance[], parent: RbxInstance|null }} RbxInstance
 */

/**
 * Parse a binary model file into an instance tree.
 * @param {ArrayBuffer|ArrayBufferView} input
 * @param {{ zstd?: (compressed: Uint8Array, size: number) => Uint8Array }} [options]
 *   `zstd` decompresses ZSTD chunks (Node: `(b) => zlib.zstdDecompressSync(b)`; browser: e.g. fzstd).
 * @returns {RbxInstance[]} root instances
 */
export function parseRbxm(input, options = {}) {
  if (typeof input === "string") return parseRbxmx(input);
  const bytes = toBytes(input);
  if (latin1(bytes.subarray(0, 8)) !== MAGIC) {
    // XML models (.rbxmx) start with "<roblox " (possibly after a BOM / XML declaration)
    const head = latin1(bytes.subarray(0, 256)).replace(/^﻿|^ï»¿/, "").trimStart();
    if (/^(<\?xml[^>]*>\s*)?<roblox[\s>]/.test(head)) return parseRbxmx(utf8(bytes));
    throw new Error("blockrig: not a Roblox model (binary or XML)");
  }
  const r = new Reader(bytes, 32);
  const classes = new Map(), inst = new Map(), sstr = [], props = [];
  let prnt = null;
  while (r.left >= 16) {
    const name = r.ascii(4).replace(/\0+$/, ""), clen = r.u32(), ulen = r.u32(); r.skip(4);
    let data;
    if (clen === 0) data = r.slice(ulen);
    else {
      const raw = r.slice(clen);
      if (raw[0] === 0x28 && raw[1] === 0xb5 && raw[2] === 0x2f && raw[3] === 0xfd) {
        if (!options.zstd) throw new Error("blockrig: ZSTD-compressed chunk; pass options.zstd");
        data = options.zstd(raw, ulen);
      } else data = lz4Block(raw, ulen);
    }
    if (name === "END") break;
    const c = new Reader(data);
    if (name === "SSTR") { c.u32(); const n = c.u32(); for (let i = 0; i < n; i++) { c.skip(16); sstr.push(c.slice(c.u32())); } }
    else if (name === "INST") {
      const id = c.u32(), cname = c.string(c.u32()); c.u8(); const n = c.u32(), refs = readRefs(c, n);
      classes.set(id, { className: cname, refs });
      for (const ref of refs) inst.set(ref, { className: cname, ref, props: {}, children: [], parent: null });
    } else if (name === "PROP") props.push(c);
    else if (name === "PRNT") prnt = c;
  }
  for (const c of props) {
    const id = c.u32(), pname = c.string(c.u32()), type = c.u8(), cls = classes.get(id);
    if (!cls) continue;
    const values = readValues(c, type, cls.refs.length, sstr);
    if (values) cls.refs.forEach((ref, i) => { inst.get(ref).props[pname] = values[i]; });
  }
  const roots = [];
  if (prnt) {
    prnt.u8(); const n = prnt.u32(), child = readRefs(prnt, n), parent = readRefs(prnt, n);
    for (let i = 0; i < n; i++) {
      const ch = inst.get(child[i]); if (!ch) continue;
      const pa = parent[i] === -1 ? null : inst.get(parent[i]);
      if (pa) { pa.children.push(ch); ch.parent = pa; } else roots.push(ch);
    }
  }
  return roots;
}

// ---- encodings ----
function interleaved(c, n, width) {
  const raw = c.slice(n * width), out = new Uint8Array(n * width);
  for (let i = 0; i < n; i++) for (let k = 0; k < width; k++) out[i * width + k] = raw[k * n + i];
  return new DataView(out.buffer);
}
const zigzag = (u) => (u >>> 1) ^ -(u & 1);
function readI32s(c, n) { const d = interleaved(c, n, 4), a = new Array(n); for (let i = 0; i < n; i++) a[i] = zigzag(d.getUint32(i * 4, false)); return a; }
function readRefs(c, n) { const a = readI32s(c, n); for (let i = 1; i < n; i++) a[i] += a[i - 1]; return a; }
const f32buf = new DataView(new ArrayBuffer(4));
function robloxFloat(u) { f32buf.setUint32(0, ((u >>> 1) | ((u & 1) << 31)) >>> 0, false); return f32buf.getFloat32(0, false); }
function readF32s(c, n) { const d = interleaved(c, n, 4), a = new Array(n); for (let i = 0; i < n; i++) a[i] = robloxFloat(d.getUint32(i * 4, false)); return a; }

// the 24 axis-aligned rotations used by CFrame type 0x10, keyed by id
const ROT_IDS = {
  0x02: [1, 0, 0, 0, 1, 0, 0, 0, 1], 0x03: [1, 0, 0, 0, 0, -1, 0, 1, 0], 0x05: [1, 0, 0, 0, -1, 0, 0, 0, -1], 0x06: [1, 0, 0, 0, 0, 1, 0, -1, 0],
  0x07: [0, 1, 0, 1, 0, 0, 0, 0, -1], 0x09: [0, 0, 1, 1, 0, 0, 0, 1, 0], 0x0a: [0, -1, 0, 1, 0, 0, 0, 0, 1], 0x0c: [0, 0, -1, 1, 0, 0, 0, -1, 0],
  0x0d: [0, 1, 0, 0, 0, 1, 1, 0, 0], 0x0e: [0, 0, -1, 0, 1, 0, 1, 0, 0], 0x10: [0, -1, 0, 0, 0, -1, 1, 0, 0], 0x11: [0, 0, 1, 0, -1, 0, 1, 0, 0],
  0x14: [-1, 0, 0, 0, 1, 0, 0, 0, -1], 0x15: [-1, 0, 0, 0, 0, 1, 0, 1, 0], 0x17: [-1, 0, 0, 0, -1, 0, 0, 0, 1], 0x18: [-1, 0, 0, 0, 0, -1, 0, -1, 0],
  0x19: [0, 1, 0, -1, 0, 0, 0, 0, 1], 0x1b: [0, 0, -1, -1, 0, 0, 0, 1, 0], 0x1c: [0, -1, 0, -1, 0, 0, 0, 0, -1], 0x1e: [0, 0, 1, -1, 0, 0, 0, -1, 0],
  0x1f: [0, 1, 0, 0, 0, -1, -1, 0, 0], 0x20: [0, 0, 1, 0, 1, 0, -1, 0, 0], 0x22: [0, -1, 0, 0, 0, 1, -1, 0, 0], 0x23: [0, 0, -1, 0, -1, 0, -1, 0, 0],
};
export { ROT_IDS };

function readValues(c, type, n, sstr) {
  switch (type) {
    case 0x01: { const a = []; for (let i = 0; i < n; i++) a.push(utf8(c.slice(c.u32()))); return a; } // String (incl. legacy Content)
    case 0x02: { const a = []; for (let i = 0; i < n; i++) a.push(c.u8() !== 0); return a; } // Bool
    case 0x03: return readI32s(c, n); // Int32
    case 0x04: return readF32s(c, n); // Float32
    case 0x05: { const b = c.slice(n * 8), dv = new DataView(b.buffer, b.byteOffset, b.byteLength), a = []; for (let i = 0; i < n; i++) a.push(dv.getFloat64(i * 8, true)); return a; } // Float64 (plain little-endian)
    case 0x0b: { const d = interleaved(c, n, 4), a = []; for (let i = 0; i < n; i++) a.push(d.getUint32(i * 4, false)); return a; } // BrickColor (palette number)
    case 0x0c: { const r = readF32s(c, n), g = readF32s(c, n), b = readF32s(c, n); return r.map((_, i) => [r[i], g[i], b[i]]); } // Color3
    case 0x0e: { const x = readF32s(c, n), y = readF32s(c, n), z = readF32s(c, n); return x.map((_, i) => [x[i], y[i], z[i]]); } // Vector3
    case 0x10: case 0x11: { // CFrame / Quaternion-CFrame
      const rots = [];
      for (let i = 0; i < n; i++) {
        const id = c.u8();
        if (id === 0) { const m = []; if (type === 0x11) { const q = [c.f32(), c.f32(), c.f32(), c.f32()]; rots.push(quatToRot(q)); continue; } for (let k = 0; k < 9; k++) m.push(c.f32()); rots.push(m); }
        else rots.push(ROT_IDS[id] ? ROT_IDS[id].slice() : null);
      }
      const x = readF32s(c, n), y = readF32s(c, n), z = readF32s(c, n);
      return rots.map((rot, i) => ({ rot, pos: [x[i], y[i], z[i]] }));
    }
    case 0x12: { const d = interleaved(c, n, 4), a = []; for (let i = 0; i < n; i++) a.push(d.getUint32(i * 4, false)); return a; } // Enum
    case 0x13: return readRefs(c, n); // Ref
    case 0x1a: { const r = c.slice(n), g = c.slice(n), b = c.slice(n); return Array.from(r, (_, i) => [r[i], g[i], b[i]]); } // Color3uint8
    case 0x1c: { const d = interleaved(c, n, 4), a = []; for (let i = 0; i < n; i++) { const s = sstr[d.getUint32(i * 4, false)]; a.push(s || null); } return a; } // SharedString
    default: return null; // other types are skipped
  }
}

function quatToRot([x, y, z, w]) {
  return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
}

/** Depth-first search for the first instance matching a predicate. */
export function findInstance(roots, pred) {
  for (const x of roots) { if (pred(x)) return x; const f = findInstance(x.children, pred); if (f) return f; }
  return null;
}

/** "rbxassetid://123", "http://www.roblox.com/asset/?id=123", "https://assetdelivery.roblox.com/v1/asset/?id=123" -> 123 */
export function assetId(content) {
  if (typeof content !== "string") return null;
  const m = /(?:rbxassetid:\/\/|[?&]id=)(\d+)/i.exec(content);
  return m ? +m[1] : null;
}

/**
 * Describe a Roblox head asset (the model a "Head" catalog item downloads as): its SpecialMesh (MeshId,
 * TextureId, Scale, Offset, MeshType) and the attachment positions it carries as Vector3Values, relative
 * to the Head part's centre (HairAttachment, HatAttachment, FaceFrontAttachment, FaceCenterAttachment,
 * NeckRigAttachment). Classic heads without the values return an empty attachments object.
 */
export function describeHead(roots) {
  const mesh = findInstance(roots, (x) => x.className === "SpecialMesh" || x.className === "MeshPart");
  if (!mesh) throw new Error("blockrig: no SpecialMesh or MeshPart in this head model");
  const attachments = {};
  const scan = (list) => { for (const x of list) { if (x.className === "Vector3Value" && /Attachment$/.test(x.props.Name) && x.props.Value) attachments[x.props.Name] = x.props.Value.slice(); if (x.className === "Attachment" && x.props.CFrame) attachments[x.props.Name] = x.props.CFrame.pos.slice(); scan(x.children); } };
  scan(roots);
  return {
    meshId: assetId(mesh.props.MeshId),
    textureId: assetId(mesh.props.TextureId ?? mesh.props.TextureID),
    meshType: mesh.props.MeshType ?? null,
    scale: mesh.props.Scale ? mesh.props.Scale.slice() : [1, 1, 1],
    offset: mesh.props.Offset ? mesh.props.Offset.slice() : [0, 0, 0],
    attachments,
  };
}

/**
 * Pull the parts of an Accessory that a renderer needs: mesh/texture ids, the handle attachment
 * and, for layered clothing, the WrapLayer settings.
 */
export function describeAccessory(roots) {
  const acc = findInstance(roots, (x) => x.className === "Accessory");
  if (!acc) throw new Error("blockrig: no Accessory in model");
  const handle = acc.children.find((x) => x.props.Name === "Handle") || acc.children[0];
  const special = handle && handle.children.find((x) => x.className === "SpecialMesh");
  const meshSrc = special || handle;
  const att = handle && handle.children.find((x) => x.className === "Attachment");
  const wrap = handle && handle.children.find((x) => x.className === "WrapLayer");
  return {
    name: acc.props.Name,
    meshId: assetId(meshSrc.props.MeshId),
    textureId: assetId(special ? special.props.TextureId : handle.props.TextureID),
    attachment: att ? { name: att.props.Name, cframe: att.props.CFrame } : null,
    layered: wrap ? { order: wrap.props.Order ?? 1, cageMeshId: assetId(wrap.props.CageMeshId), referenceMeshId: assetId(wrap.props.ReferenceMeshId) } : null,
  };
}
