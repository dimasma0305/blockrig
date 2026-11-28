// blockrig/pack: a whole Roblox bundle referenced by its id, resolved round by round from a cache, loaded and worn.
// Everything is generated here (made-up ids, a box mesh): no Roblox assets in the repo.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import * as THREE from "three";
import { writeMesh } from "../src/writer.js";
import { meshFromGeometry, makeCoat } from "../src/index.js";
import { parsePackRef, resolvePack, loadPack, rigFromPack, roleOf, ASSET_TYPES } from "../src/pack/index.js";
import { packCache, fillPack, exportPack, locateScript } from "../src/pack/cache.js";
import { writeRbxm } from "./helpers/rbxm-writer.js";

const S = 0x01, F = 0x04, V3 = 0x0e, CF = 0x10, E = 0x12, I = 0x03;
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const att = (name, pos) => ({ className: "Attachment", props: { Name: [S, name], CFrame: [CF, { rot: I3, pos }] } });
const meshPart = (name, mesh, size, children = []) => ({ className: "MeshPart", props: { Name: [S, name], MeshId: [S, `rbxassetid://${mesh}`], TextureID: [S, "rbxassetid://9001"], Size: [V3, size] }, children });

// a made-up bundle 777: a torso, a hair accessory, a layered jacket, a shirt, an idle animation pack and an emote
const torso = writeRbxm([{ className: "Folder", props: { Name: [S, "R15ArtistIntent"] }, children: [
  meshPart("UpperTorso", 101, [2, 1.6, 1], [att("NeckRigAttachment", [0, 0.8, 0]), att("WaistRigAttachment", [0, -0.8, 0])]),
  meshPart("LowerTorso", 102, [2, 0.4, 1], [att("WaistRigAttachment", [0, 0.2, 0]), att("RootRigAttachment", [0, 0, 0])]),
] }]);
const hair = writeRbxm([{ className: "Accessory", props: { Name: [S, "Spiky Hair"] }, children: [{ className: "Part", props: { Name: [S, "Handle"] }, children: [
  { className: "SpecialMesh", props: { Name: [S, "Mesh"], MeshId: [S, "rbxassetid://201"], TextureId: [S, "rbxassetid://202"], Scale: [V3, [1, 1, 1]] } },
  att("HairAttachment", [0, -0.5, 0]),
] }] }]);
const jacket = writeRbxm([{ className: "Accessory", props: { Name: [S, "Jacket"] }, children: [{ className: "MeshPart", props: { Name: [S, "Handle"], MeshId: [S, "rbxassetid://301"], TextureID: [S, "rbxassetid://302"] }, children: [
  { className: "WrapLayer", props: { Name: [S, "WrapLayer"], Order: [I, 3], CageMeshId: [S, "rbxassetid://303"], ReferenceMeshId: [S, "rbxassetid://304"] } },
  att("BodyFrontAttachment", [0, 0, 0]),
] }] }]);
const shirt = writeRbxm([{ className: "Shirt", props: { Name: [S, "Shirt"], ShirtTemplate: [S, "rbxassetid://401"] } }]);
// an animation pack item: StringValue "idle" -> Animation (AnimationId) -> NumberValue Weight, as Roblox ships them
const idlePack = writeRbxm([{ className: "StringValue", props: { Name: [S, "idle"] }, children: [
  { className: "Animation", props: { Name: [S, "Animation1"], AnimationId: [S, "rbxassetid://501"] }, children: [{ className: "NumberValue", props: { Name: [S, "Weight"], Value: [0x05, 9] } }] },
  { className: "Animation", props: { Name: [S, "Animation2"], AnimationId: [S, "rbxassetid://502"] }, children: [{ className: "NumberValue", props: { Name: [S, "Weight"], Value: [0x05, 1] } }] },
] }]);
const pose = (name, cf, children = []) => ({ className: "Pose", props: { Name: [S, name], CFrame: [CF, cf], EasingStyle: [E, 0], EasingDirection: [E, 0], Weight: [F, 1] }, children });
const sequence = (name) => writeRbxm([{ className: "KeyframeSequence", props: { Name: [S, name], Loop: [0x02, true], Priority: [E, 0] }, children: [0, 1].map((t) => ({ className: "Keyframe", props: { Name: [S, "Keyframe"], Time: [F, t] }, children: [pose("HumanoidRootPart", { rot: I3, pos: [0, 0, 0] }, [pose("LowerTorso", { rot: I3, pos: [0, t * 0.1, 0] })])] })) }]);
const box = writeMesh(meshFromGeometry(new THREE.BoxGeometry(1, 1, 1)), "4.00");

