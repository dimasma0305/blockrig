import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createRig, Animator, clips } from "../src/index.js";

// a point of the rig in world space (the rig sits at the origin, facing +Z on screen)
const world = (rig, name) => rig.jointPosition(name);
// the hand part's centre where the hand is now (the blocky hand is a box centred on the part)
const handCentre = (rig) => { rig.object.updateMatrixWorld(true); return new THREE.Box3().setFromObject(rig.parts.RightHand).getCenter(new THREE.Vector3()); };

test("HipHeight: measured from the body, and setting it raises the body", () => {
  const rig = createRig({}), y0 = world(rig, "LowerTorso").y;
  assert.ok(Math.abs(rig.hipHeight - 2.048) < 1e-3, "classic R15: the root part's bottom ~2 studs up");
  assert.equal(createRig({ rigType: "R6" }).hipHeight, 0, "R6 counts from the top of its legs");
  assert.ok(Math.abs(createRig({ scale: { height: 1.5 } }).hipHeight - 2.048 * 1.5) < 1e-3, "scales with the body");
  rig.hipHeight = 3;
  assert.ok(Math.abs(world(rig, "LowerTorso").y - y0 - (3 - 2.048)) < 1e-6);
  rig.resetPose(); assert.ok(Math.abs(world(rig, "LowerTorso").y - y0 - (3 - 2.048)) < 1e-6, "kept through resetPose");
});

test("IKControl Position: the hand reaches a reachable target; an unreachable one is pointed at", () => {
  const rig = createRig({}), shoulder = world(rig, "RightUpperArm");
  const target = shoulder.clone().add(new THREE.Vector3(0.4, 0.3, 0.9)); // in front of the shoulder (screen +Z is the rig's front)
  const c = rig.addIKControl({ type: "Position", chainRoot: "RightUpperArm", endEffector: "RightHand", target });
  rig.solveIK();
  assert.ok(handCentre(rig).distanceTo(target) < 2e-3, `reached: ${handCentre(rig).distanceTo(target)}`);
  c.target = shoulder.clone().add(new THREE.Vector3(0, 0, 10));
  rig.resetPose(); rig.solveIK();
  const dir = handCentre(rig).sub(shoulder).normalize();
  assert.ok(dir.z > 0.95, "stretched straight at it");
  assert.equal(rig.ikControls.length, 1); rig.removeIKControl(c); assert.equal(rig.ikControls.length, 0);
  assert.throws(() => { rig.addIKControl({ chainRoot: "RightHand", endEffector: "RightUpperArm", target }); rig.solveIK(); }, /not below/);
});

test("IKControl weight blends from the animated pose, pole picks the elbow bend", () => {
  const solved = createRig({}), half = createRig({}), target = world(solved, "RightUpperArm").add(new THREE.Vector3(0.3, -0.4, 0.8));
  solved.addIKControl({ chainRoot: "RightUpperArm", endEffector: "RightHand", target }); solved.solveIK();
  half.addIKControl({ chainRoot: "RightUpperArm", endEffector: "RightHand", target, weight: 0.5 }); half.solveIK();
  const rest = createRig({}).bones.RightUpperArm.quaternion, q = solved.bones.RightUpperArm.quaternion, h = half.bones.RightUpperArm.quaternion;
  assert.ok(Math.abs(rest.angleTo(h) - rest.angleTo(q) / 2) < 1e-3, "half way");
  // the elbow goes towards the pole: up, then down
  const elbowY = (pole) => { const r = createRig({}); r.addIKControl({ chainRoot: "RightUpperArm", endEffector: "RightHand", target, pole }); r.solveIK(); return world(r, "RightLowerArm").y; };
  const s = world(solved, "RightUpperArm");
  assert.ok(elbowY(s.clone().add(new THREE.Vector3(0, 5, 0))) > elbowY(s.clone().add(new THREE.Vector3(0, -5, 0))) + 0.2);
});

test("IKControl Rotation and LookAt turn the part", () => {
  const rig = createRig({}), probe = new THREE.Object3D();
  probe.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.6); probe.updateMatrixWorld(true);
  rig.addIKControl({ type: "Rotation", chainRoot: "Head", endEffector: "Head", target: probe }); rig.solveIK();
  rig.object.updateMatrixWorld(true);
  assert.ok(rig.head.getWorldQuaternion(new THREE.Quaternion()).angleTo(probe.quaternion) < 1e-5, "the head takes the target's orientation");
  const look = createRig({}), target = new THREE.Vector3(3, 5, 6);
  look.addIKControl({ type: "LookAt", chainRoot: "UpperTorso", endEffector: "Head", target }); look.solveIK();
  look.object.updateMatrixWorld(true);
  const front = new THREE.Vector3(0, 0, -1).applyQuaternion(look.head.getWorldQuaternion(new THREE.Quaternion()));
  const want = target.clone().sub(look.head.localToWorld(new THREE.Vector3(0, 0.6, 0))).normalize();
  assert.ok(front.angleTo(want) < 0.02, `head faces the target (${front.angleTo(want)})`);
  assert.ok(createRig({}).bones.UpperTorso.quaternion.angleTo(look.bones.UpperTorso.quaternion) > 0.05, "the torso shares the turn");
});

test("the Animator applies IK on top of the animation", () => {
  const rig = createRig({}), an = new Animator(rig), target = world(rig, "RightUpperArm").add(new THREE.Vector3(0.2, 0.6, 0.9));
  const marker = rig.attachTo(new THREE.Object3D(), "RightGripAttachment"); // shows where the grip point is
  rig.addIKControl({ chainRoot: "RightUpperArm", endEffector: "RightGripAttachment", target });
  an.play(clips.idle, { fade: 0 });
  for (let i = 0; i < 5; i++) {
    an.update(0.2); rig.object.updateMatrixWorld(true);
    assert.ok(marker.getWorldPosition(new THREE.Vector3()).distanceTo(target) < 2e-3, "the grip stays on the target while idling");
  }
  assert.ok(world(rig, "LeftUpperArm").distanceTo(createRig({}).jointPosition("LeftUpperArm")) < 0.2, "the rest of the body still animates");
});
