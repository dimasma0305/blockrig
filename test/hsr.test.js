// Hidden Surface Removal: body surfaces under layered clothing are not drawn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { occluder, triangleCoverage, coveredTriangles } from "../src/hsr.js";
import { createRig } from "../src/rig.js";
import { makeCoat } from "../src/garment.js";

// a 2x2 square at z = 0.1 facing +z, as the occluder
const square = occluder(new Float32Array([-1, -1, 0.1, 1, -1, 0.1, 1, 1, 0.1, -1, 1, 0.1]), new Uint32Array([0, 1, 2, 0, 2, 3]));

test("a triangle under the garment is covered, one outside or facing away is not", () => {
  assert.equal(triangleCoverage([-0.5, -0.5, 0], [0.5, -0.5, 0], [0, 0.5, 0], square), 4);
  assert.equal(triangleCoverage([3, 3, 0], [4, 3, 0], [3.5, 4, 0], square), 0);
  assert.equal(triangleCoverage([-0.5, -0.5, 0], [0, 0.5, 0], [0.5, -0.5, 0], square), 0); // faces -z
  assert.equal(triangleCoverage([-0.5, -0.5, -2], [0.5, -0.5, -2], [0, 0.5, -2], square), 0); // too far below
  const half = triangleCoverage([0.5, -0.5, 0], [2.5, -0.5, 0], [1.5, 0.5, 0], square);
  assert.ok(half > 0 && half < 4);
  const flags = coveredTriangles(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0, 3, 3, 0, 4, 3, 0, 3.5, 4, 0]), null, square);
  assert.deepEqual([...flags], [1, 0]);
});

test("layered clothing hides the body under it (HSR), and hideCovered: false keeps it", () => {
  const rig = createRig({ outline: 0.03 });
  const tris = (m) => m.geometry.attributes.position.count / 3;
  rig.addLayeredClothing(makeCoat());
  for (const p of ["UpperTorso", "LeftUpperArm", "RightUpperArm"]) assert.ok(rig.parts[p].userData.hiddenTriangles >= 10, p);
  for (const p of ["LeftHand", "RightHand", "LeftFoot", "RightFoot"]) { assert.equal(rig.parts[p].userData.hiddenTriangles, 0, p); assert.equal(tris(rig.parts[p]), 12, p); }
  assert.equal(rig.parts.Head.userData.hiddenTriangles, undefined);
  // the outline shell shares the part's geometry, so it is trimmed too
  assert.equal(rig.parts.UpperTorso.userData.outline.geometry, rig.parts.UpperTorso.geometry);
  const plain = createRig({}); plain.addLayeredClothing(makeCoat(), { hideCovered: false });
  assert.equal(plain.parts.UpperTorso.userData.hiddenTriangles, 0);
  assert.equal(tris(plain.parts.UpperTorso), 12);
});
