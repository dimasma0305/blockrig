import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createRig, describeTool, parseRbxm, defaultBodyAttachments, buildBody, ATTACHMENT_ROT } from "../src/index.js";
import { writeRbxm } from "./helpers/rbxm-writer.js";

const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const near = (a, b, eps = 1e-5) => a.every((v, i) => Math.abs(v - b[i]) < eps);
// a point / direction of an object, in character space (the rig's stage)
const inChar = (rig, obj, local = [0, 0, 0]) => { rig.object.updateMatrixWorld(true); return new THREE.Vector3(...local).applyMatrix4(obj.matrixWorld).applyMatrix4(rig.stage.matrixWorld.clone().invert()).toArray(); };
const dirChar = (rig, obj, d) => { const a = new THREE.Vector3(...inChar(rig, obj)), b = new THREE.Vector3(...inChar(rig, obj, d)); return b.sub(a).normalize().toArray(); };

test("weld: Object = Part * C0 * C1^-1, following the part", () => {
  const rig = createRig({}), obj = new THREE.Object3D();
  const ut = rig.partCFrame("UpperTorso");
  rig.weld(obj, "UpperTorso", { c0: { rot: I3, pos: [0, 0, 0.5] }, c1: { rot: I3, pos: [0, 0.2, 0] } });
  assert.ok(near(inChar(rig, obj), [ut.pos[0], ut.pos[1] - 0.2, ut.pos[2] + 0.5]));
  assert.equal(rig.welds.get(obj), "UpperTorso");
  // the weld follows the part: turn the waist 90 degrees about Y
  rig.setJoint("UpperTorso", 0, Math.PI / 2, 0);
  const after = inChar(rig, obj), waist = rig.body.bind.find((b) => b.name === "UpperTorso").pos;
  assert.ok(Math.abs(Math.hypot(after[0] - waist[0], after[2] - waist[2]) - 0.5) < 1e-4, "swings round the waist");
  rig.unweld(obj); assert.equal(obj.parent, null); assert.equal(rig.welds.size, 0);
  assert.throws(() => rig.weld(new THREE.Object3D(), "Tail"), /no body part/);
});

test("weld to the head: studs and object size are not scaled by the head scale", () => {
  const rig = createRig({ scale: { head: 2 } }), obj = new THREE.Object3D();
  const h = rig.partCFrame("Head");
  rig.weld(obj, "Head", { c0: { rot: I3, pos: [0, 1, 0] } });
  assert.ok(near(inChar(rig, obj), [h.pos[0], h.pos[1] + 1, h.pos[2]]));
  rig.object.updateMatrixWorld(true);
  assert.ok(Math.abs(new THREE.Vector3().setFromMatrixScale(obj.matrixWorld).x - 1) < 1e-6, "unit scale");
  const neck = rig.body.neck.pos; assert.ok(Math.abs(h.pos[1] - (neck[1] + 0.6 * 2)) < 1e-6, "the head's centre grows with the head");
});

test("attachTo: lines the object's attachment up with a body or head attachment", () => {
  const rig = createRig({}), pack = new THREE.Object3D(), hat = new THREE.Object3D();
  rig.attachTo(pack, "BodyBackAttachment", { rot: I3, pos: [0, 0, -0.35] });
  const back = rig.bodyAttachments.BodyBackAttachment.pos;
  assert.ok(near(inChar(rig, pack), [back[0], back[1], back[2] + 0.35]), "the pack's centre sits 0.35 behind the attachment");
  rig.attachTo(hat, "HatAttachment");
  const n = rig.body.neck.pos, a = rig.headAttachments.HatAttachment;
  assert.ok(near(inChar(rig, hat), [n[0] + a[0], n[1] + a[1], n[2] + a[2]]));
  assert.throws(() => rig.attachTo(new THREE.Object3D(), "NopeAttachment"), /no attachment/);
});

test("equipTool: RightGrip = hand * RightGripAttachment * Grip^-1 (the Linked Sword stands up in the tool hold)", () => {
  // the classic sword's Tool.Grip; its blade runs along the handle's +Z, gripped at z = -1.5
  const grip = { rot: [0, 0, 1, 1, 0, 0, 0, 1, 0], pos: [0, 0, -1.5] };
  for (const [opts, arm] of [[{}, "RightUpperArm"], [{ rigType: "R6" }, "Right Arm"]]) {
    const rig = createRig(opts), sword = new THREE.Object3D();
    assert.equal(rig.equipTool(sword, { grip }), sword); assert.equal(rig.tool, sword);
    // at rest the grip point is on the RightGripAttachment
    assert.ok(near(inChar(rig, sword, [0, 0, -1.5]), rig.bodyAttachments.RightGripAttachment.pos, 1e-4), `${arm}: gripped at the hand`);
    rig.setJoint(arm, Math.PI / 2, 0, 0); // arm straight forward, Roblox's "toolnone" hold
    assert.ok(near(dirChar(rig, sword, [0, 0, 1]), [0, 1, 0], 1e-4), `${arm}: blade points up`);
    const other = new THREE.Object3D(); rig.equipTool(other);
    assert.equal(sword.parent, null, "one tool at a time"); assert.equal(rig.unequipTool(), other); assert.equal(rig.tool, null);
  }
  const at = defaultBodyAttachments(buildBody({ shape: "classic" }));
  assert.deepEqual(at.RightGripAttachment.rot, ATTACHMENT_ROT.RightGripAttachment, "grips turn -90 degrees about X");
});

test("describeTool reads Grip and the Handle's mesh", () => {
  const S = 0x01, V3 = 0x0e, CF = 0x10, B = 0x02;
  const tool = { className: "Tool", props: { Name: [S, "Sword"], Grip: [CF, { rot: [0, 0, 1, 1, 0, 0, 0, 1, 0], pos: [0, 0, -1.5] }], RequiresHandle: [B, true] }, children: [
    { className: "Part", props: { Name: [S, "Handle"], size: [V3, [1, 0.8, 4]] }, children: [
      { className: "SpecialMesh", props: { Name: [S, "Mesh"], MeshId: [S, "rbxassetid://111"], TextureId: [S, "rbxassetid://222"], Scale: [V3, [1, 1, 1]], Offset: [V3, [0, 0, 0]] } },
    ] },
  ] };
  const d = describeTool(parseRbxm(writeRbxm([tool])));
  assert.equal(d.name, "Sword"); assert.deepEqual(d.grip.pos, [0, 0, -1.5]);
  assert.equal(d.handle.meshId, 111); assert.equal(d.handle.textureId, 222);
  assert.ok(near(d.handle.size, [1, 0.8, 4]));
});
