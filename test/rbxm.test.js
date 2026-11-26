import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { parseRbxm, findInstance, describeAccessory, assetId, ROT_IDS } from "../src/rbxm.js";
import { writeRbxm } from "./helpers/rbxm-writer.js";

const S = 0x01, B = 0x02, I = 0x03, F = 0x04, V3 = 0x0e, CF = 0x10, E = 0x12;
const ROT90Y = [0, 0, 1, 0, 1, 0, -1, 0, 0];

// An accessory shaped like a rigid hair item and one like a layered jacket (made-up ids)
const hair = {
  className: "Accessory", props: { Name: [S, "Test Hair"], AccessoryType: [E, 0] },
  children: [{
    className: "Part", props: { Name: [S, "Handle"], Size: [V3, [1.5, 1.25, 1.75]], CanCollide: [B, false] },
    children: [
      { className: "SpecialMesh", props: { Name: [S, "Mesh"], MeshId: [S, "rbxassetid://111"], TextureId: [S, "http://www.roblox.com/asset/?id=222"], Scale: [V3, [1, 1, 1]] } },
      { className: "Attachment", props: { Name: [S, "HairAttachment"], CFrame: [CF, { rot: ROT90Y, pos: [0.25, -0.5, 0.125] }] } },
    ],
  }],
};
const jacket = {
  className: "Accessory", props: { Name: [S, "Test Jacket"], AccessoryType: [E, 10] },
  children: [{
    className: "MeshPart", props: { Name: [S, "Handle"], MeshId: [S, "rbxassetid://333"], TextureID: [S, "rbxassetid://444"] },
    children: [
      { className: "WrapLayer", props: { Name: [S, "HandleWrapLayer"], Order: [I, 3], CageMeshId: [S, "https://assetdelivery.roblox.com/v1/asset/?id=555"], ReferenceMeshId: [S, "rbxassetid://666"], ShrinkFactor: [F, 0.5] } },
      { className: "Attachment", props: { Name: [S, "BodyFrontAttachment"], CFrame: [CF, { rotId: 0x02, pos: [0, 0, 0] }] } },
    ],
  }],
};

