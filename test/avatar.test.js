import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  buildBody, buildBodyFromParts, defaultR15Parts, defaultBodyAttachments, describeBodyParts, describeBodyColors, describeClothing,
  templateUVs, regionSlices, paintRegion, TEMPLATE, TEMPLATE_SIZE, createRig, parseRbxm,
} from "../src/index.js";
import { writeRbxm } from "./helpers/rbxm-writer.js";
import { mockCanvas } from "./helpers/mock-canvas.js";

const S = 0x01, V3 = 0x0e, CF = 0x10, C3 = 0x0c;
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const near = (a, b, eps = 1e-5) => a.every((v, i) => Math.abs(v - b[i]) < eps);
const bone = (body, n) => body.bind.find((b) => b.name === n).pos;

test("BuildRigFromAttachments: the standard parts rebuild the standard body", () => {
  const a = buildBody({ shape: "classic" }), b = buildBodyFromParts({});
  for (const x of a.bind) assert.ok(near(x.pos, bone(b, x.name)), x.name);
  assert.ok(near(a.neck.pos, b.neck.pos));
  assert.ok(Math.abs(a.floor - b.floor) < 1e-6);
  assert.equal(b.parts.length, 14); // every R15 part but the invisible HumanoidRootPart
});

test("BuildRigFromAttachments: joints follow the parts' rig attachments", () => {
  const d = defaultR15Parts(), up = d.LeftUpperArm;
  const longer = buildBodyFromParts({
    LeftUpperArm: {
      size: [1, up.size[1] + 0.4, 1],
      attachments: {
        LeftShoulderRigAttachment: { rot: I3, pos: up.attachments.LeftShoulderRigAttachment.map((v, i) => v + (i === 1 ? 0.2 : 0)) },
        LeftElbowRigAttachment: up.attachments.LeftElbowRigAttachment.map((v, i) => v - (i === 1 ? 0.2 : 0)),
      },
    },
  });
  const base = buildBodyFromParts({});
  assert.ok(near(bone(longer, "LeftUpperArm"), bone(base, "LeftUpperArm")), "shoulder stays on the torso");
  assert.ok(near(bone(longer, "LeftLowerArm"), bone(base, "LeftLowerArm").map((v, i) => v - (i === 1 ? 0.4 : 0))), "elbow moves down");
  assert.ok(near(bone(longer, "LeftHand"), bone(base, "LeftHand").map((v, i) => v - (i === 1 ? 0.4 : 0))), "the hand follows");
  assert.ok(near(bone(longer, "RightLowerArm"), bone(base, "RightLowerArm")), "other limbs are untouched");
  // a wider torso moves the shoulders out
  const wide = buildBodyFromParts({ UpperTorso: { size: [3, 1.6, 1], attachments: { LeftShoulderRigAttachment: [-1.5, 0.563, 0], RightShoulderRigAttachment: [1.5, 0.563, 0] } } });
  assert.ok(Math.abs(bone(wide, "LeftUpperArm")[0] + 1.5) < 1e-6 && Math.abs(bone(wide, "RightUpperArm")[0] - 1.5) < 1e-6);
});

test("BuildRigFromAttachments: longer legs lift the body and lower the floor stays under the feet", () => {
  const d = defaultR15Parts(), ll = d.LeftLowerLeg, rl = d.RightLowerLeg;
  const stretch = (p, side) => ({ size: [p.size[0], p.size[1] + 1, p.size[2]], attachments: { [`${side}KneeRigAttachment`]: p.attachments[`${side}KneeRigAttachment`].map((v, i) => v + (i === 1 ? 0.5 : 0)), [`${side}AnkleRigAttachment`]: p.attachments[`${side}AnkleRigAttachment`].map((v, i) => v - (i === 1 ? 0.5 : 0)) } });
  const b = buildBodyFromParts({ LeftLowerLeg: stretch(ll, "Left"), RightLowerLeg: stretch(rl, "Right") }), base = buildBodyFromParts({});
  assert.ok(Math.abs(b.floor - (base.floor - 1)) < 1e-6, "feet end 1 stud lower relative to the root");
  const rig = createRig({ bodyParts: { LeftLowerLeg: stretch(ll, "Left"), RightLowerLeg: stretch(rl, "Right") } });
  rig.object.updateMatrixWorld(true);
  const foot = new THREE.Box3().setFromObject(rig.parts.LeftFoot);
  assert.ok(Math.abs(foot.min.y) < 1e-4, "feet stand on y = 0");
});

