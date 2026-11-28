// Roblox packs: a whole catalog bundle (a body package, a dynamic head with its mood, an animation pack, an outfit)
// or a single asset (an accessory, a shirt, an emote, a Toolbox model), referenced by its Roblox id and turned into
// everything a video needs: body parts, head, face, accessories (rigid and layered), classic clothing, animation
// clips by slot (idle, walk, run, jump, fall, climb, swim, mood, emote) and maps.
//
//   resolvePack("bundle:949", store)   what the pack is, and which files are still missing (store = a cache)
//   loadPack(pack, { bytes, image })   the parsed meshes, textures, images and clips, ready for three.js
//   rigFromPack(loaded, createRigOptions) / wearPack(rig, loaded)
//
// Nothing here downloads: a store answers from what is already cached (blockrig/pack/cache is one on disk), and the
// missing list says what to fetch next (bundle details from catalog.roblox.com, asset files from asset delivery,
// which needs the user's signed-in browser). Roblox items belong to Roblox and their creators: keep them out of git.
// Bundle details: https://catalog.roblox.com/v1/bundles/{id}/details. AssetType:
// https://create.roblox.com/docs/reference/engine/enums/AssetType
import * as THREE from "three";
import { parseRbxm, findInstance, describeAccessory, describeHead, assetId } from "../rbxm.js";
import { describeBodyParts, describeClothing } from "../avatar.js";
import { parseMesh } from "../mesh.js";
import { keyframeSequenceToClip } from "../keyframes.js";
import { createRig } from "../rig.js";
import { brickColorHex } from "../brickcolor.js";
import { describeMap } from "./map.js";

/** Roblox AssetType enum values a pack can hold, by number. */
export const ASSET_TYPES = {
  2: "TShirt", 8: "Hat", 10: "Model", 11: "Shirt", 12: "Pants", 17: "Head", 18: "Face", 24: "Animation",
  27: "Torso", 28: "RightArm", 29: "LeftArm", 30: "LeftLeg", 31: "RightLeg",
  41: "HairAccessory", 42: "FaceAccessory", 43: "NeckAccessory", 44: "ShoulderAccessory", 45: "FrontAccessory", 46: "BackAccessory", 47: "WaistAccessory",
  48: "ClimbAnimation", 50: "FallAnimation", 51: "IdleAnimation", 52: "JumpAnimation", 53: "RunAnimation", 54: "SwimAnimation", 55: "WalkAnimation", 61: "EmoteAnimation",
  64: "TShirtAccessory", 65: "ShirtAccessory", 66: "PantsAccessory", 67: "JacketAccessory", 68: "SweaterAccessory", 69: "ShortsAccessory",
  70: "LeftShoeAccessory", 71: "RightShoeAccessory", 72: "DressSkirtAccessory", 76: "EyebrowAccessory", 77: "EyelashAccessory", 78: "MoodAnimation", 79: "DynamicHead",
};
const ANIMATION_SLOT = { 24: "animation", 48: "climb", 50: "fall", 51: "idle", 52: "jump", 53: "run", 54: "swim", 55: "walk", 61: "emote", 78: "mood" };
/** What a pack item is for, from its AssetType: body, head, face, clothing, accessory, animation or model (null if unknown). */
export function roleOf(assetType) {
  if (assetType >= 27 && assetType <= 31) return "body";
  if (assetType === 17 || assetType === 79) return "head";
  if (assetType === 18) return "face";
  if (assetType === 2 || assetType === 11 || assetType === 12) return "clothing";
  if (assetType in ANIMATION_SLOT) return "animation";
  if (assetType === 8 || (assetType >= 41 && assetType <= 47) || (assetType >= 64 && assetType <= 72) || assetType === 76 || assetType === 77) return "accessory";
  if (assetType === 10) return "model";
  return null;
}
// Roblox-AssetFormat for asset delivery: a dynamic head comes as its MeshPart (with FaceControls) only when asked
const FORMAT = { 79: "avatar_meshpart_head" };

const REF_TYPES = ["bundle", "asset", "outfit", "user"];
/**
 * "bundle:949", "asset:376548738", "outfit:<id>", "user:<id>" or "user:<username>" (a player's whole avatar),
 * `{ bundle: 949 }` / `{ user: "Name" }`, or a bare number (an asset) -> `{ type, id, key }`. A username stays a string
 * until it is looked up.
 */
