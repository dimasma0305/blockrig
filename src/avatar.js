// Roblox avatar bodies: body packages built from their rig attachments, BodyColors, and classic clothing
// (Shirt, Pants, T-shirt) on the 585x559 template.
//
// Joints follow Humanoid:BuildRigFromAttachments: every joint sits where the parent part's
// `<Joint>RigAttachment` meets the child part's attachment of the same name, so a body package with other
// proportions moves the shoulders, elbows, hips and so on with it.
// Clothing follows Roblox's compositing: each body region is filled with its BodyColors colour, then Pants,
// then Shirt (the shirt is drawn over the pants on the torso), then the T-shirt on the torso front.
import { findInstance, assetId } from "./rbxm.js";
import { buildBody } from "./body.js";

/** R15 joint name for each part (the Motor6D that connects the part to its parent). */
export const R15_JOINT_OF = {
  LowerTorso: "Root", UpperTorso: "Waist",
  LeftUpperArm: "LeftShoulder", LeftLowerArm: "LeftElbow", LeftHand: "LeftWrist",
  RightUpperArm: "RightShoulder", RightLowerArm: "RightElbow", RightHand: "RightWrist",
  LeftUpperLeg: "LeftHip", LeftLowerLeg: "LeftKnee", LeftFoot: "LeftAnkle",
  RightUpperLeg: "RightHip", RightLowerLeg: "RightKnee", RightFoot: "RightAnkle",
};
export const R15_PARTS = ["HumanoidRootPart", ...Object.keys(R15_JOINT_OF)];

/** Which BodyColors property and which clothing region each part belongs to. */
export const BODY_REGION = {
  Head: "Head", UpperTorso: "Torso", LowerTorso: "Torso", Torso: "Torso",
  LeftUpperArm: "LeftArm", LeftLowerArm: "LeftArm", LeftHand: "LeftArm", "Left Arm": "LeftArm",
  RightUpperArm: "RightArm", RightLowerArm: "RightArm", RightHand: "RightArm", "Right Arm": "RightArm",
  LeftUpperLeg: "LeftLeg", LeftLowerLeg: "LeftLeg", LeftFoot: "LeftLeg", "Left Leg": "LeftLeg",
  RightUpperLeg: "RightLeg", RightLowerLeg: "RightLeg", RightFoot: "RightLeg", "Right Leg": "RightLeg",
};
export const BODY_COLOR_KEYS = ["HeadColor3", "TorsoColor3", "LeftArmColor3", "RightArmColor3", "LeftLegColor3", "RightLegColor3"];

// ---------------------------------------------------------------------------------------------------------
// Build a body from parts and their rig attachments

const posOf = (a) => (Array.isArray(a) ? a : a && a.pos ? a.pos : null);

/** The standard blocky R15 parts with their rig attachments (part-relative, studs), as a parts map. */
export function defaultR15Parts() {
  const b = buildBody({ shape: "classic" });
  const bone = Object.fromEntries(b.bind.map((x) => [x.name, x]));
  const parts = { HumanoidRootPart: { size: [2, 2, 1], center: bone.HumanoidRootPart.pos.slice(), attachments: {} } };
  for (const p of b.parts) parts[p.bone] = { size: p.size.slice(), center: p.center.slice(), attachments: {}, kind: p.kind, taper: p.taper };
  const rel = (part, at) => at.map((v, i) => v - parts[part].center[i]);
  for (const [child, joint] of Object.entries(R15_JOINT_OF)) {
    const parent = bone[child].parent, at = bone[child].pos;
    parts[parent].attachments[joint + "RigAttachment"] = rel(parent, at);
    parts[child].attachments[joint + "RigAttachment"] = rel(child, at);
  }
  parts.UpperTorso.attachments.NeckRigAttachment = rel("UpperTorso", b.neck.pos);
  for (const p of Object.values(parts)) delete p.center;
  return parts;
}

/**
 * Humanoid:BuildRigFromAttachments for R15. `parts` maps part names to `{ size, attachments }` (attachment
 * positions relative to the part's centre, as `[x, y, z]` or a CFrame). Parts you leave out, and
 * attachments a part doesn't have, come from the standard blocky body. Attachment rotations are ignored:
 * avatar rig attachments are axis-aligned.
 * @returns a Body (see buildBody) whose bind pose sits the joints on the attachments and whose parts are
 *          sized and centred like the MeshParts.
 */
