// Small helpers for reading little/big-endian binary data from Uint8Array in both Node and browsers.

/** @param {ArrayBuffer|ArrayBufferView} input */
export function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new TypeError("blockrig: expected an ArrayBuffer or typed array");
}

export class Reader {
  /** @param {Uint8Array} bytes */
  constructor(bytes, offset = 0) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.pos = offset;
  }
  get left() { return this.bytes.length - this.pos; }
  need(n) { if (this.pos + n > this.bytes.length) throw new RangeError(`blockrig: unexpected end of data at byte ${this.pos} (wanted ${n})`); }
  u8() { this.need(1); return this.bytes[this.pos++]; }
  i8() { this.need(1); return this.view.getInt8(this.pos++); }
  u16() { this.need(2); const v = this.view.getUint16(this.pos, true); this.pos += 2; return v; }
  u32() { this.need(4); const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
  i32() { this.need(4); const v = this.view.getInt32(this.pos, true); this.pos += 4; return v; }
  f32() { this.need(4); const v = this.view.getFloat32(this.pos, true); this.pos += 4; return v; }
  u64() { const lo = this.u32(), hi = this.u32(); return hi * 2 ** 32 + lo; }
  slice(n) { this.need(n); const s = this.bytes.subarray(this.pos, this.pos + n); this.pos += n; return s; }
  skip(n) { this.need(n); this.pos += n; }
  ascii(n) { return latin1(this.slice(n)); }
  string(n) { return utf8(this.slice(n)); }
}

const td = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;
export const utf8 = (b) => (td ? td.decode(b) : String.fromCharCode(...b));
// strict decoding: binary blobs stored as strings (BinaryString, e.g. curve ValuesAndTimes) aren't valid UTF-8,
// so they come back as raw bytes instead of being mangled by replacement characters
const tdStrict = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { fatal: true }) : null;
export const utf8OrBytes = (b) => { if (!tdStrict) return utf8(b); try { return tdStrict.decode(b); } catch { return Uint8Array.from(b); } };
export const latin1 = (b) => { let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s; };

/** Decompress a raw LZ4 *block* (no frame header) into a buffer of known size. */
export function lz4Block(src, outLen) {
  const out = new Uint8Array(outLen);
  let i = 0, o = 0;
  while (i < src.length) {
    const token = src[i++];
    let lit = token >> 4;
    if (lit === 15) { let b; do { b = src[i++]; lit += b; } while (b === 255); }
    if (o + lit > outLen || i + lit > src.length) throw new RangeError("blockrig: corrupt LZ4 block (literals)");
    out.set(src.subarray(i, i + lit), o); i += lit; o += lit;
    if (i >= src.length) break; // last sequence has literals only
    const off = src[i] | (src[i + 1] << 8); i += 2;
    if (off === 0 || off > o) throw new RangeError("blockrig: corrupt LZ4 block (offset)");
    let ml = token & 15;
    if (ml === 15) { let b; do { b = src[i++]; ml += b; } while (b === 255); }
    ml += 4;
    if (o + ml > outLen) throw new RangeError("blockrig: corrupt LZ4 block (match)");
    for (let k = 0; k < ml; k++, o++) out[o] = out[o - off];
  }
  if (o !== outLen) throw new RangeError(`blockrig: LZ4 size mismatch (${o} != ${outLen})`);
  return out;
}