export function parsePackRef(ref) {
  let type, id;
  if (typeof ref === "number") { type = "asset"; id = ref; }
  else if (typeof ref === "string") {
    const t = ref.trim(), m = /^(bundle|asset|outfit|user)[:\-](.+)$/.exec(t);
    if (m && (/^\d+$/.test(m[2]) || (m[1] === "user" && /^\w{3,20}$/.test(m[2])))) { type = m[1]; id = /^\d+$/.test(m[2]) ? +m[2] : m[2]; }
    else if (/^\d+$/.test(t)) { type = "asset"; id = +t; }
    else throw new Error(`blockrig: pack reference "${ref}" should be "bundle:<id>", "asset:<id>", "outfit:<id>" or "user:<id or name>"`);
  } else if (ref && REF_TYPES.some((k) => ref[k] != null)) { type = REF_TYPES.find((k) => ref[k] != null); id = /^\d+$/.test(String(ref[type])) ? +ref[type] : String(ref[type]); }
  else throw new Error("blockrig: a pack reference needs a bundle, asset, outfit or user id");
  return { type, id, key: `${type}-${id}` };
}

// avatar API body colours: BrickColor ids (headColorId...) or Color3 hex (headColor3...) -> BlockRig bodyColors
const COLOR_PARTS = { head: "HeadColor3", torso: "TorsoColor3", leftArm: "LeftArmColor3", rightArm: "RightArmColor3", leftLeg: "LeftLegColor3", rightLeg: "RightLegColor3" };
/** The avatar API's `bodyColors` (or `bodyColor3s`) as `{ HeadColor3: "#rrggbb", ... }`; null when there are none. */
export function avatarBodyColors(d) {
  const out = {}, c = d?.bodyColor3s ?? d?.bodyColors ?? null;
  if (!c) return null;
  for (const [k, name] of Object.entries(COLOR_PARTS)) {
    const hex = c[`${k}Color3`], id = c[`${k}ColorId`];
    const v = typeof hex === "string" ? (hex.startsWith("#") ? hex : `#${hex}`).toLowerCase() : id != null ? brickColorHex(id) : null;
    if (v) out[name] = v;
  }
  return Object.keys(out).length ? out : null;
}
/** The avatar API's `scales` (or an outfit's `scale`) as BlockRig's body scale plus Roblox's proportion and body type. */
export function avatarScale(d) {
  const s = d?.scales ?? d?.scale ?? null;
  if (!s) return null;
  return { height: s.height ?? 1, width: s.width ?? 1, depth: s.depth ?? 1, head: s.head ?? 1, proportion: s.proportion ?? 0, bodyType: s.bodyType ?? 0 };
}
/** The key a file is stored under: the asset id, plus "@format" when it was asked for in a Roblox-AssetFormat. */
export const fileKey = (id, format) => (format ? `${id}@${format}` : String(id));

const sniff = (roots) => {
  if (findInstance(roots, (x) => x.className === "Accessory")) return "accessory";
  if (findInstance(roots, (x) => x.className === "KeyframeSequence" || x.className === "CurveAnimation" || x.className === "Animation")) return "animation";
  if (findInstance(roots, (x) => x.className === "MeshPart" && x.children.some((c) => c.className === "FaceControls"))) return "head";
  if (findInstance(roots, (x) => x.className === "Folder" && /^R15(ArtistIntent|Fixed)$/.test(x.props.Name))) return "body";
  if (findInstance(roots, (x) => x.className === "Shirt" || x.className === "Pants" || x.className === "ShirtGraphic")) return "clothing";
  if (roots.length === 1 && roots[0].className === "Decal") return "face";
  return "model";
};

/**
 * Work out a pack from what `store` already has. `store`: `{ bundle(id) -> details | null, asset(id, format) -> bytes | null }`
 * (synchronous: a cache). Returns `{ pack, missing }`: `pack` is null until nothing is missing; `missing` lists
 * `{ kind: "bundle", id }` and `{ kind: "asset", id, format, key }` to fetch, then call again (each round can reveal
 * more: a bundle names its items, an item names its meshes, an animation pack names its keyframe sequences).
 * Options: `zstd(bytes)` to inflate ZSTD-compressed .rbxm chunks.
 */
