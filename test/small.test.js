import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createRig, createFace, describeBodyColors, parseRbxm, BRICK_COLORS, brickColorHex, meshFromGeometry, headGeometry, HEAD_CORNER } from "../src/index.js";
import { writeRbxm } from "./helpers/rbxm-writer.js";
import { mockCanvas } from "./helpers/mock-canvas.js";

const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const meshes = (rig) => { const out = []; rig.object.traverse((o) => { if (o.isMesh) out.push(o); }); return out; };

test("BrickColor: the palette, and legacy BodyColors numbers", () => {
  assert.equal(Object.keys(BRICK_COLORS).length, 208);
  assert.deepEqual(BRICK_COLORS[24], ["Bright yellow", 245, 205, 48]);
  assert.equal(brickColorHex(23), "#0d69ac"); assert.equal(brickColorHex(99999), null);
  const S = 0x01, BC = 0x0b, C3 = 0x0c;
  const legacy = { className: "BodyColors", props: { Name: [S, "Body Colors"], HeadColor: [BC, 24], TorsoColor: [BC, 23], LeftArmColor: [BC, 24], RightArmColor: [BC, 24], LeftLegColor: [BC, 119], RightLegColor: [BC, 119], HeadColor3: [C3, [1, 1, 1]] } };
  const c = describeBodyColors(parseRbxm(writeRbxm([legacy])));
  assert.equal(c.HeadColor3, "#ffffff", "Color3 wins when present");
  assert.equal(c.TorsoColor3, "#0d69ac"); assert.equal(c.LeftLegColor3, "#a4bd47");
});

test("three.js geometry works wherever a parsed mesh does", () => {
  const rig = createRig({});
  const box = new THREE.BoxGeometry(1, 1, 1), m = meshFromGeometry(box);
  assert.equal(m.faceCount, 12); assert.equal(m.vertexCount, 24);
  const acc = rig.addAccessory(box, { attachment: { name: "HatAttachment", cframe: { rot: I3, pos: [0, -0.5, 0] } } });
  assert.equal(acc.geometry.index.count, 36);
  rig.setBodyPart("LeftHand", new THREE.SphereGeometry(0.3));
  rig.setHead(new THREE.BoxGeometry(1.2, 1.2, 1.2), { attachments: { NeckRigAttachment: [0, -0.6, 0] } });
  const nonIndexed = createRig({ bodyParts: { LeftHand: { mesh: new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), size: [0.5, 0.3, 0.5] } } });
  assert.ok(new THREE.Box3().setFromObject(nonIndexed.parts.LeftHand).getSize(new THREE.Vector3()).distanceTo(new THREE.Vector3(0.5, 0.3, 0.5)) < 1e-4);
});

test("shadows: one option, outlines never cast, later parts follow", () => {
  const rig = createRig({ shadows: true, outline: 0.03 });
  const ms = meshes(rig), outlines = ms.filter((m) => m.material.userData.blockrigOutline), solid = ms.filter((m) => !m.material.userData.blockrigOutline);
  assert.ok(outlines.length > 0 && solid.length > 0);
  assert.ok(solid.every((m) => m.castShadow && m.receiveShadow)); assert.ok(outlines.every((m) => !m.castShadow));
  const hat = rig.addAccessory(new THREE.BoxGeometry(1, 0.3, 1), { attachment: { name: "HatAttachment", cframe: { rot: I3, pos: [0, 0, 0] } } });
  assert.ok(hat.castShadow, "added after creation");
  rig.setShadows(false); assert.ok(meshes(rig).every((m) => !m.castShadow && !m.receiveShadow));
  assert.ok(meshes(createRig({})).every((m) => !m.castShadow), "off by default");
});

test("rig.update() runs faces and IK without an Animator", () => {
  const rig = createRig({}), target = rig.jointPosition("RightUpperArm").add(new THREE.Vector3(0, 0.5, 1));
  const marker = rig.attachTo(new THREE.Object3D(), "RightGripAttachment");
  rig.addIKControl({ chainRoot: "RightUpperArm", endEffector: "RightGripAttachment", target });
  rig.update(0.016); rig.object.updateMatrixWorld(true);
  assert.ok(marker.getWorldPosition(new THREE.Vector3()).distanceTo(target) < 2e-3);
});

test("clone(): the same character, independent", () => {
  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5));
  const rig = createRig({ bodyColors: { TorsoColor3: "#123456" }, outline: 0.02 });
  rig.addAccessory(new THREE.BoxGeometry(1, 0.3, 1), { attachment: { name: "HatAttachment", cframe: { rot: I3, pos: [0, 0, 0] } } });
  rig.weld(prop, "RightHand", { c0: { rot: I3, pos: [0, -0.4, 0] } });
  rig.addIKControl({ type: "LookAt", chainRoot: "UpperTorso", endEffector: "Head", target: new THREE.Vector3(0, 5, 5), weight: 0.5 });
  rig.hipHeight = 2.5;
  rig.setBodyColors({ LeftArmColor3: "#abcdef" });
  const c = rig.clone();
  assert.equal(meshes(c).length, meshes(rig).length);
  assert.equal(c.welds.size, 1); assert.notEqual([...c.welds.keys()][0], prop, "welded objects are cloned");
  assert.equal(c.ikControls.length, 1); assert.notEqual(c.ikControls[0], rig.ikControls[0]);
  assert.ok(Math.abs(c.hipHeight - 2.5) < 1e-9);
  assert.equal(c.avatar.bodyColors.LeftArm, "#abcdef"); assert.equal(c.avatar.bodyColors.Torso, "#123456");
  c.hipHeight = 1; c.setJoint("RightUpperArm", 1, 0, 0);
  assert.ok(Math.abs(rig.hipHeight - 2.5) < 1e-9, "independent");
  assert.ok(rig.bones.RightUpperArm.quaternion.angleTo(createRig({}).bones.RightUpperArm.quaternion) < 1e-9);
  // a live face is shared unless the clone gets its own
  const face = createFace({ canvas: mockCanvas() }), withFace = createRig({ face });
  assert.equal(withFace.clone().face, face); const own = createFace({ canvas: mockCanvas() }); assert.equal(withFace.clone({ face: own }).face, own);
});