export function buildBodyFromParts(parts = {}, { scale } = {}) {
  const def = defaultR15Parts(), P = {};
  for (const name of R15_PARTS) {
    const d = def[name], c = parts[name] || {};
    const att = { ...d.attachments }, rot = {};
    for (const [k, v] of Object.entries(c.attachments || {})) { const p = posOf(v); if (p) att[k] = p.slice(); if (v && v.rot) rot[k] = v.rot.slice(); }
    P[name] = { size: (c.size || d.size).slice(), attachments: att, rot, kind: d.kind, taper: c.size ? undefined : d.taper };
  }
  const base = buildBody({ shape: "classic" });
  const centre = { HumanoidRootPart: base.bind[0].pos.slice() }, joints = { HumanoidRootPart: centre.HumanoidRootPart.slice() };
  for (const b of base.bind.slice(1)) { // bind order is parents-first
    const jn = R15_JOINT_OF[b.name] + "RigAttachment", pa = P[b.parent].attachments[jn], ca = P[b.name].attachments[jn];
    if (!pa || !ca) throw new Error(`blockrig: ${b.parent} and ${b.name} both need a ${jn}`);
    const at = centre[b.parent].map((v, i) => v + pa[i]);
    joints[b.name] = at; centre[b.name] = at.map((v, i) => v - ca[i]);
  }
  const bind = base.bind.map((b) => ({ ...b, pos: joints[b.name] }));
  const neckAtt = P.UpperTorso.attachments.NeckRigAttachment;
  const neck = { parent: "UpperTorso", pos: centre.UpperTorso.map((v, i) => v + neckAtt[i]) };
  const partList = R15_PARTS.slice(1).map((name) => ({ bone: name, size: P[name].size, center: centre[name], kind: P[name].kind, ...(P[name].taper ? { taper: P[name].taper } : {}) }));
  const floor = Math.min(...["LeftFoot", "RightFoot"].map((f) => centre[f][1] - P[f].size[1] / 2));
  const attachments = {}; // every attachment in bind-pose character space, by name (rig attachments excluded)
  for (const [name, p] of Object.entries(P)) for (const [k, v] of Object.entries(p.attachments)) if (!/RigAttachment$/.test(k)) attachments[k] = { part: name, pos: centre[name].map((c, i) => c + v[i]), rot: p.rot[k] || ATTACHMENT_ROT[k] || null };
  const body = { rigType: "R15", bind, parts: partList, floor, neck, headScale: 1, attachments };
  return scale ? scaleBody(body, scale) : body;
}

function scaleBody(b, s0) {
  const s = Object.assign({ height: 1, width: 1, depth: 1, head: 1 }, s0), f = b.floor;
  const P = ([x, y, z]) => [x * s.width, (y - f) * s.height + f, z * s.depth];
  return {
    ...b,
    bind: b.bind.map((x) => ({ ...x, pos: P(x.pos) })),
    parts: b.parts.map((p) => ({ ...p, size: [p.size[0] * s.width, p.size[1] * s.height, p.size[2] * s.depth], center: P(p.center) })),
    neck: { ...b.neck, pos: P(b.neck.pos) },
    attachments: Object.fromEntries(Object.entries(b.attachments || {}).map(([k, v]) => [k, { ...v, pos: P(v.pos) }])),
    headScale: s.head, scale: s,
  };
}

// ---------------------------------------------------------------------------------------------------------
// Reading avatar items

/**
 * Describe the MeshParts of a body package (each body-part asset downloads as a model holding folders such
 * as R15ArtistIntent, R15Fixed and R6). Returns `{ PartName: { meshId, textureId, size, attachments } }`
 * with attachment positions relative to the part's centre. Several models can be passed at once.
 * @param {object[]} roots parsed instances (parseRbxm)
 * @param {{ folder?: string }} [o] which folder to prefer (default "R15ArtistIntent", then "R15Fixed")
 */
export function describeBodyParts(roots, { folder } = {}) {
  const prefs = folder ? [folder] : ["R15ArtistIntent", "R15Fixed"];
  const out = {}, rank = {};
  const take = (mp, r) => {
    const name = mp.props.Name;
    if (!(name in R15_JOINT_OF) && name !== "Head" && name !== "HumanoidRootPart") return;
    if (name in rank && rank[name] <= r) return;
    const orig = mp.children.find((x) => x.className === "Vector3Value" && x.props.Name === "OriginalSize");
    const attachments = {};
    for (const a of mp.children) if (a.className === "Attachment" && a.props.CFrame) attachments[a.props.Name] = a.props.CFrame.pos.slice();
    const size = mp.props.size || mp.props.Size || (orig && orig.props.Value) || null;
    const wt = mp.children.find((x) => x.className === "WrapTarget");
    const cage = wt ? { meshId: assetId(wt.props.CageMeshId), origin: wt.props.CageOrigin ? wt.props.CageOrigin.pos.slice() : [0, 0, 0] } : null;
    out[name] = { meshId: assetId(mp.props.MeshId ?? mp.props.MeshID), textureId: assetId(mp.props.TextureID ?? mp.props.TextureId), size: size ? size.slice() : null, attachments, cage };
    rank[name] = r;
  };
  // MeshParts in a preferred folder win (in order); parts outside any folder come next; other folders
  // (such as R6) are skipped
  const visit = (list, f) => {
    for (const x of list) {
      const inFolder = x.className === "Folder" ? x.props.Name : f;
      if (x.className === "MeshPart") { const r = inFolder == null ? prefs.length : prefs.indexOf(inFolder); if (r >= 0) take(x, r); }
      visit(x.children, inFolder);
    }
  };
  visit(roots, null);
  return out;
}

