import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCoat } from "../src/garment.js";

test("generated coat: faces wind counter-clockwise, matching their vertex normals", () => {
  const c = makeCoat();
  const v = (i) => [c.positions[i * 3], c.positions[i * 3 + 1], c.positions[i * 3 + 2]];
  const n = (i) => [c.normals[i * 3], c.normals[i * 3 + 1], c.normals[i * 3 + 2]];
  for (let f = 0; f < c.faceCount; f++) {
    const [a, b, d] = [c.indices[f * 3], c.indices[f * 3 + 1], c.indices[f * 3 + 2]].map(v);
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const nn = n(c.indices[f * 3]);
    assert.ok(cr[0] * nn[0] + cr[1] * nn[1] + cr[2] * nn[2] > 0, `face ${f} is wound against its normal`);
  }
});

test("generated coat: skin weights are normalised and reference R15 bones", () => {
  const c = makeCoat();
  for (let i = 0; i < c.vertexCount; i++) {
    let s = 0; for (let k = 0; k < 4; k++) { s += c.skinWeight[i * 4 + k]; assert.ok(c.skinIndex[i * 4 + k] < c.bones.length); }
    assert.ok(Math.abs(s - 1) < 1e-6);
  }
  assert.ok(makeCoat({ tails: false }).vertexCount < c.vertexCount);
});