const DETAILS = { id: 777, name: "Test Pack", bundleType: "BodyParts", items: [
  { id: 11, name: "Torso", type: "Asset", assetType: 27 }, { id: 12, name: "Hair", type: "Asset", assetType: 41 }, { id: 13, name: "Jacket", type: "Asset", assetType: 67 },
  { id: 14, name: "Shirt", type: "Asset", assetType: 11 }, { id: 15, name: "Idle", type: "Asset", assetType: 51 }, { id: 16, name: "Wave", type: "Asset", assetType: 61 },
  { id: 99, name: "Outfit", type: "UserOutfit" },
] };
const FILES = { 11: torso, 12: hair, 13: jacket, 14: shirt, 15: idlePack, 16: sequence("Wave"), 501: sequence("Idle1"), 502: sequence("Idle2") };
for (const id of [101, 102, 201, 303, 304]) FILES[id] = box;
FILES[301] = writeMesh(makeCoat(), "4.00"); // a skinned garment
const IMAGES = new Set([9001, 202, 302, 401]);
for (const id of IMAGES) FILES[id] = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // "PNG"

// a store that only has what has been "downloaded" so far
const memStore = () => { const have = new Map(); let details = null; return { have, setDetails: (d) => (details = d), bundle: (id) => (id === 777 ? details : null), asset: (id, format) => have.get(`${id}@${format ?? ""}`) ?? null, put: (id, format) => have.set(`${id}@${format ?? ""}`, FILES[id]) }; };

test("pack: references by id (bundle:949, asset:123, numbers, objects)", () => {
  assert.deepEqual(parsePackRef("bundle:949"), { type: "bundle", id: 949, key: "bundle-949" });
  assert.deepEqual(parsePackRef("asset-376548738"), { type: "asset", id: 376548738, key: "asset-376548738" });
  assert.deepEqual(parsePackRef(42), { type: "asset", id: 42, key: "asset-42" });
  assert.deepEqual(parsePackRef({ bundle: 5 }).key, "bundle-5");
  assert.throws(() => parsePackRef("hat"));
  assert.equal(roleOf(79), "head"); assert.equal(roleOf(51), "animation"); assert.equal(roleOf(67), "accessory"); assert.equal(roleOf(29), "body"); assert.equal(ASSET_TYPES[78], "MoodAnimation");
});

test("pack: a bundle resolves round by round (details, items, then meshes / textures / keyframe sequences)", () => {
  const store = memStore();
  let r = resolvePack("bundle:777", store);
  assert.deepEqual(r.missing, [{ kind: "bundle", id: 777, key: "bundle-777" }]);
  store.setDetails(DETAILS);
  r = resolvePack("bundle:777", store);
  assert.deepEqual(r.missing.map((m) => m.id), [11, 12, 13, 14, 15, 16], "the items (not the outfit)");
  for (const m of r.missing) store.put(m.id, m.format);
  r = resolvePack("bundle:777", store);
  assert.deepEqual(r.missing.map((m) => m.id).sort((a, b) => a - b), [101, 102, 201, 202, 301, 302, 303, 304, 401, 501, 502, 9001], "what the items name");
  for (const m of r.missing) store.put(m.id, m.format);
  r = resolvePack("bundle:777", store);
  assert.deepEqual(r.missing, []);
  const p = r.pack;
  assert.equal(p.name, "Test Pack"); assert.equal(p.key, "bundle-777");
  assert.deepEqual(Object.keys(p.body).sort(), ["LowerTorso", "UpperTorso"]); assert.equal(p.body.UpperTorso.mesh, 101);
  assert.deepEqual(p.accessories.map((a) => [a.name, a.mesh, a.layered?.order ?? null]), [["Spiky Hair", 201, null], ["Jacket", 301, 3]]);
  assert.equal(p.clothing.shirt, 401);
  assert.deepEqual(p.animations.idle.map((a) => [a.id, a.weight]), [[501, 9], [502, 1]], "an animation pack's slot and weights");
  assert.deepEqual(p.animations.emote.map((a) => a.id), [16], "an emote that is itself a KeyframeSequence");
  assert.ok(!p.files.some((f) => [11, 12, 13, 14, 15].includes(f.id)), "the item models aren't needed at runtime");
});