const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("");
/** A colour property (Color3 0..1 floats, or Color3uint8 0..255) as "#rrggbb". */
export function colorHex(c) { if (!Array.isArray(c)) return null; return c.some((v) => v > 1) ? hex(c.map((v) => v / 255)) : hex(c); }

/** Read a BodyColors instance: `{ HeadColor3: "#rrggbb", TorsoColor3, LeftArmColor3, ... }`. */
export function describeBodyColors(roots) {
  const bc = findInstance(roots, (x) => x.className === "BodyColors");
  if (!bc) throw new Error("blockrig: no BodyColors in model");
  const out = {};
  for (const k of BODY_COLOR_KEYS) { const v = colorHex(bc.props[k]); if (v) out[k] = v; }
  return out;
}

/** Read classic clothing from a model or character: `{ shirt, pants, tshirt }` template asset ids (or null). */
export function describeClothing(roots) {
  const shirt = findInstance(roots, (x) => x.className === "Shirt"), pants = findInstance(roots, (x) => x.className === "Pants"), tee = findInstance(roots, (x) => x.className === "ShirtGraphic");
  return { shirt: shirt ? assetId(shirt.props.ShirtTemplate) : null, pants: pants ? assetId(pants.props.PantsTemplate) : null, tshirt: tee ? assetId(tee.props.Graphic) : null };
}

// ---------------------------------------------------------------------------------------------------------
// The classic clothing template (585 x 559). Faces are named from the character's point of view:
// F front, B back, R its right side, L its left side, U up, D down. Rects are [x, y, w, h] in pixels.
export const TEMPLATE_SIZE = [585, 559];
export const TEMPLATE = {
  Torso: { U: [231, 8, 128, 64], R: [165, 74, 64, 128], F: [231, 74, 128, 128], L: [361, 74, 64, 128], B: [427, 74, 128, 128], D: [231, 204, 128, 64] },
  RightLimb: { U: [217, 289, 64, 64], L: [19, 355, 64, 128], B: [85, 355, 64, 128], R: [151, 355, 64, 128], F: [217, 355, 64, 128], D: [217, 485, 64, 64] },
  LeftLimb: { U: [308, 289, 64, 64], F: [308, 355, 64, 128], L: [374, 355, 64, 128], B: [440, 355, 64, 128], R: [506, 355, 64, 128], D: [308, 485, 64, 64] },
};
export const T_SHIRT_RECT = TEMPLATE.Torso.F;
const LIMB_OF = { Torso: "Torso", LeftArm: "LeftLimb", RightArm: "RightLimb", LeftLeg: "LeftLimb", RightLeg: "RightLimb" };

/**
 * UVs that map a box onto the clothing template, for a body part centred at the origin.
 * Character axes: Y up, the character faces -Z, its right is +X. `slice` is the part's share of its whole
 * limb or torso, as [top, height] in 0..1 from the top, so R15 parts split the template the way the R6
 * limb it replaces would wear it. UVs are top-origin (use textures with flipY = false), like Roblox meshes.
 * @param {Float32Array|number[]} positions box vertex positions (x, y, z), centred on the part
 * @param {Float32Array|number[]} normals matching normals
 * @param {number[]} size [w, h, d]
 * @param {"Torso"|"LeftArm"|"RightArm"|"LeftLeg"|"RightLeg"} region
 * @param {[number, number]} [slice]
 */
export function templateUVs(positions, normals, size, region, slice = [0, 1]) {
  const rects = TEMPLATE[LIMB_OF[region]], [W, H, D] = size, [TW, TH] = TEMPLATE_SIZE;
  const n = positions.length / 3, uv = new Float32Array(n * 2);
  const c01 = (v) => Math.max(0, Math.min(1, v));
  for (let i = 0; i < n; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    const nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2];
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    const tSide = slice[0] + c01(0.5 - y / H) * slice[1]; // down the limb
    let face, s, t;
    if (ay >= ax && ay >= az) { face = ny > 0 ? "U" : "D"; s = c01(0.5 - x / W); t = ny > 0 ? c01(0.5 - z / D) : c01(0.5 + z / D); }
    else if (az >= ax) { face = nz < 0 ? "F" : "B"; s = nz < 0 ? c01(0.5 - x / W) : c01(0.5 + x / W); t = tSide; }
    else { face = nx > 0 ? "R" : "L"; s = nx > 0 ? c01(0.5 - z / D) : c01(0.5 + z / D); t = tSide; }
    const [rx, ry, rw, rh] = rects[face];
    // stay half a pixel inside the rect so filtering doesn't pick up the neighbouring face
    uv[i * 2] = (rx + 0.5 + s * (rw - 1)) / TW;
    uv[i * 2 + 1] = (ry + 0.5 + t * (rh - 1)) / TH;
  }
  return uv;
}

