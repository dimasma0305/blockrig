import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createRig } from "../src/rig.js";
import { R15_BIND, R15_FLOOR } from "../src/skeleton.js";
import { makeCoat } from "../src/garment.js";
import { parseMesh } from "../src/mesh.js";
import { writeMesh } from "../src/writer.js";
import { skinnedWorld, r3 } from "./helpers/skin.js";

const close = (a, b, eps = 1e-4) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) <= eps, `${a} != ${b}`));
// character space -> world: the stage turns 180° about Y and lifts the feet to y = 0
const toWorld = ([x, y, z]) => [-x, y - R15_FLOOR, -z];

test("rig: bind pose matches the R15 joint table; feet stand on y = 0", () => {
  const rig = createRig();
  for (const b of R15_BIND) close(rig.jointPosition(b.name).toArray(), toWorld(b.pos));
  const box = new THREE.Box3().setFromObject(rig.parts.LeftFoot);
  assert.ok(Math.abs(box.min.y) < 1e-6);
});

test("rig: joint rotations use the character's own axes", () => {
  const rig = createRig();
  const dir = (a, b) => rig.jointPosition(b).sub(rig.jointPosition(a)).normalize().toArray();
  // forearm and shin bones are vertical at rest, so their direction shows the joint rotation directly
  // arm straight up (+X by PI)
  rig.setPose({ RightUpperArm: [Math.PI, 0, 0] });
  close(dir("RightLowerArm", "RightHand"), [0, 1, 0]);
  // arm forward (+X by PI/2): character forward is -Z, which faces +Z in world after the stage turn
  rig.setPose({ RightUpperArm: [Math.PI / 2, 0, 0] });
  close(dir("RightLowerArm", "RightHand"), [0, 0, 1]);
  // right arm out to the side (+Z): the character's right is +X in character space, -X in world
  rig.setPose({ RightUpperArm: [0, 0, Math.PI / 2] });
  close(dir("RightLowerArm", "RightHand"), [-1, 0, 0]);
  // left leg forward
  rig.setPose({ LeftUpperLeg: [Math.PI / 2, 0, 0] });
  close(dir("LeftLowerLeg", "LeftFoot"), [0, 0, 1]);
  // knee bend (-X) folds the shin backwards
  rig.setPose({ LeftLowerLeg: [-Math.PI / 2, 0, 0] });
  close(dir("LeftLowerLeg", "LeftFoot"), [0, 0, -1]);
  // child joints inherit: bend the elbow on a raised arm
  rig.setPose({ RightUpperArm: [Math.PI, 0, 0], RightLowerArm: [Math.PI / 2, 0, 0] });
  close(dir("RightLowerArm", "RightHand"), [0, 0, -1]);
});

test("rig: resetPose, setPose and nudgeJoint", () => {
  const rig = createRig();
  const bind = rig.jointPosition("RightHand").toArray();
  rig.setPose({ RightUpperArm: [1, 0.2, 0.3], rootOffset: [0, 1, 0] });
  assert.notDeepEqual(r3(rig.jointPosition("RightHand")), r3(new THREE.Vector3(...bind)));
  rig.resetPose();
  close(rig.jointPosition("RightHand").toArray(), bind);
  rig.setPose({ rootOffset: [0, 1, 0] });
  close(rig.jointPosition("RightHand").toArray(), [bind[0], bind[1] + 1, bind[2]]);
  rig.resetPose(); rig.setJoint("Neck", 0.3, 0, 0); const once = rig.neck.quaternion.clone();
  rig.resetPose(); rig.nudgeJoint("Neck", 0.15, 0, 0); rig.nudgeJoint("Neck", 0.15, 0, 0);
  assert.ok(once.angleTo(rig.neck.quaternion) < 1e-6);
  assert.equal(rig.setJoint("Tail", 1, 0, 0), false);
});

test("layered clothing: bind pose is identity, posed vertices follow their bones", () => {
  const rig = createRig({ body: false });
  const coat = makeCoat();
  const sm = rig.addLayeredClothing(parseMesh(writeMesh(coat, "4.00")));
  // every vertex sits where the file put it (character space -> world)
  for (let i = 0; i < coat.vertexCount; i += 9) close(skinnedWorld(sm, i).toArray(), toWorld(Array.from(coat.positions.slice(i * 3, i * 3 + 3))), 2e-3);
  // a cuff vertex (fully LowerArm) moves exactly like the lower-arm bone
  const cuff = [...Array(coat.vertexCount).keys()].find((i) => coat.skinWeight[i * 4] > 0.999 && coat.bones[coat.skinIndex[i * 4]].name === "RightLowerArm");
  assert.ok(cuff !== undefined);
  const before = skinnedWorld(sm, cuff), boneBefore = rig.jointPosition("RightLowerArm");
  rig.setPose({ RightUpperArm: [Math.PI, 0, 0] });
  const after = skinnedWorld(sm, cuff), boneAfter = rig.jointPosition("RightLowerArm");
  assert.ok(after.y > before.y + 1.5, "cuff should rise with the raised arm");
  // distance to the bone is preserved by a rigid weight
  assert.ok(Math.abs(after.distanceTo(boneAfter) - before.distanceTo(boneBefore)) < 1e-3);
});

test("layered clothing: a garment made on a slightly different skeleton is retargeted onto the rig", () => {
  const rig = createRig({ body: false });
  const coat = makeCoat();
  const shifted = { ...coat, positions: coat.positions.map((v, i) => (i % 3 === 2 ? v - 0.067 : v)), bones: coat.bones.map((b) => ({ ...b, cframe: { rot: b.cframe.rot, pos: [b.cframe.pos[0], b.cframe.pos[1], b.cframe.pos[2] - 0.067] } })) };
  const sm = rig.addLayeredClothing(shifted);
  // each vertex keeps its offset from its own bones, so it lands where the unshifted coat would
  for (let i = 0; i < coat.vertexCount; i += 13) close(skinnedWorld(sm, i).toArray(), toWorld(Array.from(coat.positions.slice(i * 3, i * 3 + 3))), 2e-3);
});

test("layered clothing: errors", () => {
  const rig = createRig();
  const coat = makeCoat();
  assert.throws(() => rig.addLayeredClothing({ ...coat, skinIndex: null }), /no skinning/);
  assert.throws(() => rig.addLayeredClothing({ ...coat, bones: coat.bones.map((b, i) => (i === 3 ? { ...b, name: "Wing" } : b)) }), /Wing/);
});

test("accessory: attachment matching welds the handle to the head", () => {
  const rig = createRig();
  const tri = { vertexCount: 3, faceCount: 1, positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), normals: new Float32Array(9), uvs: new Float32Array(6), indices: new Uint32Array([0, 1, 2]), lods: [0, 1] };
  // the handle's own HairAttachment is 0.4 below its origin, so the origin lands 0.4 above the head top
  const m = rig.addAccessory(tri, { attachment: { name: "HairAttachment", cframe: { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, -0.4, 0] } } });
  rig.object.updateMatrixWorld(true);
  const neckY = rig.jointPosition("Neck").y;
  close([m.getWorldPosition(new THREE.Vector3()).y], [neckY + 1.2 + 0.4]);
  assert.throws(() => rig.addAccessory(tri, { attachment: { name: "TailAttachment", cframe: { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, 0, 0] } } }), /unsupported/);
});