test("BuildRigFromAttachments: attachments a part doesn't carry come from the standard body", () => {
  const b = buildBodyFromParts({ LeftHand: { size: [1, 0.3, 1] } }), base = buildBodyFromParts({});
  for (const x of base.bind) assert.ok(near(x.pos, bone(b, x.name)), x.name);
});

test("body attachments: defaults on the part faces, and accessories weld to them", () => {
  const body = buildBody({ shape: "classic" }), at = defaultBodyAttachments(body);
  const ut = body.parts.find((p) => p.bone === "UpperTorso");
  assert.equal(at.BodyBackAttachment.part, "UpperTorso");
  assert.ok(near(at.BodyBackAttachment.pos, [ut.center[0], ut.center[1], ut.center[2] + ut.size[2] / 2]));
  assert.equal(at.RightGripAttachment.part, "RightHand");
  assert.equal(defaultBodyAttachments(buildBody({ rigType: "R6" })).LeftGripAttachment.part, "Left Arm");

  const rig = createRig({});
  const box = new THREE.BoxGeometry(1, 1, 1), idx = box.index.array;
  const mesh = { positions: box.attributes.position.array, normals: box.attributes.normal.array, uvs: box.attributes.uv.array, indices: Uint32Array.from(idx), faceCount: idx.length / 3, lods: [0, idx.length / 3] };
  const acc = rig.addAccessory(mesh, { attachment: { name: "BodyBackAttachment", cframe: { rot: I3, pos: [0, 0, -0.5] } } });
  assert.equal(acc.parent, rig.bones.UpperTorso);
  // in character space the accessory's centre is half a stud behind the attachment
  rig.object.updateMatrixWorld(true);
  const w = acc.getWorldPosition(new THREE.Vector3()), stage = rig.stage.matrixWorld.clone().invert();
  const local = w.applyMatrix4(stage).toArray();
  assert.ok(near(local, [at.BodyBackAttachment.pos[0], at.BodyBackAttachment.pos[1], at.BodyBackAttachment.pos[2] + 0.5], 1e-4));
});

test("clothing template: faces map to the right rects, seen from the character's side", () => {
  const g = new THREE.BoxGeometry(2, 2, 1), pos = g.attributes.position.array, nrm = g.attributes.normal.array;
  const uv = templateUVs(pos, nrm, [2, 2, 1], "Torso"), [TW, TH] = TEMPLATE_SIZE;
  const inRect = (u, v, [x, y, w, h]) => u * TW >= x && u * TW <= x + w && v * TH >= y && v * TH <= y + h;
  for (let i = 0; i < pos.length / 3; i++) {
    const n = [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]], u = uv[i * 2], v = uv[i * 2 + 1];
    const face = n[2] < -0.5 ? "F" : n[2] > 0.5 ? "B" : n[0] > 0.5 ? "R" : n[0] < -0.5 ? "L" : n[1] > 0.5 ? "U" : "D";
    assert.ok(inRect(u, v, TEMPLATE.Torso[face]), `vertex ${i} on ${face}`);
    if (face === "F") { // looking at the front, the character's right (+X) is on the image's left
      const [x] = TEMPLATE.Torso.F; assert.equal(pos[i * 3] > 0, u * TW < x + 64);
      assert.equal(pos[i * 3 + 1] > 0, v * TH < TEMPLATE.Torso.F[1] + 64, "top of the part is the top of the rect");
    }
    if (face === "B") { const [x] = TEMPLATE.Torso.B; assert.equal(pos[i * 3] < 0, u * TW < x + 64); }
  }
  // a right arm uses the right-limb column, a left leg the left-limb column
  const r = templateUVs(pos, nrm, [2, 2, 1], "RightArm"), l = templateUVs(pos, nrm, [2, 2, 1], "LeftLeg");
  const front = [...Array(pos.length / 3).keys()].find((i) => nrm[i * 3 + 2] < -0.5);
  assert.ok(inRect(r[front * 2], r[front * 2 + 1], TEMPLATE.RightLimb.F) && inRect(l[front * 2], l[front * 2 + 1], TEMPLATE.LeftLimb.F));
});