test("dispose(): frees what the rig made, leaves what you passed in", () => {
  const userTex = new THREE.Texture(), prop = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  const rig = createRig({ outline: 0.02 }), scene = new THREE.Scene(); scene.add(rig.object);
  const hat = rig.addAccessory(new THREE.BoxGeometry(1, 0.3, 1), { attachment: { name: "HatAttachment", cframe: { rot: I3, pos: [0, 0, 0] } }, map: userTex });
  rig.weld(prop, "RightHand");
  const disposed = new Set(); const watch = (x) => x.addEventListener("dispose", () => disposed.add(x));
  meshes(rig).forEach((m) => { watch(m.geometry); watch(m.material); });
  watch(userTex); watch(prop.geometry);
  rig.dispose();
  assert.equal(rig.object.parent, null, "taken out of the scene");
  assert.ok(disposed.has(hat.geometry) && disposed.has(hat.material) && disposed.has(rig.parts.UpperTorso.geometry));
  assert.ok(!disposed.has(userTex), "your texture stays"); assert.ok(!disposed.has(prop.geometry), "your welded prop stays");
  assert.equal(rig.welds.size, 0);
});

test("addAccessory: textured accessories cut out transparent texels (alphaTest), untextured ones don't", () => {
  const rig = createRig({});
  const quad = { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), normals: new Float32Array(9), uvs: new Float32Array(6), indices: new Uint32Array([0, 1, 2]), vertexCount: 3, faceCount: 1, lods: [0, 1] };
  const att = { name: "FaceCenterAttachment", cframe: { rot: I3, pos: [0, 0, 0] } };
  const withMap = rig.addAccessory(quad, { attachment: att, map: new THREE.Texture() });
  const plain = rig.addAccessory(quad, { attachment: att });
  assert.equal(withMap.material.alphaTest, 0.5);
  assert.equal(plain.material.alphaTest, 0);
});

test("meshes without normals (all zero) get computed normals, so they don't render black", () => {
  const rig = createRig({});
  const tri = { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), normals: new Float32Array(9), uvs: new Float32Array(6), indices: new Uint32Array([0, 1, 2]), vertexCount: 3, faceCount: 1, lods: [0, 1] };
  const m = rig.addAccessory(tri, { attachment: { name: "FaceCenterAttachment", cframe: { rot: I3, pos: [0, 0, 0] } } });
  const nz = m.geometry.attributes.normal.getZ(0);
  assert.ok(Math.abs(nz) > 0.99, `normal z ${nz}`);
});

test("headGeometry matches the Roblox classic head that face-accessory shells wrap", () => {
  // the profile measured from catalog face shells (scaled to the 1.2-stud head): radius at heights 0, 0.45, 0.55
  const g = headGeometry(), p = g.attributes.position;
  // the lathe profile (height -> radius), interpolated between its points
  const prof = new Map(); for (let i = 0; i < p.count; i++) { const y = +p.getY(i).toFixed(5); prof.set(y, Math.max(prof.get(y) ?? 0, Math.hypot(p.getX(i), p.getZ(i)))); }
  const pts = [...prof].sort((a, b) => a[0] - b[0]);
  const radiusAt = (y) => { for (let i = 1; i < pts.length; i++) if (pts[i][0] >= y) { const [y0, r0] = pts[i - 1], [y1, r1] = pts[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0 || 1); } return 0; };
  assert.ok(Math.abs(radiusAt(0) - 0.6) < 0.01, `middle ${radiusAt(0)}`);
  assert.ok(radiusAt(0.45) <= 0.575 && radiusAt(0.45) >= 0.54, `|y|=0.45: ${radiusAt(0.45)}`);
  assert.ok(radiusAt(0.55) <= 0.5 && radiusAt(0.55) >= 0.44, `|y|=0.55: ${radiusAt(0.55)}`);
  assert.equal(HEAD_CORNER, 0.29);
});

test("meshes with non-finite vertices: their triangles are dropped, bounds stay finite", () => {
  const rig = createRig({});
  const m = { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, NaN, 0, 0]), normals: new Float32Array(12), uvs: new Float32Array(8),
    indices: new Uint32Array([0, 1, 2, 1, 3, 2]), vertexCount: 4, faceCount: 2, lods: [0, 2] };
  const acc = rig.addAccessory(m, { attachment: { name: "HatAttachment", cframe: { rot: I3, pos: [0, 0, 0] } } });
  const geo = acc.geometry;
  assert.equal(geo.index.count, 3); // only the good triangle
  geo.computeBoundingSphere();
  assert.ok(Number.isFinite(geo.boundingSphere.radius));
});
