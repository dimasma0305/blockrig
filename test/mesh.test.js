import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMesh, lodIndices } from "../src/mesh.js";
import { writeMesh } from "../src/writer.js";
import { makeCoat } from "../src/garment.js";

const coat = makeCoat();
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

function sameGeometry(p, src) {
  assert.equal(p.vertexCount, src.vertexCount);
  assert.equal(p.faceCount, src.faceCount);
  for (let i = 0; i < src.positions.length; i += 7) near(p.positions[i], src.positions[i]);
  for (let i = 0; i < src.normals.length; i += 7) near(p.normals[i], src.normals[i]);
  for (let i = 0; i < src.uvs.length; i += 5) near(p.uvs[i], src.uvs[i]);
  assert.deepEqual(Array.from(p.indices), Array.from(src.indices));
}

for (const v of ["2.00", "3.00", "4.00", "6.00"]) {
  test(`mesh v${v}: geometry round-trips`, () => {
    const p = parseMesh(writeMesh(coat, v));
    assert.equal(p.version, `version ${v}`);
    sameGeometry(p, coat);
    assert.deepEqual(p.lods, [0, coat.faceCount]);
  });
}

for (const v of ["4.00", "6.00"]) {
  test(`mesh v${v}: bones, names and skin weights round-trip`, () => {
    const p = parseMesh(writeMesh(coat, v));
    assert.deepEqual(p.bones.map((b) => b.name), coat.bones.map((b) => b.name));
    assert.deepEqual(p.bones.map((b) => b.parent), coat.bones.map((b) => b.parent));
    p.bones.forEach((b, i) => { b.cframe.pos.forEach((x, k) => near(x, coat.bones[i].cframe.pos[k])); b.cframe.rot.forEach((x, k) => near(x, coat.bones[i].cframe.rot[k])); });
    for (let v2 = 0; v2 < p.vertexCount; v2++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        const w = p.skinWeight[v2 * 4 + k]; sum += w;
        if (w > 0) { // same bone must carry (about) the same weight after the 0..255 quantisation
          const j = [0, 1, 2, 3].find((q) => coat.skinIndex[v2 * 4 + q] === p.skinIndex[v2 * 4 + k] && coat.skinWeight[v2 * 4 + q] > 0);
          assert.notEqual(j, undefined, `vertex ${v2} gained bone ${p.skinIndex[v2 * 4 + k]}`);
          near(w, coat.skinWeight[v2 * 4 + j], 2 / 255);
        }
      }
      near(sum, 1, 1e-5);
    }
  });
}

test("mesh v4: subset-local skin indices resolve to global bone indices", () => {
  // two bones; the subset lists them as [1, 0], so local index 0 means global bone 1
  const tri = { vertexCount: 3, faceCount: 1, positions: new Float32Array(9), normals: new Float32Array(9), uvs: new Float32Array(6), indices: new Uint32Array([0, 1, 2]) };
  const bytes = writeMesh({ ...tri, bones: [
    { name: "A", parent: -1, cframe: { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, 0, 0] } },
    { name: "B", parent: 0, cframe: { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, 1, 0] } }],
  skinIndex: new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), skinWeight: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]) }, "4.00");
  // patch the subset's boneIndices table to [1, 0]
  const buf = Buffer.from(bytes), sub = buf.length - 72;
  buf.writeUInt16LE(1, sub + 20); buf.writeUInt16LE(0, sub + 22);
  const p = parseMesh(buf);
  assert.deepEqual(Array.from(p.skinIndex.subarray(0, 4)), [1, 0, 0, 0]);
  assert.equal(p.bones[p.skinIndex[0]].name, "B");
});

test("mesh v5: FACS block is read and skipped", () => {
  const v4 = Buffer.from(writeMesh(coat, "4.00"));
  const nl = v4.indexOf(10) + 1, facs = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const hdr = Buffer.alloc(32); v4.copy(hdr, 0, nl, nl + 24); hdr.writeUInt16LE(32, 0); hdr.writeUInt32LE(0, 24); hdr.writeUInt32LE(facs.length, 28);
  const v5 = Buffer.concat([Buffer.from("version 5.00\n"), hdr, v4.subarray(nl + 24), facs]);
  const p = parseMesh(v5);
  assert.equal(p.version, "version 5.00");
  sameGeometry(p, coat);
  assert.deepEqual(Array.from(p.facs), Array.from(facs));
});

test("mesh v7: Draco COREMESH is passed to the decoder hook", () => {
  const payload = Buffer.from([9, 9, 9]);
  const body = Buffer.concat([Buffer.from([3, 0, 0, 0]), payload]);
  const head = Buffer.alloc(16); head.write("COREMESH", 0, "latin1"); head.writeUInt32LE(2, 8); head.writeUInt32LE(body.length, 12);
  const file = Buffer.concat([Buffer.from("version 7.00\n"), head, body]);
  assert.throws(() => parseMesh(file), /decodeDraco/);
  let seen = null;
  const p = parseMesh(file, { decodeDraco: (b) => { seen = Array.from(b); return { positions: new Float32Array(9), indices: new Uint32Array([0, 1, 2]) }; } });
  assert.deepEqual(seen, [9, 9, 9]);
  assert.equal(p.vertexCount, 3); assert.equal(p.faceCount, 1);
});

test("mesh: LOD index ranges", () => {
  const p = parseMesh(writeMesh({ ...coat, lods: [0, 100, coat.faceCount] }, "3.00"));
  assert.equal(lodIndices(p, 0).length, 300);
  assert.equal(lodIndices(p, 1).length, (coat.faceCount - 100) * 3);
});

test("mesh: rejects bad input", () => {
  assert.throws(() => parseMesh(Buffer.from("hello world")), /not a Roblox mesh/);
  assert.throws(() => parseMesh(Buffer.from("version 1.00\n1\n[0,0,0]")), /1\.x/);
  assert.throws(() => parseMesh(Buffer.from("version 9.00\n")), /unsupported/);
  const ok = Buffer.from(writeMesh(coat, "2.00"));
  assert.throws(() => parseMesh(ok.subarray(0, ok.length - 10)), /end of data/);
  const bad = Buffer.from(ok); bad.writeUInt32LE(99999, bad.length - 4);
  assert.throws(() => parseMesh(bad), /out of range/);
});
