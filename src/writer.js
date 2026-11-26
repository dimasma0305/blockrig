// Writer for Roblox `.mesh` files (versions 2.00, 3.00, 4.00, 6.00). Useful for tests, tooling and for
// exporting procedurally generated garments in the same format the reader accepts.

class Writer {
  constructor(size = 1024) { this.buf = new Uint8Array(size); this.view = new DataView(this.buf.buffer); this.pos = 0; }
  grow(n) { if (this.pos + n <= this.buf.length) return; let s = this.buf.length * 2; while (s < this.pos + n) s *= 2; const b = new Uint8Array(s); b.set(this.buf); this.buf = b; this.view = new DataView(b.buffer); }
  u8(v) { this.grow(1); this.buf[this.pos++] = v; }
  i8(v) { this.grow(1); this.view.setInt8(this.pos++, v); }
  u16(v) { this.grow(2); this.view.setUint16(this.pos, v, true); this.pos += 2; }
  u32(v) { this.grow(4); this.view.setUint32(this.pos, v, true); this.pos += 4; }
  f32(v) { this.grow(4); this.view.setFloat32(this.pos, v, true); this.pos += 4; }
  bytes(b) { this.grow(b.length); this.buf.set(b, this.pos); this.pos += b.length; }
  ascii(s) { for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i)); }
  done() { return this.buf.slice(0, this.pos); }
}

const enc = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const utf8 = (s) => (enc ? enc.encode(s) : Uint8Array.from(s, (c) => c.charCodeAt(0)));

function verts(w, m, withColor = true) {
  for (let i = 0; i < m.vertexCount; i++) {
    for (let k = 0; k < 3; k++) w.f32(m.positions[i * 3 + k]);
    for (let k = 0; k < 3; k++) w.f32(m.normals[i * 3 + k]);
    w.f32(m.uvs[i * 2]); w.f32(m.uvs[i * 2 + 1]);
    w.i8(0); w.i8(0); w.i8(-127); w.i8(127); // tangent
    if (withColor) for (let k = 0; k < 4; k++) w.u8(m.colors ? m.colors[i * 4 + k] : 255);
  }
}
function faces(w, m) { for (let i = 0; i < m.indices.length; i++) w.u32(m.indices[i]); }

// float weights (0..1) -> bytes summing to 255
function weightBytes(ws) {
  const b = ws.map((x) => Math.round(x * 255)); let d = 255 - b.reduce((a, c) => a + c, 0);
  if (ws.some((x) => x > 0)) { const k = ws.indexOf(Math.max(...ws)); b[k] += d; } return b;
}
function skin(w, m) {
  for (let v = 0; v < m.vertexCount; v++) {
    const ws = [0, 1, 2, 3].map((k) => m.skinWeight[v * 4 + k]);
    for (let k = 0; k < 4; k++) w.u8(ws[k] > 0 ? m.skinIndex[v * 4 + k] : 0); // one subset holding every bone: local == global
    for (const b of weightBytes(ws)) w.u8(b);
  }
}
function names(m) { const parts = [], offs = []; let o = 0; for (const b of m.bones) { const e = utf8(b.name); offs.push(o); parts.push(e, new Uint8Array([0])); o += e.length + 1; } const blob = new Uint8Array(o); let p = 0; for (const x of parts) { blob.set(x, p); p += x.length; } return { blob, offs }; }
function bones(w, m, offs) {
  m.bones.forEach((b, i) => {
    w.u32(offs[i]); w.u16(b.parent < 0 ? 0xffff : b.parent); w.u16(0xffff); w.f32(b.culling || 0);
    for (const r of b.cframe.rot) w.f32(r);
    for (const p of b.cframe.pos) w.f32(p);
  });
}
function subset(w, m) {
  if (m.bones.length > 26) throw new Error("blockrig: writer supports up to 26 bones");
  w.u32(0); w.u32(m.faceCount); w.u32(0); w.u32(m.vertexCount); w.u32(m.bones.length);
  for (let k = 0; k < 26; k++) w.u16(k < m.bones.length ? k : 0xffff);
}

/**
 * Encode a mesh ({ positions, normals, uvs, indices, vertexCount, faceCount, bones?, skinIndex?, skinWeight?, lods? }).
 * @param {"2.00"|"3.00"|"4.00"|"6.00"} version
 * @returns {Uint8Array}
 */
export function writeMesh(m, version = "4.00") {
  const w = new Writer(64 + m.vertexCount * 48 + m.faceCount * 12);
  const lods = m.lods && m.lods.length ? m.lods : [0, m.faceCount];
  const skinned = !!(m.skinIndex && m.bones && m.bones.length);
  w.ascii(`version ${version}\n`);
  if (version === "2.00") { w.u16(12); w.u8(40); w.u8(12); w.u32(m.vertexCount); w.u32(m.faceCount); verts(w, m); faces(w, m); }
  else if (version === "3.00") { w.u16(16); w.u8(40); w.u8(12); w.u16(4); w.u16(lods.length); w.u32(m.vertexCount); w.u32(m.faceCount); verts(w, m); faces(w, m); lods.forEach((l) => w.u32(l)); }
  else if (version === "4.00") {
    const { blob, offs } = names(skinned ? m : { bones: [] });
    w.u16(24); w.u16(0); w.u32(m.vertexCount); w.u32(m.faceCount); w.u16(lods.length); w.u16(skinned ? m.bones.length : 0); w.u32(blob.length); w.u16(skinned ? 1 : 0); w.u8(0); w.u8(0);
    verts(w, m); if (skinned) skin(w, m); faces(w, m); lods.forEach((l) => w.u32(l));
    if (skinned) { bones(w, m, offs); w.bytes(blob); subset(w, m); }
  } else if (version === "6.00") {
    const chunk = (type, fill) => { const c = new Writer(); fill(c); const d = c.done(); w.ascii(type.padEnd(8, "\0")); w.u32(1); w.u32(d.length); w.bytes(d); };
    chunk("COREMESH", (c) => { c.u32(m.vertexCount); verts(c, m); c.u32(m.faceCount); faces(c, m); });
    chunk("LODS", (c) => { c.u16(0); c.u8(0); c.u32(lods.length); lods.forEach((l) => c.u32(l)); });
    if (skinned) chunk("SKINNING", (c) => { c.u32(m.vertexCount); skin(c, m); c.u32(m.bones.length); const { blob, offs } = names(m); bones(c, m, offs); c.u32(blob.length); c.bytes(blob); c.u32(1); subset(c, m); });
  } else throw new Error(`blockrig: writer does not support version ${version}`);
  return w.done();
}