/** Each part's [top, height] share (0..1 from the top) of its region, from the bind-pose part boxes. */
export function regionSlices(parts) {
  const by = {};
  for (const p of parts) { const r = BODY_REGION[p.bone]; if (!r || r === "Head") continue; (by[r] ||= []).push(p); }
  const out = {};
  for (const list of Object.values(by)) {
    const top = Math.max(...list.map((p) => p.center[1] + p.size[1] / 2)), bot = Math.min(...list.map((p) => p.center[1] - p.size[1] / 2)), h = top - bot || 1;
    for (const p of list) out[p.bone] = [(top - (p.center[1] + p.size[1] / 2)) / h, p.size[1] / h];
  }
  return out;
}

/** Which clothing images draw onto a region, bottom to top. */
export function clothingLayers(region) {
  if (region === "Torso") return ["pants", "shirt", "tshirt"];
  if (region === "LeftArm" || region === "RightArm") return ["shirt"];
  if (region === "LeftLeg" || region === "RightLeg") return ["pants"];
  return [];
}

/**
 * Paint one region's texture: its body colour, then an optional part texture (a body MeshPart's TextureID),
 * then the clothing layers. Images must be loaded (or be canvases). `ctx` is a 2D context sized to the
 * template (any multiple of 585 x 559).
 */
export function paintRegion(ctx, region, color, clothing = {}, partImage = null) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color; ctx.fillRect(0, 0, width, height);
  if (partImage) ctx.drawImage(partImage, 0, 0, width, height);
  for (const layer of clothingLayers(region)) {
    const img = clothing[layer];
    if (!img) continue;
    if (layer === "tshirt") { const k = width / TEMPLATE_SIZE[0], [x, y, w, h] = T_SHIRT_RECT; ctx.drawImage(img, x * k, y * k, w * k, h * k); }
    else ctx.drawImage(img, 0, 0, width, height);
  }
}

/**
 * Orientation of body attachments that aren't axis-aligned on the standard bodies (row-major 3x3): the grip
 * attachments are turned -90 degrees about X (R15 Left/RightGripAttachment; R6's RightGrip C0 is the same turn),
 * which is the frame a Tool's Grip is measured from.
 */
export const ATTACHMENT_ROT = { RightGripAttachment: [1, 0, 0, 0, 0, 1, 0, -1, 0], LeftGripAttachment: [1, 0, 0, 0, 0, 1, 0, -1, 0] };

/**
 * Body attachments for rigid accessories (BodyFront/Back, Neck, Left/RightCollar, Waist*, Left/RightShoulder,
 * Left/RightGrip, Left/RightFoot), in bind-pose character space, keyed by name: `{ part, pos }`.
 * On BlockRig's blocky bodies they sit on the part faces where the standard body has them; a body package's
 * own attachments (buildBodyFromParts) replace these.
 */
export function defaultBodyAttachments(body) {
  const part = Object.fromEntries(body.parts.map((p) => [p.bone, p])), out = {};
  const at = (name, bone, fx, fy, fz) => {
    const p = part[bone]; if (!p) return;
    out[name] = { part: bone, pos: [p.center[0] + (fx * p.size[0]) / 2, p.center[1] + (fy * p.size[1]) / 2, p.center[2] + (fz * p.size[2]) / 2], rot: ATTACHMENT_ROT[name] || null };
  };
  const r6 = body.rigType === "R6", T = r6 ? "Torso" : "UpperTorso", W = r6 ? "Torso" : "LowerTorso";
  at("BodyFrontAttachment", T, 0, 0, -1); at("BodyBackAttachment", T, 0, 0, 1);
  at("NeckAttachment", T, 0, 1, 0); at("LeftCollarAttachment", T, -1, 1, 0); at("RightCollarAttachment", T, 1, 1, 0);
  at("WaistCenterAttachment", W, 0, -1, 0); at("WaistFrontAttachment", W, 0, -1, -1); at("WaistBackAttachment", W, 0, -1, 1);
  for (const S of ["Left", "Right"]) {
    at(`${S}ShoulderAttachment`, r6 ? `${S} Arm` : `${S}UpperArm`, 0, 1, 0);
    at(`${S}GripAttachment`, r6 ? `${S} Arm` : `${S}Hand`, 0, -1, 0);
    at(`${S}FootAttachment`, r6 ? `${S} Leg` : `${S}Foot`, 0, -1, 0);
  }
  return out;
}
