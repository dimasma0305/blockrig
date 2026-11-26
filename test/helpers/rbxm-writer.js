// Minimal binary .rbxm writer used only by the tests, so the reader can be checked against known input.
// Supports the property types the reader cares about. Chunks can be stored raw, as an LZ4 block or as ZSTD.
import zlib from "node:zlib";

const be32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32BE(v >>> 0); return b; };
const le32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); return b; };
const zz = (v) => ((v << 1) ^ (v >> 31)) >>> 0;
function interleave(chunks, width) { const n = chunks.length, out = Buffer.alloc(n * width); chunks.forEach((c, i) => { for (let k = 0; k < width; k++) out[k * n + i] = c[k]; }); return out; }
const i32s = (vals) => interleave(vals.map((v) => be32(zz(v))), 4);
const refs = (vals) => i32s(vals.map((v, i) => (i ? v - vals[i - 1] : v)));
function rfloat(f) { const b = Buffer.alloc(4); b.writeFloatBE(f); const u = b.readUInt32BE(); return be32(((u << 1) | (u >>> 31)) >>> 0); }
const f32s = (vals) => interleave(vals.map(rfloat), 4);
const str = (s) => { const b = s instanceof Uint8Array ? Buffer.from(s) : Buffer.from(s, "utf8"); return Buffer.concat([le32(b.length), b]); }; // strings, or raw bytes (BinaryString)

/** A literal-only LZ4 block (valid LZ4 that a real decoder must accept). */
export function lz4Literal(data) {
  const parts = []; let len = data.length;
  if (len < 15) parts.push(Buffer.from([len << 4]));
  else { parts.push(Buffer.from([0xf0])); len -= 15; while (len >= 255) { parts.push(Buffer.from([255])); len -= 255; } parts.push(Buffer.from([len])); }
  parts.push(Buffer.from(data));
  return Buffer.concat(parts);
}

function chunk(name, data, mode) {
  const head = Buffer.alloc(16); head.write(name.padEnd(4, "\0"), 0, "latin1");
  if (mode === "raw" || name === "END") { head.writeUInt32LE(0, 4); head.writeUInt32LE(data.length, 8); return Buffer.concat([head, data]); }
  const comp = mode === "zstd" ? zlib.zstdCompressSync(data) : lz4Literal(data);
  head.writeUInt32LE(comp.length, 4); head.writeUInt32LE(data.length, 8);
  return Buffer.concat([head, comp]);
}

function encodeValues(type, vals) {
  switch (type) {
    case 0x01: return Buffer.concat(vals.map(str));
    case 0x02: return Buffer.from(vals.map((v) => (v ? 1 : 0)));
    case 0x03: return i32s(vals);
    case 0x04: return f32s(vals);
    case 0x0e: return Buffer.concat([f32s(vals.map((v) => v[0])), f32s(vals.map((v) => v[1])), f32s(vals.map((v) => v[2]))]);
    case 0x05: { const b = Buffer.alloc(vals.length * 8); vals.forEach((v, i) => b.writeDoubleLE(v, i * 8)); return b; } // Float64
    case 0x0c: return Buffer.concat([f32s(vals.map((v) => v[0])), f32s(vals.map((v) => v[1])), f32s(vals.map((v) => v[2]))]); // Color3
    case 0x10: {
      const rot = Buffer.concat(vals.map((v) => {
        if (typeof v.rotId === "number") return Buffer.from([v.rotId]);
        const b = Buffer.alloc(37); b[0] = 0; v.rot.forEach((r, i) => b.writeFloatLE(r, 1 + i * 4)); return b;
      }));
      return Buffer.concat([rot, f32s(vals.map((v) => v.pos[0])), f32s(vals.map((v) => v.pos[1])), f32s(vals.map((v) => v.pos[2]))]);
    }
    case 0x12: return interleave(vals.map((v) => be32(v)), 4);
    default: throw new Error(`writer: type ${type}`);
  }
}

/**
 * @param {{ className: string, props?: Record<string, [number, any]>, children?: any[] }[]} roots
 *   props map name -> [typeByte, value]
 * @param {{ mode?: "raw"|"lz4"|"zstd" }} [o]
 */
export function writeRbxm(roots, { mode = "lz4" } = {}) {
  const flat = []; let ref = 0;
  const walk = (x, parent) => { const me = { ...x, ref: ref++, parent }; flat.push(me); (x.children || []).forEach((c) => walk(c, me.ref)); };
  roots.forEach((r) => walk(r, -1));
  const classes = [...new Set(flat.map((x) => x.className))];
  const out = [];
  const header = Buffer.alloc(32); header.write("<roblox!", 0, "latin1"); Buffer.from([0x89, 0xff, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 8);
  header.writeUInt16LE(0, 14); header.writeInt32LE(classes.length, 16); header.writeInt32LE(flat.length, 20);
  out.push(header);
  classes.forEach((cn, id) => {
    const items = flat.filter((x) => x.className === cn);
    out.push(chunk("INST", Buffer.concat([le32(id), str(cn), Buffer.from([0]), le32(items.length), refs(items.map((x) => x.ref))]), mode));
  });
  classes.forEach((cn, id) => {
    const items = flat.filter((x) => x.className === cn);
    const names = [...new Set(items.flatMap((x) => Object.keys(x.props || {})))];
    for (const pn of names) {
      const type = items.find((x) => x.props && x.props[pn]).props[pn][0];
      if (items.some((x) => !x.props || !x.props[pn])) throw new Error(`writer: every ${cn} needs ${pn}`);
      out.push(chunk("PROP", Buffer.concat([le32(id), str(pn), Buffer.from([type]), encodeValues(type, items.map((x) => x.props[pn][1]))]), mode));
    }
  });
  out.push(chunk("PRNT", Buffer.concat([Buffer.from([0]), le32(flat.length), refs(flat.map((x) => x.ref)), refs(flat.map((x) => x.parent))]), mode));
  out.push(chunk("END", Buffer.from("</roblox>", "latin1"), "raw"));
  return new Uint8Array(Buffer.concat(out));
}
