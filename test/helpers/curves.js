// Encoders for curve ValuesAndTimes blobs, written to the layout BlockRig reads (rbx-dom#657): values section
// [u32 version, u32 count, keys], times section [u32 1, u32 count, i32 ticks (2400 / s)], little-endian.
const MODE = { Constant: 0, Linear: 1, Cubic: 2 };
function blob(version, keyBytes, times) {
  const head = Buffer.alloc(8); head.writeUInt32LE(version, 0); head.writeUInt32LE(times.length, 4);
  const th = Buffer.alloc(8 + times.length * 4); th.writeUInt32LE(1, 0); th.writeUInt32LE(times.length, 4);
  times.forEach((t, i) => th.writeInt32LE(Math.round(t * 2400), 8 + i * 4));
  return new Uint8Array(Buffer.concat([head, ...keyBytes, th]));
}
/** keys: [{ t, value, interpolation?, leftTangent?, rightTangent? }] */
export function encodeFloatCurve(keys) {
  return blob(2, keys.map((k) => { const b = Buffer.alloc(14); b.writeUInt8(MODE[k.interpolation || "Linear"], 0); b.writeUInt8(k.leftTangent != null || k.rightTangent != null ? 3 : 0, 1); b.writeFloatLE(k.value, 2); b.writeFloatLE(k.leftTangent || 0, 6); b.writeFloatLE(k.rightTangent || 0, 10); return b; }), keys.map((k) => k.t));
}
/** keys: [{ t, q: [x, y, z, w], interpolation? }] */
export function encodeRotationCurve(keys) {
  return blob(1, keys.map((k) => { const b = Buffer.alloc(25); b.writeUInt8(12 + MODE[k.interpolation || "Linear"], 0); k.q.forEach((v, i) => b.writeFloatLE(v, 1 + i * 4)); return b; }), keys.map((k) => k.t));
}
/** markers: [{ t, value }] */
export function encodeMarkerCurve(markers) {
  return blob(2, markers.map((m) => Buffer.concat([Buffer.from(m.value, "utf8"), Buffer.from([0])])), markers.map((m) => m.t));
}