for (const mode of ["raw", "lz4", ...(zlib.zstdCompressSync ? ["zstd"] : [])]) {
  test(`rbxm (${mode} chunks): instance tree and property types`, () => {
    const roots = parseRbxm(writeRbxm([hair, jacket], { mode }), { zstd: (b) => zlib.zstdDecompressSync(b) });
    assert.equal(roots.length, 2);
    const [h, j] = roots;
    assert.equal(h.className, "Accessory"); assert.equal(h.props.Name, "Test Hair"); assert.equal(h.props.AccessoryType, 0);
    const handle = h.children[0];
    assert.equal(handle.parent, h);
    assert.deepEqual(handle.props.Size, [1.5, 1.25, 1.75]);
    assert.equal(handle.props.CanCollide, false);
    const att = findInstance([h], (x) => x.className === "Attachment");
    assert.deepEqual(att.props.CFrame.rot, ROT90Y);
    assert.deepEqual(att.props.CFrame.pos, [0.25, -0.5, 0.125]);
    const wrap = findInstance([j], (x) => x.className === "WrapLayer");
    assert.equal(wrap.props.Order, 3); assert.equal(wrap.props.ShrinkFactor, 0.5);
    assert.deepEqual(findInstance([j], (x) => x.className === "Attachment").props.CFrame.rot, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
}

test("rbxm: negative ints and floats survive the zigzag / sign-rotation encodings", () => {
  const roots = parseRbxm(writeRbxm([{ className: "Folder", props: { A: [I, -123456], B: [F, -0.75], C: [V3, [-1e-3, 2.5, -1024]] } }]));
  assert.equal(roots[0].props.A, -123456); assert.equal(roots[0].props.B, -0.75);
  assert.deepEqual(roots[0].props.C.map((x) => +x.toFixed(6)), [-0.001, 2.5, -1024]);
});

test("rbxm: every axis-aligned rotation id is a proper rotation matrix", () => {
  assert.equal(Object.keys(ROT_IDS).length, 24);
  for (const m of Object.values(ROT_IDS)) {
    const det = m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
    assert.equal(det, 1);
  }
});

test("describeAccessory: rigid and layered", () => {
  const [h, j] = parseRbxm(writeRbxm([hair, jacket]));
  assert.deepEqual(describeAccessory([h]), { name: "Test Hair", meshId: 111, textureId: 222, attachment: { name: "HairAttachment", cframe: { rot: ROT90Y, pos: [0.25, -0.5, 0.125] } }, layered: null });
  const d = describeAccessory([j]);
  assert.equal(d.meshId, 333); assert.equal(d.textureId, 444);
  assert.deepEqual(d.layered, { order: 3, cageMeshId: 555, referenceMeshId: 666 });
});

test("assetId parses the common content URL shapes", () => {
  assert.equal(assetId("rbxassetid://123"), 123);
  assert.equal(assetId("http://www.roblox.com/asset/?id=456"), 456);
  assert.equal(assetId("https://assetdelivery.roblox.com/v1/asset/?version=1&id=789"), 789);
  assert.equal(assetId(""), null); assert.equal(assetId(undefined), null);
});

test("rbxm: errors", () => {
  assert.throws(() => parseRbxm(new Uint8Array(40)), /not a Roblox model/);
  if (zlib.zstdCompressSync) assert.throws(() => parseRbxm(writeRbxm([hair], { mode: "zstd" })), /options\.zstd/);
});

test("rbxmx (XML): same instance tree as the binary reader, auto-detected by parseRbxm", async () => {
  const { parseRbxmx } = await import("../src/rbxmx.js");
  const xml = `<?xml version="1.0"?>
<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" version="4">
  <External>null</External>
  <Item class="Accessory" referent="RBX1">
    <Properties><string name="Name">Spiky &amp; Blue</string><token name="AccessoryType">1</token></Properties>
    <Item class="Part" referent="RBX2">
      <Properties><string name="Name">Handle</string><Vector3 name="size"><X>1.5</X><Y>1</Y><Z>-2</Z></Vector3><bool name="CanCollide">false</bool></Properties>
      <Item class="SpecialMesh" referent="RBX3"><Properties>
        <Content name="MeshId"><url>http://www.roblox.com/asset/?id=111 </url></Content>
        <Content name="TextureId"><url>rbxassetid://222</url></Content>
      </Properties></Item>
      <Item class="Attachment" referent="RBX4"><Properties>
        <string name="Name">HairAttachment</string>
        <CoordinateFrame name="CFrame"><X>0</X><Y>0.15</Y><Z>-0.5</Z><R00>0</R00><R01>0</R01><R02>1</R02><R10>0</R10><R11>1</R11><R12>0</R12><R20>-1</R20><R21>0</R21><R22>0</R22></CoordinateFrame>
      </Properties></Item>
    </Item>
  </Item>
</roblox>`;
  const viaBytes = parseRbxm(new TextEncoder().encode(xml)), viaText = parseRbxmx(xml);
  for (const roots of [viaBytes, viaText]) {
    assert.equal(roots.length, 1);
    assert.equal(roots[0].props.Name, "Spiky & Blue");
    assert.equal(roots[0].props.AccessoryType, 1);
    assert.deepEqual(roots[0].children[0].props.size, [1.5, 1, -2]);
    assert.equal(roots[0].children[0].props.CanCollide, false);
    assert.equal(roots[0].children[0].parent, roots[0]);
  }
  assert.deepEqual(describeAccessory(viaText), { name: "Spiky & Blue", meshId: 111, textureId: 222, attachment: { name: "HairAttachment", cframe: { rot: [0, 0, 1, 0, 1, 0, -1, 0, 0], pos: [0, 0.15, -0.5] } }, layered: null });
  assert.throws(() => parseRbxmx("<notroblox/>"), /not an XML Roblox model/);
});