export function resolvePack(ref, store, o = {}) {
  const r = parsePackRef(ref), missing = [], files = new Map(), seen = new Set();
  const need = (id, format = null) => {
    if (id == null) return null;
    const key = fileKey(id, format), b = store.asset(id, format);
    if (b == null) { if (!seen.has(key)) { seen.add(key); missing.push({ kind: "asset", id, format, key }); } return null; }
    return b;
  };
  const use = (id, format = null) => { if (id == null) return null; files.set(fileKey(id, format), { id, format }); need(id, format); return id; };
  const parse = (b) => parseRbxm(b, { zstd: o.zstd });

  // details: a bundle's (catalog), an outfit's or a user's avatar (avatar API), a username's id (users API)
  const details = (type, id) => (store.details ? store.details(type, id) : type === "bundle" ? store.bundle(id) : null);
  const wantDetails = (type, id) => ({ pack: null, partial: null, missing: [type === "bundle" ? { kind: "bundle", id, key: `bundle-${id}` } : { kind: "details", type, id, key: `${type}-${id}` }] });
  let name = null, bundleType = null, items, avatar = null, userId = null;
  if (r.type === "bundle") {
    const d = details("bundle", r.id);
    if (!d) return wantDetails("bundle", r.id);
    name = d.name ?? null; bundleType = d.bundleType ?? null;
    items = (d.items ?? []).filter((i) => i.type === "Asset").map((i) => ({ id: i.id, name: i.name ?? null, assetType: i.assetType ?? null }));
    // a bundle's outfit carries its body colours and scales
    const outfit = (d.items ?? []).find((i) => i.type === "UserOutfit");
    if (outfit) { avatar = details("outfit", outfit.id); if (!avatar) return wantDetails("outfit", outfit.id); }
  } else if (r.type === "outfit" || r.type === "user") {
    userId = r.id;
    if (r.type === "user" && typeof r.id === "string") { const u = details("username", r.id); if (!u) return wantDetails("username", r.id); userId = u.id; }
    avatar = details(r.type, userId);
    if (!avatar) return wantDetails(r.type, userId);
    name = avatar.name ?? (r.type === "user" ? String(r.id) : null); bundleType = r.type === "user" ? "Avatar" : "Outfit";
    items = (avatar.assets ?? []).map((a) => ({ id: a.id, name: a.name ?? null, assetType: a.assetType?.id ?? a.assetType ?? null }));
    // a player's equipped emotes play like any other animation (slot "emote")
    for (const e of avatar.emotes ?? []) if (!items.some((i) => i.id === e.assetId)) items.push({ id: e.assetId, name: e.assetName ?? null, assetType: 61 });
  } else items = [{ id: r.id, name: o.name ?? null, assetType: o.assetType ?? null }];

  const pack = { ref: `${r.type}:${r.id}`, key: r.key, name, bundleType, items: [], body: {}, head: null, face: null, clothing: {}, accessories: [], animations: {}, map: null, files: [],
    bodyColors: avatarBodyColors(avatar), scale: avatarScale(avatar), rigType: avatar?.playerAvatarType ?? null, userId };
  for (const it of items) {
    const format = FORMAT[it.assetType] ?? null, bytes = need(it.id, format);
    if (!bytes) { pack.items.push({ ...it, role: roleOf(it.assetType) }); continue; }
    let roots;
    try { roots = parse(bytes); } catch (e) { pack.items.push({ ...it, role: null, error: `not a model file (${e.message})` }); continue; }
    const role = roleOf(it.assetType) ?? sniff(roots);
    pack.items.push({ ...it, role });
    if (role === "body") {
      for (const [part, p] of Object.entries(describeBodyParts(roots))) {
        if (part === "HumanoidRootPart") continue;
        pack.body[part] = { mesh: use(p.meshId), texture: use(p.textureId), size: p.size, attachments: p.attachments, cage: p.cage?.meshId ? { mesh: use(p.cage.meshId), origin: p.cage.origin } : null };
      }
    } else if (role === "head") {
      const mp = findInstance(roots, (x) => x.className === "MeshPart"), h = describeHead(roots);
      const sa = mp?.children.find((c) => c.className === "SurfaceAppearance");
      const tex = h.textureId ?? (sa ? assetId(sa.props.ColorMap) : null);
      pack.head = { id: it.id, mesh: use(h.meshId), texture: use(tex), kind: mp ? "meshpart" : "special", dynamic: !!mp?.children.some((c) => c.className === "FaceControls"),
        size: mp ? (mp.props.size ?? mp.props.Size)?.slice() ?? null : null, scale: h.scale, offset: h.offset, attachments: h.attachments };
    } else if (role === "face") {
      const d = findInstance(roots, (x) => x.className === "Decal");
      pack.face = d ? use(assetId(d.props.Texture)) : null;
    } else if (role === "clothing") {
      const c = describeClothing(roots);
      for (const k of ["shirt", "pants", "tshirt"]) if (c[k]) pack.clothing[k] = use(c[k]);
    } else if (role === "accessory") {
      const a = describeAccessory(roots);
      pack.accessories.push({
        id: it.id, name: a.name ?? it.name, type: ASSET_TYPES[it.assetType] ?? null, mesh: use(a.meshId), texture: use(a.textureId ?? a.colorMapId), attachment: a.attachment, scale: a.scale, offset: a.offset,
        layered: a.layered ? { order: a.layered.order, cage: use(a.layered.cageMeshId), reference: use(a.layered.referenceMeshId), cageOrigin: a.layered.cageOrigin, referenceOrigin: a.layered.referenceOrigin } : null,
      });
    } else if (role === "animation") {
      const slotOf = (inst) => { for (let x = inst.parent; x; x = x.parent) if (x.className === "StringValue") return x.props.Name.toLowerCase(); return ANIMATION_SLOT[it.assetType] ?? "animation"; };
      const add = (slot, e) => (pack.animations[slot] ??= []).push(e);
      if (findInstance(roots, (x) => x.className === "KeyframeSequence" || x.className === "CurveAnimation")) add(ANIMATION_SLOT[it.assetType] ?? "animation", { id: use(it.id, format), weight: 1, name: it.name });
      else {
        const anims = []; const walk = (list) => { for (const x of list) { if (x.className === "Animation") anims.push(x); walk(x.children); } }; walk(roots);
        for (const a of anims) {
          const w = a.children.find((c) => c.className === "NumberValue" && c.props.Name === "Weight");
          add(slotOf(a), { id: use(assetId(a.props.AnimationId)), weight: w ? w.props.Value : 1, name: a.props.Name });
        }
      }
    } else {
      const d = describeMap(roots);
      pack.map = { parts: d.parts, lights: d.lights };
      for (const id of d.refs.meshes) use(id);
      for (const id of d.refs.images) use(id);
    }
  }
  pack.files = [...files.values()];
  return { pack: missing.length ? null : pack, partial: pack, missing };
}