test("clothing template: R15 parts split their limb's rect top to bottom", () => {
  const body = buildBody({ shape: "classic" }), sl = regionSlices(body.parts);
  for (const region of [["LeftUpperArm", "LeftLowerArm", "LeftHand"], ["LeftUpperLeg", "LeftLowerLeg", "LeftFoot"], ["UpperTorso", "LowerTorso"]]) {
    let at = 0;
    for (const p of region) { assert.ok(Math.abs(sl[p][0] - at) < 1e-6, p); at += sl[p][1]; }
    assert.ok(Math.abs(at - 1) < 1e-6);
  }
  const hand = body.parts.find((p) => p.bone === "LeftHand"), g = new THREE.BoxGeometry(...hand.size);
  const uv = templateUVs(g.attributes.position.array, g.attributes.normal.array, hand.size, "LeftArm", sl.LeftHand);
  const [, y, , h] = TEMPLATE.LeftLimb.F, nrm = g.attributes.normal.array;
  for (let i = 0; i < g.attributes.position.count; i++) if (nrm[i * 3 + 2] < -0.5) assert.ok(uv[i * 2 + 1] * TEMPLATE_SIZE[1] > y + h * sl.LeftHand[0] - 1, "the hand takes the bottom of the arm");
});

test("paintRegion: body colour, then pants, then shirt, then the T-shirt on the torso front", () => {
  const c = mockCanvas(); c.width = 1170; c.height = 1118;
  const ctx = c.getContext("2d"); ctx.canvas = c;
  const shirt = { tag: "shirt" }, pants = { tag: "pants" }, tshirt = { tag: "tee" };
  paintRegion(ctx, "Torso", "#0d69ac", { shirt, pants, tshirt });
  const draws = c.calls.filter((x) => x[0] === "drawImage").map((x) => x[1].tag);
  assert.deepEqual(draws, ["pants", "shirt", "tee"]);
  assert.deepEqual(c.calls.find((x) => x[0] === "drawImage" && x[1] === tshirt).slice(2), [462, 148, 256, 256]);
  c.reset(); paintRegion(ctx, "LeftLeg", "#a4bd47", { shirt, pants });
  assert.deepEqual(c.calls.filter((x) => x[0] === "drawImage").map((x) => x[1].tag), ["pants"]);
  assert.ok(c.calls.some((x) => x[0] === "=fillStyle" && x[1] === "#a4bd47"));
  c.reset(); paintRegion(ctx, "RightArm", "#fff", { shirt, pants });
  assert.deepEqual(c.calls.filter((x) => x[0] === "drawImage").map((x) => x[1].tag), ["shirt"]);
});

test("createRig: BodyColors colour each region (no canvas in Node, so plain colours)", () => {
  const rig = createRig({ bodyColors: { HeadColor3: "#f5cd30", TorsoColor3: "#0d69ac", LeftArmColor3: [1, 0, 0], LeftLegColor3: 0x00ff00 } });
  const hex = (m) => "#" + m.material.color.getHexString();
  assert.equal(hex(rig.parts.UpperTorso), "#0d69ac");
  assert.equal(hex(rig.parts.LowerTorso), "#0d69ac");
  assert.equal(hex(rig.parts.LeftHand), "#ff0000");
  assert.equal(hex(rig.parts.LeftFoot), "#00ff00");
  assert.equal(hex(rig.parts.Head), "#f5cd30");
  rig.setBodyColors({ TorsoColor3: "#ffffff" });
  assert.equal(hex(rig.parts.UpperTorso), "#ffffff");
  assert.equal(rig.avatar.bodyColors.Torso, "#ffffff");
  assert.throws(() => createRig({}).setClothing({ shirt: {} }), /bodyColors, clothing or bodyParts/);
  // R6 works too, without the hand and shoe bands
  const r6 = createRig({ rigType: "R6", bodyColors: { LeftArmColor3: "#123456" } });
  assert.equal(hex(r6.parts["Left Arm"]), "#123456");
  assert.equal(r6.parts["Left Arm"].children.length, 0);
});

