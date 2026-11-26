import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildBody, R15_SHAPES } from "../src/body.js";
import { R15_BIND } from "../src/skeleton.js";
import { createRig } from "../src/rig.js";
import { Animator } from "../src/animator.js";
import { clips } from "../src/clips.js";
import { makeCoat } from "../src/garment.js";
import { toR6, toR15 } from "../src/retarget.js";
import { skinnedWorld } from "./helpers/skin.js";

const close = (a, b, eps = 1e-4) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) <= eps, `${a} != ${b}`));
const bounds = (rig) => { rig.object.updateMatrixWorld(true); return new THREE.Box3().setFromObject(rig.object); };
const dir = (rig, a, b) => rig.jointPosition(b).sub(rig.jointPosition(a)).normalize().toArray();

test("classic R15 body reproduces the standard clothing skeleton exactly", () => {
  const b = buildBody();
  assert.equal(b.rigType, "R15");
  b.bind.forEach((x, i) => { assert.equal(x.name, R15_BIND[i].name); close(x.pos, R15_BIND[i].pos, 1e-9); });
});

for (const shape of Object.keys(R15_SHAPES)) {
  test(`R15 shape "${shape}": stands on the floor, is symmetric, and its parts touch their joints`, () => {
    const rig = createRig({ shape });
    const box = bounds(rig);
    assert.ok(Math.abs(box.min.y) < 1e-6, `feet at ${box.min.y}`);
    assert.ok(Math.abs(box.max.x + box.min.x) < 1e-6, "left/right symmetric");
    for (const side of ["Left", "Right"]) {
      const s = side === "Left" ? 1 : -1; // world x is mirrored by the stage turn
      assert.ok(Math.sign(rig.jointPosition(side + "Hand").x) === s && Math.sign(rig.jointPosition(side + "Foot").x) === s);
    }
    // every bone has a part, and each part's box contains (or touches) its joint
    for (const name of rig.joints.filter((j) => j !== "Neck" && j !== "HumanoidRootPart")) {
      const part = rig.parts[name]; assert.ok(part, `missing part ${name}`);
      const pb = new THREE.Box3().setFromObject(part).expandByScalar(0.6);
      assert.ok(pb.containsPoint(rig.jointPosition(name)), `${shape}: ${name} joint is away from its part`);
    }
  });
}

test("shapes differ the way their names say", () => {
  const h = (o) => bounds(createRig(o)).max.y, w = (o) => { const b = bounds(createRig(o)); return b.max.x - b.min.x; };
  assert.ok(h({ shape: "tall" }) > h({ shape: "classic" }) + 0.5);
  assert.ok(h({ shape: "child" }) < h({ shape: "classic" }) - 0.5);
  assert.ok(w({ shape: "buff" }) > w({ shape: "classic" }) + 0.5);
  assert.ok(w({ shape: "slender" }) < w({ shape: "classic" }) - 0.5);
});

test("scale: height/width/depth stretch about the feet; head scale only grows the head", () => {
  const base = createRig(), tall = createRig({ scale: { height: 1.5 } }), wide = createRig({ scale: { width: 2 } });
  close([tall.jointPosition("LowerTorso").y], [base.jointPosition("LowerTorso").y * 1.5], 1e-4);
  close([wide.jointPosition("RightHand").x], [base.jointPosition("RightHand").x * 2], 1e-4);
  const big = createRig({ scale: { head: 1.5 } });
  close(big.jointPosition("Neck").toArray(), base.jointPosition("Neck").toArray());
  const hb = (r) => { r.object.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(r.parts.Head); return b.max.y - b.min.y; };
  close([hb(big)], [hb(base) * 1.5], 1e-4);
  assert.throws(() => createRig({ scale: { height: 0 } }), /scale\.height/);
  assert.throws(() => createRig({ shape: "giraffe" }), /unknown shape/);
});

test("custom shape proportions are accepted as an object", () => {
  const rig = createRig({ shape: { top: 3, arm: 1.5 } });
  const b = bounds(rig);
  assert.ok(b.max.x - b.min.x > 5.9);
});