/**
 * Parse a resolved pack's files: `{ bytes(id, format) -> Promise<Uint8Array>, image(id) -> Promise<image | null> }`.
 * Options: `decodeDraco` (v7 meshes), `zstd`. Returns `{ pack, bodyParts, head, face, clothing, accessories, clips,
 * map }` where `clips[slot]` is `[{ clip, weight, name }]` (KeyframeSequences as BlockRig clips), and `clip(slot)` the
 * heaviest one. Missing or broken files are left out, not errors.
 */
export async function loadPack(pack, { bytes, image, decodeDraco, zstd } = {}) {
  const mesh = async (id) => { if (id == null) return null; try { return parseMesh(await bytes(id, null), { decodeDraco }); } catch { return null; } };
  const img = async (id) => { if (id == null || !image) return null; try { return await image(id); } catch { return null; } };
  const tex = async (id) => { const i = await img(id); if (!i) return null; const t = new THREE.Texture(i); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.needsUpdate = true; return t; };
  const out = { pack, bodyParts: {}, head: null, face: null, clothing: {}, accessories: [], clips: {}, map: null };
  await Promise.all(Object.entries(pack.body).map(async ([part, p]) => {
    const m = await mesh(p.mesh); if (!m) return;
    const cage = p.cage ? await mesh(p.cage.mesh) : null;
    out.bodyParts[part] = { mesh: m, size: p.size, attachments: p.attachments, map: (await tex(p.texture)) ?? undefined, cage: cage ? { mesh: cage, origin: p.cage.origin } : null };
  }));
  if (pack.head) { const m = await mesh(pack.head.mesh); if (m) out.head = { ...pack.head, mesh: m, map: await tex(pack.head.texture) }; }
  out.face = await img(pack.face);
  for (const k of Object.keys(pack.clothing)) { const i = await img(pack.clothing[k]); if (i) out.clothing[k] = i; }
  for (const a of pack.accessories) {
    const m = await mesh(a.mesh); if (!m) continue;
    const layered = a.layered ? { ...a.layered, cage: await mesh(a.layered.cage), reference: await mesh(a.layered.reference) } : null;
    out.accessories.push({ ...a, mesh: m, map: await tex(a.texture), layered });
  }
  for (const [slot, list] of Object.entries(pack.animations)) {
    for (const e of list) {
      try { const clip = keyframeSequenceToClip(parseRbxm(await bytes(e.id, null), { zstd }), { name: `${slot}:${e.name ?? e.id}` }); (out.clips[slot] ??= []).push({ clip, weight: e.weight, name: e.name }); } catch { /* not a keyframe sequence */ }
    }
  }
  if (pack.map) {
    const meshes = {}, images = {};
    await Promise.all(pack.files.map(async (f) => {
      if (pack.map.parts.some((p) => p.mesh === f.id || p.modifier?.mesh === f.id)) { const m = await mesh(f.id); if (m) meshes[f.id] = m; }
      else { const i = await img(f.id); if (i) images[f.id] = i; }
    }));
    out.map = { data: pack.map, meshes, images };
  }
  out.clip = (slot) => (out.clips[slot] ?? []).slice().sort((a, b) => b.weight - a.weight)[0]?.clip ?? null;
  return out;
}

