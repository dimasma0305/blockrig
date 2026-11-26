import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { cframeToMatrix, matrixToCFrame, motor6D, accessoryWeld } from "../src/cframe.js";

const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const pos = (m) => new THREE.Vector3().setFromMatrixPosition(m).toArray().map((v) => +v.toFixed(6) + 0);

test("cframe <-> Matrix4 round-trip (row-major rotation, columns are the basis vectors)", () => {
  const cf = { rot: [0, 0, 1, 0, 1, 0, -1, 0, 0], pos: [1, 2, 3] }; // 90° about Y
  const m = cframeToMatrix(cf);
  // RightVector (first column) of a 90° Y turn is (0, 0, -1)
  assert.deepEqual(new THREE.Vector3().setFromMatrixColumn(m, 0).toArray(), [0, 0, -1]);
  assert.deepEqual(matrixToCFrame(m), cf);
  assert.deepEqual(matrixToCFrame(cframeToMatrix([1, 2, 3, 0, 0, 1, 0, 1, 0, -1, 0, 0])), cf);
});

test("motor6D: Part1 = Part0 * C0 * Transform * C1^-1", () => {
  // shoulder 1.5 right of the torso centre; arm's own attachment 0.5 above the arm centre
  const part0 = T(0, 3, 0), c0 = T(1.5, 0.8, 0), c1 = T(0, 0.5, 0);
  assert.deepEqual(pos(motor6D(part0, c0, new THREE.Matrix4(), c1)), [1.5, 3.3, 0]);
  // swing the arm 180° about X at the shoulder: the arm centre goes above the shoulder
  const up = motor6D(part0, c0, new THREE.Matrix4().makeRotationX(Math.PI), c1);
  assert.deepEqual(pos(up), [1.5, 4.3, 0]);
});

test("accessoryWeld: Handle = Body * BodyAtt * HandleAtt^-1 puts both attachments in the same place", () => {
  const body = T(0, 4.5, 0), bodyAtt = T(0, 0.6, 0), handleAtt = cframeToMatrix({ rot: [0, 0, 1, 0, 1, 0, -1, 0, 0], pos: [0.2, -0.4, 0] });
  const handle = accessoryWeld(body, bodyAtt, handleAtt);
  const a = new THREE.Matrix4().multiplyMatrices(handle, handleAtt), b = new THREE.Matrix4().multiplyMatrices(body, bodyAtt);
  a.elements.forEach((v, i) => assert.ok(Math.abs(v - b.elements[i]) < 1e-9));
});