test("R6: six parts, classic pivots, 5.2 studs tall with the head", () => {
  const rig = createRig({ rigType: "R6" });
  assert.equal(rig.rigType, "R6");
  assert.deepEqual(rig.joints, ["HumanoidRootPart", "Torso", "Left Arm", "Right Arm", "Left Leg", "Right Leg", "Neck"]);
  const b = bounds(rig);
  close([b.min.y, b.max.y], [0, 5.2], 1e-3);
  // hip pivot sits at the top outer corner of the leg: (±1, 2) in character space -> world x mirrored
  close(rig.jointPosition("Left Leg").toArray(), [1, 2, 0]);
  close(rig.jointPosition("Right Arm").toArray(), [-1, 3.5, 0]);
  close(rig.jointPosition("Neck").toArray(), [0, 4, 0]);
  // raising an arm straight up uses the same axes convention as R15
  rig.setPose({ "Right Arm": [Math.PI, 0, 0] });
  rig.object.updateMatrixWorld(true);
  // the arm turns about its shoulder pivot (y 3.5): its centre goes from 3.0 to 4.0, its tip to 5.0
  const arm = new THREE.Box3().setFromObject(rig.parts["Right Arm"]);
  close([arm.getCenter(new THREE.Vector3()).y, arm.max.y], [4, 5], 1e-4);
  assert.throws(() => rig.addLayeredClothing(makeCoat()), /R15/);
});

test("R6: Head is an alias for the Neck joint", () => {
  const rig = createRig({ rigType: "R6" });
  rig.setJoint("Head", 0.4, 0, 0); const q = rig.neck.quaternion.clone();
  rig.resetPose(); rig.setJoint("Neck", 0.4, 0, 0);
  assert.ok(q.angleTo(rig.neck.quaternion) < 1e-9);
});

test("retarget: R15 clips play on R6 and back", () => {
  const r6clip = toR6(clips.run);
  assert.equal(r6clip.name, "run-r6");
  const joints = new Set(r6clip.keyframes.flatMap((k) => Object.keys(k.poses)));
  assert.deepEqual([...joints].sort(), ["HumanoidRootPart", "Left Arm", "Left Leg", "Neck", "Right Arm", "Right Leg", "Torso"]);
  const rig = createRig({ rigType: "R6" }), an = new Animator(rig);
  const before = rig.jointPosition("Torso").y;
  an.play(r6clip, { fade: 0 }); an.update(0.16); // mid-stride: the body is lifted
  assert.ok(rig.jointPosition("Torso").y > before + 0.2);
  const back = toR15(toR6(clips.wave));
  assert.ok(back.keyframes.every((k) => Object.keys(k.poses).every((j) => ["UpperTorso", "LeftUpperArm", "RightUpperArm", "LeftUpperLeg", "RightUpperLeg", "Neck", "HumanoidRootPart"].includes(j))));
  // LowerTorso falls back onto Torso when a keyframe has no UpperTorso key
  const lt = toR6({ name: "x", keyframes: [{ t: 0, poses: { LowerTorso: { r: [0.3, 0, 0] } } }] });
  assert.deepEqual(Object.keys(lt.keyframes[0].poses), ["Torso"]);
});

test("layered clothing follows other R15 shapes", () => {
  for (const shape of ["slender", "buff", "tall"]) {
    const rig = createRig({ shape, body: false });
    const sm = rig.addLayeredClothing(makeCoat());
    rig.setPose({ RightUpperArm: [Math.PI, 0, 0] });
    for (let i = 0; i < sm.geometry.attributes.position.count; i += 17) for (const v of skinnedWorld(sm, i).toArray()) assert.ok(Number.isFinite(v));
  }
});

test("setBodyPart swaps a blocky part for a mesh in the part's local space", () => {
  const rig = createRig();
  const cube = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const mesh = { positions: cube.attributes.position.array, normals: cube.attributes.normal.array, uvs: cube.attributes.uv.array, indices: Uint32Array.from(cube.index.array), lods: [0, cube.index.count / 3], faceCount: cube.index.count / 3 };
  const old = rig.parts.LeftUpperArm;
  const m = rig.setBodyPart("LeftUpperArm", mesh, { color: 0xff0000 });
  assert.equal(old.visible, false);
  assert.equal(rig.parts.LeftUpperArm, m);
  rig.object.updateMatrixWorld(true);
  const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()), oc = new THREE.Box3().setFromObject(old).getCenter(new THREE.Vector3());
  close(c.toArray(), oc.toArray(), 1e-4);
  rig.setPose({ LeftUpperArm: [Math.PI, 0, 0] });
  rig.object.updateMatrixWorld(true);
  assert.ok(new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).y > c.y + 0.3, "new part follows the joint");
  assert.throws(() => createRig({ rigType: "R6" }).setBodyPart("LeftUpperArm", mesh), /no body part/);
  rig.setBodyPart("Head", mesh);
  assert.equal(rig.parts.Head.parent, rig.head);
});