test("createRig: body-package MeshParts are fitted to their Size", () => {
  const g = new THREE.SphereGeometry(3, 8, 6), idx = g.index.array; // a mesh far bigger than the part
  const mesh = { positions: g.attributes.position.array, normals: g.attributes.normal.array, uvs: g.attributes.uv.array, indices: Uint32Array.from(idx), faceCount: idx.length / 3, lods: [0, idx.length / 3] };
  const d = defaultR15Parts();
  const rig = createRig({ bodyParts: { LeftUpperArm: { mesh, size: [0.8, 1.4, 0.8], attachments: { LeftShoulderRigAttachment: [0.4, 0.6, 0], LeftElbowRigAttachment: [0, -0.7, 0] } }, Head: { mesh, size: [1.2, 1.2, 1.2], attachments: { NeckRigAttachment: [0, -0.6, 0], HatAttachment: [0, 0.6, 0] } } } });
  rig.object.updateMatrixWorld(true);
  const arm = new THREE.Box3().setFromObject(rig.parts.LeftUpperArm).getSize(new THREE.Vector3()).toArray();
  assert.ok(near(arm, [0.8, 1.4, 0.8], 1e-4), `arm size ${arm}`);
  const head = new THREE.Box3().setFromObject(rig.parts.Head).getSize(new THREE.Vector3()).toArray();
  assert.ok(near(head, [1.2, 1.2, 1.2], 1e-4), `head size ${head}`);
  assert.ok(near(rig.headAttachments.HatAttachment, [0, 1.2, 0]), "head attachments are relative to the neck");
  // the elbow sits at the bottom of the new arm: shoulder joint - 0.6 (to the centre) - 0.7
  const sh = rig.body.bind.find((b) => b.name === "LeftUpperArm").pos, el = rig.body.bind.find((b) => b.name === "LeftLowerArm").pos;
  assert.ok(Math.abs(sh[1] - 1.3 - el[1]) < 1e-6);
  assert.equal(d.LeftUpperArm.attachments.LeftShoulderRigAttachment.length, 3);
});

test("describeBodyParts / describeBodyColors / describeClothing read avatar items", () => {
  const mp = (name, size, atts, id) => ({ className: "MeshPart", props: { Name: [S, name], MeshId: [S, `rbxassetid://${id}`], TextureID: [S, ""], size: [V3, size] }, children: atts.map(([n, p]) => ({ className: "Attachment", props: { Name: [S, n], CFrame: [CF, { rot: I3, pos: p }] } })) });
  const model = { className: "Model", props: { Name: [S, "LeftArm"] }, children: [
    { className: "Folder", props: { Name: [S, "R6"] }, children: [mp("LeftUpperArm", [9, 9, 9], [], 1)] },
    { className: "Folder", props: { Name: [S, "R15Fixed"] }, children: [mp("LeftUpperArm", [1, 1.2, 1], [], 2), mp("LeftHand", [1, 0.3, 1], [["LeftWristRigAttachment", [0, 0.125, 0]]], 3)] },
    { className: "Folder", props: { Name: [S, "R15ArtistIntent"] }, children: [mp("LeftUpperArm", [0.9, 1.3, 0.9], [["LeftShoulderRigAttachment", [0.45, 0.5, 0]], ["LeftElbowRigAttachment", [0, -0.6, 0]]], 4)] },
  ] };
  const parts = describeBodyParts(parseRbxm(writeRbxm([model])));
  assert.equal(parts.LeftUpperArm.meshId, 4, "R15ArtistIntent wins");
  assert.deepEqual(parts.LeftUpperArm.size.map((v) => +v.toFixed(3)), [0.9, 1.3, 0.9]);
  assert.deepEqual(parts.LeftUpperArm.attachments.LeftElbowRigAttachment.map((v) => +v.toFixed(3)), [0, -0.6, 0]);
  assert.equal(parts.LeftHand.meshId, 3, "R15Fixed fills in");
  assert.equal(describeBodyParts(parseRbxm(writeRbxm([model])), { folder: "R15Fixed" }).LeftUpperArm.meshId, 2);

  const avatar = { className: "Model", props: { Name: [S, "Avatar"] }, children: [
    { className: "BodyColors", props: { Name: [S, "Body Colors"], HeadColor3: [C3, [0.96, 0.8, 0.19]], TorsoColor3: [C3, [0.05, 0.41, 0.67]], LeftArmColor3: [C3, [1, 1, 1]], RightArmColor3: [C3, [0, 0, 0]], LeftLegColor3: [C3, [0.64, 0.74, 0.28]], RightLegColor3: [C3, [0.64, 0.74, 0.28]] } },
    { className: "Shirt", props: { Name: [S, "Shirt"], ShirtTemplate: [S, "rbxassetid://555"] } },
    { className: "Pants", props: { Name: [S, "Pants"], PantsTemplate: [S, "http://www.roblox.com/asset/?id=666"] } },
  ] };
  const roots = parseRbxm(writeRbxm([avatar]));
  assert.deepEqual(describeBodyColors(roots), { HeadColor3: "#f5cc30", TorsoColor3: "#0d69ab", LeftArmColor3: "#ffffff", RightArmColor3: "#000000", LeftLegColor3: "#a3bd47", RightLegColor3: "#a3bd47" });
  assert.deepEqual(describeClothing(roots), { shirt: 555, pants: 666, tshirt: null });
});