test("pack: a loaded pack builds a dressed rig and gives clips by slot", async () => {
  const store = memStore(); store.setDetails(DETAILS);
  for (let i = 0; i < 4; i++) for (const m of resolvePack("bundle:777", store).missing) store.put(m.id, m.format);
  const { pack } = resolvePack("bundle:777", store);
  const loaded = await loadPack(pack, { bytes: async (id) => FILES[id], image: async (id) => (IMAGES.has(id) ? { width: 4, height: 4, id } : null) });
  assert.deepEqual(Object.keys(loaded.bodyParts).sort(), ["LowerTorso", "UpperTorso"]);
  assert.equal(loaded.clips.idle.length, 2); assert.equal(loaded.clip("idle").name, "idle:Animation1", "the heaviest idle");
  assert.equal(loaded.clothing.shirt.id, 401);
  const rig = rigFromPack(loaded, { outline: 0 });
  let skinned = 0, hairMesh = 0; rig.object.traverse((o) => { if (o.isSkinnedMesh) skinned++; if (o.isMesh && !o.isSkinnedMesh) hairMesh++; });
  assert.ok(skinned >= 1, "the jacket is layered clothing"); assert.ok(hairMesh > 0);
});

test("pack cache: shared on disk, fills from public details and links, exports next to a video", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blockrig-pack-")), cache = packCache(path.join(dir, "cache"));
  const get = async (url) => {
    if (url === "https://catalog.roblox.com/v1/bundles/777/details") return new Response(JSON.stringify(DETAILS));
    const m = /^https:\/\/cdn\.test\/(\d+)$/.exec(url); if (!m) return new Response("", { status: 404 });
    const b = Buffer.from(FILES[m[1]]);
    return new Response(+m[1] === 501 && zlib.zstdCompressSync ? zlib.zstdCompressSync(b) : b); // CDN files can come ZSTD-compressed
  };
  let r = await fillPack("bundle:777", cache, { fetch: get });
  assert.ok(cache.bundle(777)); assert.equal(r.missing.length, 6, "the items need links from the signed-in browser");
  assert.match(locateScript(r.missing), /assetdelivery\.roblox\.com\/v2\/assetId/);
  for (let round = 0; round < 4 && r.missing.length; round++) {
    assert.equal(cache.addLinks(r.missing.map((m) => `${m.key} https://cdn.test/${m.id}`).join("\n") + "\n# not available: x"), r.missing.length);
    r = await fillPack("bundle:777", cache, { fetch: get });
  }
  assert.deepEqual(r.missing, []); assert.ok(r.pack);
  assert.deepEqual([...cache.asset(501)].slice(0, 8), [...FILES[501]].slice(0, 8), "ZSTD inflated");
  const again = await fillPack("bundle:777", packCache(path.join(dir, "cache")), { fetch: async () => { throw new Error("no network needed"); } });
  assert.ok(again.pack, "a second video reuses the cache");
  const out = exportPack(r.pack, cache, path.join(dir, "video", "packs"));
  assert.ok(fs.existsSync(path.join(out, "pack.json"))); assert.ok(fs.existsSync(path.join(out, "101")));
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, "pack.json"), "utf8")).ref, "bundle:777");
  fs.rmSync(dir, { recursive: true, force: true });
});