/**
 * Put a loaded pack's accessories, layered clothing, classic face and clothing on a rig (body parts and head need
 * the rig to be built with them: rigFromPack). Rigid accessories weld by attachment (Humanoid:AddAccessory);
 * layered ones are fitted through their WrapLayer cages. Returns the meshes added.
 */
export function wearPack(rig, loaded) {
  const added = [];
  for (const a of [...loaded.accessories].sort((x, y) => (x.layered?.order ?? 0) - (y.layered?.order ?? 0))) {
    if (a.layered && a.layered.reference) {
      try {
        added.push(rig.addLayeredClothing(a.mesh, { map: a.map, wrap: { inner: a.layered.reference, innerOrigin: a.layered.referenceOrigin, outer: a.layered.cage ?? undefined, outerOrigin: a.layered.cageOrigin, order: a.layered.order } }));
        continue;
      } catch { /* a garment mesh without skin weights: worn rigid on its attachment below */ }
    }
    if (a.attachment) added.push(rig.addAccessory(a.mesh, { attachment: a.attachment, map: a.map, scale: a.scale, offset: a.offset }));
  }
  if (Object.keys(loaded.clothing).length && rig.setClothing) rig.setClothing(loaded.clothing);
  if (loaded.face && !loaded.head?.dynamic && rig.setFace) rig.setFace(loaded.face);
  return added;
}

/** createRig with a loaded pack's body parts and head, then wearPack. `o` is createRig's options (yours win). */
export function rigFromPack(loaded, o = {}) {
  const bodyParts = { ...loaded.bodyParts };
  const h = loaded.head;
  if (h && h.kind === "meshpart") bodyParts.Head = { mesh: h.mesh, size: h.size, attachments: h.attachments, map: h.map ?? undefined };
  const parts = { ...bodyParts, ...(o.bodyParts ?? {}) }, clothing = { ...loaded.clothing, ...(o.clothing ?? {}) }, p = loaded.pack;
  const colors = o.bodyColors ?? p.bodyColors ?? undefined;
  // the avatar's scales (BodyHeightScale, BodyWidthScale, BodyDepthScale, HeadScale); proportion / body type are Rthro blends
  const scale = o.scale ?? (p.scale ? { height: p.scale.height, width: p.scale.width, depth: p.scale.depth, head: p.scale.head } : undefined);
  // only switch the rig to Roblox avatar mode for what the pack (or you) actually brings
  const rig = createRig({ ...(p.rigType === "R6" && !Object.keys(parts).length ? { rigType: "R6" } : {}), ...o, scale, bodyColors: colors,
    bodyParts: Object.keys(parts).length ? parts : undefined, clothing: Object.keys(clothing).length ? clothing : undefined });
  if (h && h.kind === "special") rig.setHead(h.mesh, { scale: h.scale, offset: h.offset, attachments: h.attachments, map: h.map });
  wearPack(rig, { ...loaded, clothing: {} });
  return rig;
}
