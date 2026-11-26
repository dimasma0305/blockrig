import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { fitLayer, cageMap, cageKey, createRig, makeCoat, defaultR15Parts } from "../src/index.js";

// a cage: a grid of points around the body, each with its own template UV
function cage(fn, n = 6) {
  const pos = [], uvs = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (const side of [-1, 1]) {
    const x = (i / (n - 1) - 0.5) * 2, y = (j / (n - 1)) * 4 - 1, z = side * 0.6;
    pos.push(...fn([x, y, z])); uvs.push((i + 0.5) / n / 2 + (side > 0 ? 0.5 : 0), (j + 0.5) / n);
  }
  return { positions: Float32Array.from(pos), uvs: Float32Array.from(uvs) };
}

test("cageMap keys vertices by template UV, offset and scaled", () => {
  const c = cage((p) => p, 2), m = cageMap(c, { origin: [0, 1, 0], at: [10, 0, 0], scale: [2, 1, 1] });
  assert.equal(m.size, 8);
  assert.deepEqual(m.get(cageKey(c.uvs[0], c.uvs[1])), [10 + c.positions[0] * 2, c.positions[1] + 1, c.positions[2]]);
});

test("fitLayer: the garment follows its inner cage onto the target", () => {
  const inner = cage((p) => p), body = cageMap(cage(([x, y, z]) => [x + 0.5, y * 1.5, z])); // a body further right and taller
  // garment points just outside the inner cage, near a few cage vertices
  const pts = Float32Array.from([-1, -1, 0.65, 1, 3, -0.65, 0.2, 1.4, 0.65]);
  const r = fitLayer(pts, { inner }, body, { k: 1 });
  assert.equal(r.matched, 72);
  // with k = 1 each point takes its nearest cage vertex's displacement exactly (x + 0.5, y * 1.5)
  const near = (i, cy) => { assert.ok(Math.abs(r.positions[i * 3] - (pts[i * 3] + 0.5)) < 1e-5); assert.ok(Math.abs(r.positions[i * 3 + 1] - (pts[i * 3 + 1] + cy * 0.5)) < 1e-5); };
  near(0, -1); near(1, 3);
  // a uniform move carries everything exactly, whatever k
  const shifted = cageMap(cage(([x, y, z]) => [x + 0.3, y - 0.2, z + 0.1]));
  const r2 = fitLayer(pts, { inner }, shifted);
  for (let i = 0; i < 3; i++) { assert.ok(Math.abs(r2.positions[i * 3] - pts[i * 3] - 0.3) < 1e-5); assert.ok(Math.abs(r2.positions[i * 3 + 1] - pts[i * 3 + 1] + 0.2) < 1e-5); }
  // the inflate option pushes along the given normals
  const r3 = fitLayer(pts, { inner }, shifted, { normals: Float32Array.from([0, 0, 1, 0, 0, -1, 0, 0, 1]), inflate: 0.05 });
  assert.ok(Math.abs(r3.positions[2] - (pts[2] + 0.1 + 0.05)) < 1e-5);
});

test("fitLayer: the outer cage becomes the next layer's target", () => {
  const inner = cage((p) => p), outer = cage(([x, y, z]) => [x * 1.1, y, z * 1.2]);
  const body = cageMap(cage(([x, y, z]) => [x + 1, y, z]));
  const r = fitLayer(new Float32Array(3), { inner, outer }, body);
  const k = cageKey(outer.uvs[0], outer.uvs[1]);
  assert.ok(Math.abs(r.target.get(k)[0] - (outer.positions[0] + 1)) < 1e-5, "outer cage moved with the layer");
  assert.notEqual(r.target, body, "the body's own cage is left as it was");
  assert.throws(() => fitLayer(new Float32Array(3), { inner: { positions: new Float32Array(3), uvs: Float32Array.from([0.987, 0.123]) } }, body), /shares no vertices/);
});

test("rig: body-part cages fit layered clothing to the body and skin it on the rig's bind pose", () => {
  const coat = makeCoat({ slices: 8 });
  // the coat's inner cage: a few of its own vertices; the body's torso cage: the same UVs, 0.4 studs wider out
  const idx = [...Array(coat.vertexCount).keys()].filter((i) => i % 7 === 0);
  const inner = { positions: Float32Array.from(idx.flatMap((i) => [...coat.positions.slice(i * 3, i * 3 + 3)])), uvs: Float32Array.from(idx.flatMap((i) => [i / coat.vertexCount, 0.5])) };
  const d = defaultR15Parts(), ut = createRig({}).body.parts.find((p) => p.bone === "UpperTorso");
  // body cage in UpperTorso part space: the inner cage moved 0.4 along x, minus the part centre
  const bodyCage = { positions: inner.positions.map((v, i) => v - ut.center[i % 3] + (i % 3 === 0 ? 0.4 : 0)), uvs: inner.uvs };
  const rig = createRig({ bodyParts: { UpperTorso: { size: d.UpperTorso.size, attachments: d.UpperTorso.attachments, cage: { mesh: bodyCage, origin: [0, 0, 0] } } } });
  assert.equal(rig.bodyCage.size, idx.length);
  const sm = rig.addLayeredClothing(coat, { wrap: { inner } });
  assert.equal(sm.userData.wrap.matched, idx.length);
  const fitted = sm.geometry.attributes.position.array;
  for (let i = 0; i < coat.vertexCount; i += 13) assert.ok(Math.abs(fitted[i * 3] - coat.positions[i * 3] - 0.4 - 0.015 * coat.normals[i * 3]) < 1e-3, `vertex ${i} moved with the cage`);
  // skinned on the rig's own bind pose: at rest the skinned vertices stay where the fit put them
  rig.object.updateMatrixWorld(true);
  const v = new THREE.Vector3(), skinned = sm.getVertexPosition ? sm.getVertexPosition(0, v) : sm.boneTransform(0, v);
  const local = skinned.clone();
  assert.ok(local.distanceTo(new THREE.Vector3().fromArray(fitted, 0)) < 1e-4);
  // a garment without wrap data, or a body without cages, keeps the old behaviour
  const plain = createRig({}).addLayeredClothing(coat, { wrap: { inner } });
  assert.equal(plain.userData.wrap, undefined);
  assert.deepEqual([...plain.geometry.attributes.position.array.slice(0, 6)], [...coat.positions.slice(0, 6)]);
});
