// BlockRig: an R15 character rig for three.js that wears Roblox-format layered clothing and accessories.
import * as THREE from "three";
import { cframeToMatrix, matrixToCFrame } from "./cframe.js";
import { HEAD_ATTACHMENTS } from "./skeleton.js";
import { buildBody } from "./body.js";
import { lodIndices } from "./mesh.js";
import { parseFacs, facsBoneOffsets, FACE_CONTROLS } from "./facs.js";
import { fitLayer, cageMap } from "./wrap.js";
import { solvePosition, applyPole, solveRotation, solveLookAt } from "./ik.js";
import { buildBodyFromParts, defaultBodyAttachments, templateUVs, regionSlices, paintRegion, colorHex, BODY_REGION, TEMPLATE_SIZE } from "./avatar.js";

const REV = parseInt(THREE.REVISION, 10);
const LEGACY_SKINNING_FLAG = REV < 129; // r128 and older need material.skinning = true
const HEAD_H = 1.2, HEAD_R = 0.62;

// Look up constants that exist only in some three.js versions at run time. A static `THREE.sRGBEncoding`
// (removed in r162) or `THREE.SRGBColorSpace` (added in r152) breaks bundlers that check named imports.
const threeConst = (name) => THREE[name];
export function setSRGB(tex) {
  const srgb = threeConst("SRGBColorSpace");
  if ("colorSpace" in tex && srgb) tex.colorSpace = srgb;
  else tex.encoding = threeConst("sRGBEncoding");
  return tex;
}

/** Load a texture for a Roblox mesh (Roblox UVs start at the top-left, so flipY is off). */
export function loadRobloxTexture(url, loader = new THREE.TextureLoader()) {
  const t = loader.load(url);
  t.flipY = false;
  return setSRGB(t);
}

function material(opts, skinned) {
  const o = Object.assign({ roughness: 0.9, metalness: 0 }, opts);
  if (skinned && LEGACY_SKINNING_FLAG) o.skinning = true;
  return new THREE.MeshStandardMaterial(o);
}

function outlineMaterial(width, skinned) {
  const o = { color: 0x0b0708, side: THREE.BackSide };
  if (skinned && LEGACY_SKINNING_FLAG) o.skinning = true;
  const m = new THREE.MeshBasicMaterial(o);
  m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", `vec3 transformed = position + normal * ${width.toFixed(4)};`); };
  m.customProgramCacheKey = () => `blockrig-outline-${width}-${skinned}`;
  return m;
}

/** Classic block head: a barrel with rounded rims. UV u = 0.5 is on -Z, the face side. */
export function headGeometry(height = HEAD_H, radius = HEAD_R) {
  const c = 0.22, hh = height / 2, pts = [new THREE.Vector2(0.001, -hh)];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(radius - c + Math.cos(a) * c, -hh + c + Math.sin(a) * c)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(radius - c + Math.cos(a) * c, hh - c + Math.sin(a) * c)); }
  pts.push(new THREE.Vector2(0.001, hh));
  const g = new THREE.LatheGeometry(pts, 32), pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setY(i, (pos.getY(i) + hh) / height);
  return g;
}

/** Wrap a flat face decal (image or canvas) onto the front half of the head without stretching it. */
export function faceTexture(image, skin = "#f6dcc0", target = null) {
  if (typeof document === "undefined" && !target) return null;
  const W = 1024, H = 512, cv = target || document.createElement("canvas");
  if (!target) { cv.width = W; cv.height = H; }
  const g = cv.getContext("2d"); g.fillStyle = skin; g.fillRect(0, 0, W, H);
  if (image) {
    const half = W / 4;
    for (let x = -half; x < half; x++) {
      const th = (x / half) * (Math.PI / 2), sx = (0.5 - 0.5 * Math.sin(th)) * image.width;
      const sw = Math.max(0.5, (Math.cos(th) * image.width * Math.PI) / (4 * half));
      g.drawImage(image, sx, 0, sw, image.height, W / 2 + x, 0, 1.2, H);
    }
  }
  if (target) return null;
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; return setSRGB(t);
}

/**
 * A face decal for any head (e.g. a downloaded avatar): a curved strip in front of the head that shows a
 * createFace() canvas. Head space: origin at the neck, Y up, the face looks towards -Z.
 * @param {object} face a createFace() controller
 * @param {{ radius?: number, height?: number, arc?: number, y?: number, segments?: number }} [o]
 */
export function createFaceDecal(face, { radius = 0.63, height = 1.2, arc = Math.PI * 0.95, y = 0.6, segments = 24 } = {}) {
  const g = new THREE.CylinderGeometry(radius, radius, height, segments, 1, true, Math.PI - arc / 2, arc);
  g.translate(0, y, 0);
  const tex = new THREE.CanvasTexture(face.canvas); setSRGB(tex); tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.04, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = new THREE.Mesh(g, mat); mesh.name = "FaceDecal"; mesh.renderOrder = 2;
  face.onChange(() => { tex.needsUpdate = true; });
  return mesh;
}

function geometryFromMesh(mesh, { lod = 0, skinned = false } = {}) {
  const g = new THREE.BufferGeometry();
  // copies: geometry is scaled, moved and (for dynamic heads) deformed in place, and a parsed mesh may be
  // shared by several rigs
  g.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(mesh.positions), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(Float32Array.from(mesh.normals), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(Float32Array.from(mesh.uvs), 2));
  if (skinned) {
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(mesh.skinIndex, 4));
    g.setAttribute("skinWeight", new THREE.BufferAttribute(mesh.skinWeight, 4));
  }
  g.setIndex(new THREE.BufferAttribute(lodIndices(mesh, lod), 1));
  return g;
}

// one blocky part: a box (optionally tapered towards the bottom), with an R6 hand/shoe band in another colour
function partMesh(p, mats) {
  const [w, h, d] = p.size, g = new THREE.BoxGeometry(w, h, d, 1, p.hand || p.shoe ? 2 : 1, 1);
  if (p.taper && p.taper !== 1) { const a = g.attributes.position; for (let i = 0; i < a.count; i++) if (a.getY(i) < 0) a.setX(i, a.getX(i) * p.taper); g.computeVertexNormals(); }
  g.translate(p.center[0], p.center[1], p.center[2]);
  const mesh = new THREE.Mesh(g, mats[p.kind]);
  mesh.name = p.bone;
  if (p.hand || p.shoe) { // R6 limbs: colour the bottom band as a hand or a shoe
    const band = p.hand ? mats.skin : mats.shoes, by = p.center[1] - h / 2 + (p.hand || p.shoe);
    const bg = new THREE.BoxGeometry(w * 1.002, p.hand || p.shoe, d * 1.002); bg.translate(p.center[0], by - (p.hand || p.shoe) / 2, p.center[2]);
    mesh.add(new THREE.Mesh(bg, band));
  }
  return mesh;
}

// a body MeshPart: the mesh is fitted to the part's Size by its bounding box and centred on the part, as
// MeshParts render
function fittedGeometry(mesh, size) {
  const g = geometryFromMesh(mesh); g.computeBoundingBox();
  const c = g.boundingBox.getCenter(new THREE.Vector3()), e = g.boundingBox.getSize(new THREE.Vector3());
  g.translate(-c.x, -c.y, -c.z);
  if (size) g.scale(e.x > 1e-6 ? size[0] / e.x : 1, e.y > 1e-6 ? size[1] / e.y : 1, e.z > 1e-6 ? size[2] / e.z : 1);
  return { geometry: g, centre: c, extent: e };
}
const cssColor = (v) => (Array.isArray(v) ? colorHex(v) : "#" + new THREE.Color(v).getHexString());
const imageOf = (v) => (v && v.isTexture ? v.image : v) || null;
const ready = (img) => !!img && img.complete !== false && (img.width > 0 || img.naturalWidth > 0);
function makeCanvas(w, h) {
  if (typeof document !== "undefined" && document.createElement) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  return null;
}

// classic part layout re-fitted to an arbitrary R15 bind pose
function partsFromJoints(bind, spec) {
  const y = (n) => bind.find((b) => b.name === n).pos[1], x = (n) => bind.find((b) => b.name === n).pos[0], z0 = bind[0].pos[2];
  const waist = y("UpperTorso"), hip = y("LowerTorso"), top = waist + 1.6, P = [];
  P.push({ bone: "LowerTorso", size: [2, waist - hip, 1], center: [0, (waist + hip) / 2, z0], kind: "shirt" }, { bone: "UpperTorso", size: [2, 1.6, 1], center: [0, waist + 0.8, z0], kind: "shirt" });
  for (const side of ["Left", "Right"]) {
    const ax = x(side + "LowerArm"), lx = x(side + "LowerLeg"), el = y(side + "LowerArm"), wr = y(side + "Hand"), kn = y(side + "LowerLeg"), an = y(side + "Foot");
    P.push({ bone: side + "UpperArm", size: [1, top - el, 1], center: [ax, (top + el) / 2, z0], kind: "shirt" }, { bone: side + "LowerArm", size: [0.98, el - wr, 0.98], center: [ax, (el + wr) / 2, z0], kind: "shirt" },
      { bone: side + "Hand", size: [0.98, 0.3, 0.98], center: [ax, wr - 0.15, z0], kind: "skin" }, { bone: side + "UpperLeg", size: [1, hip - kn, 1], center: [lx, (hip + kn) / 2, z0], kind: "pants" },
      { bone: side + "LowerLeg", size: [0.98, kn - an, 0.98], center: [lx, (kn + an) / 2, z0], kind: "pants" }, { bone: side + "Foot", size: [1, 0.3, 1], center: [lx, an - 0.15, z0], kind: "shoes" });
  }
  spec.neck = { parent: "UpperTorso", pos: [0, top, z0] };
  spec.floor = Math.min(y("LeftFoot"), y("RightFoot")) - 0.3;
  return P;
}

/**
 * Create a rig.
 * @param {object} [o]
 * @param {"R15"|"R6"} [o.rigType] skeleton family (default R15)
 * @param {"classic"|"slender"|"buff"|"tall"|"child"|object} [o.shape] R15 body shape (see R15_SHAPES), or custom proportions
 * @param {{height?:number,width?:number,depth?:number,head?:number}} [o.scale] Roblox-style body scales
 * @param {{name:string,parent:string|null,pos:number[],rot:number[]}[]} [o.skeleton] custom R15 bind pose (overrides shape)
 * @param {{skin?:string, shirt?:string, pants?:string, shoes?:string}|false} [o.body] blocky body colours, or false for none
 * @param {HTMLImageElement|HTMLCanvasElement|null} [o.face] face decal wrapped onto the head
 * @param {number} [o.outline] cartoon outline width in studs (0 = none)
 * @param {Record<string, {mesh?:object, size?:number[], attachments?:Record<string, number[]|{pos:number[]}>, map?:THREE.Texture|CanvasImageSource}>} [o.bodyParts]
 *   an R15 body package: parts by name, as describeBodyParts() reads them, plus their parsed meshes. Joints are
 *   built from the parts' rig attachments (Humanoid:BuildRigFromAttachments); parts left out stay blocky.
 * @param {Record<string, any>} [o.bodyColors] Roblox BodyColors: HeadColor3, TorsoColor3, LeftArmColor3,
 *   RightArmColor3, LeftLegColor3, RightLegColor3 (a three.js colour, "#rrggbb", or [r, g, b] 0..1)
 * @param {{shirt?:any, pants?:any, tshirt?:any}} [o.clothing] classic clothing images or textures on the
 *   585x559 template (Shirt.ShirtTemplate, Pants.PantsTemplate, ShirtGraphic.Graphic)
 */
export function createRig(o = {}) {
  const opts = Object.assign({ body: {}, face: null, outline: 0 }, o);
  const avatarMode = !!(opts.bodyParts || opts.bodyColors || opts.clothing);
  if (opts.bodyParts && (opts.rigType || "R15").toUpperCase() !== "R15") throw new Error("blockrig: bodyParts needs an R15 rig");
  const spec = opts.bodyParts
    ? buildBodyFromParts(Object.fromEntries(Object.entries(opts.bodyParts).map(([k, v]) => [k, { size: v.size, attachments: v.attachments }])), { scale: opts.scale })
    : buildBody({ rigType: opts.rigType, shape: opts.shape, scale: opts.scale });
  if (opts.skeleton) { // a custom bind pose keeps the classic parts layout, re-fitted to its joints
    if (spec.rigType !== "R15") throw new Error("blockrig: a custom skeleton needs rigType R15");
    spec.bind = opts.skeleton; spec.parts = partsFromJoints(opts.skeleton, spec);
  }
  const def = spec.bind, rigType = spec.rigType;
  const model = new THREE.Group(); model.name = "BlockRig";
  model.userData.rigType = rigType;
  const stage = new THREE.Group(); stage.name = "BlockRigStage";
  stage.rotation.y = Math.PI; // Roblox characters face -Z; turn them towards +Z (the default camera)
  model.add(stage);

  // ---- bones ----
  const bones = {}, list = [], bindWorld = [], bindLocalQ = [], bindWorldQ = [], bindLocalP = [], parentOf = [];
  const index = new Map(def.map((b, i) => [b.name, i]));
  def.forEach((b, i) => {
    const bone = new THREE.Bone(); bone.name = b.name;
    const W = cframeToMatrix({ rot: b.rot, pos: b.pos });
    bindWorld[i] = W;
    const p = b.parent == null ? -1 : index.get(b.parent);
    if (b.parent != null && p === undefined) throw new Error(`blockrig: bone ${b.name} has unknown parent ${b.parent}`);
    const L = p < 0 ? W.clone() : new THREE.Matrix4().copy(bindWorld[p]).invert().multiply(W);
    L.decompose(bone.position, bone.quaternion, bone.scale);
    bindLocalQ[i] = bone.quaternion.clone(); bindLocalP[i] = bone.position.clone(); parentOf[i] = p;
    bindWorldQ[i] = new THREE.Quaternion().setFromRotationMatrix(W);
    if (p >= 0) list[p].add(bone); else stage.add(bone);
    bones[b.name] = bone; list.push(bone);
  });
  const rootBone = list[0];
  stage.position.y = -spec.floor;

  const outline = opts.outline > 0;
  const olBox = outline ? outlineMaterial(opts.outline, false) : null;

  // attach a mesh built in bind-pose character space to a bone, so it follows that bone
  function hang(boneName, mesh) {
    const i = index.get(boneName);
    mesh.applyMatrix4(new THREE.Matrix4().copy(bindWorld[i]).invert());
    bones[boneName].add(mesh);
    if (outline && mesh.isMesh) { const ol = new THREE.Mesh(mesh.geometry, olBox); ol.position.copy(mesh.position); ol.quaternion.copy(mesh.quaternion); ol.scale.copy(mesh.scale); mesh.userData.outline = ol; bones[boneName].add(ol); }
    return mesh;
  }

  // ---- neck joint (clothing skeletons stop at UpperTorso; R6 necks sit on Torso) ----
  const neck = new THREE.Bone(); neck.name = "Neck";
  const np = index.get(spec.neck.parent);
  neck.position.fromArray(spec.neck.pos).applyMatrix4(new THREE.Matrix4().copy(bindWorld[np]).invert());
  neck.quaternion.copy(bindWorldQ[np]).invert(); // neck axes = character axes
  bones[spec.neck.parent].add(neck);
  const neckBindQ = neck.quaternion.clone(), neckBindP = neck.position.clone();
  const head = new THREE.Group(); head.name = "Head"; neck.add(head);
  // the head's attachment points in head space (origin at the neck joint); setHead() replaces them with the
  // head asset's own, the way Roblox heads carry their HairAttachment / HatAttachment / FaceFrontAttachment
  const headAtt = Object.fromEntries(Object.entries(HEAD_ATTACHMENTS).map(([k, v]) => [k, v.slice()]));
  head.scale.setScalar(spec.headScale);

  // ---- Roblox avatar body: BodyColors + classic clothing composited per region ----
  // Each region (Torso, LeftArm, RightArm, LeftLeg, RightLeg) gets one canvas texture on the 585x559 template:
  // body colour, then Pants, then Shirt, then the T-shirt (torso front). A part with its own TextureID gets a
  // canvas of its own with that texture under the clothing.
  const avatar = { colors: {}, clothing: {}, layers: {}, extra: [] };
  const bodyAtt = Object.assign(defaultBodyAttachments(spec), spec.attachments || {});
  function buildAvatarBody() {
    for (const r of ["Head", "Torso", "LeftArm", "RightArm", "LeftLeg", "RightLeg"]) avatar.colors[r] = cssColor((opts.bodyColors || {})[r + "Color3"] ?? colors.skin);
    colors.skin = avatar.colors.Head; // the head (and a face's background) wear HeadColor3
    Object.assign(avatar.clothing, opts.clothing || {});
    const slices = regionSlices(spec.parts);
    for (const p of spec.parts) {
      const region = BODY_REGION[p.bone], src = (opts.bodyParts || {})[p.bone];
      let g;
      if (src && src.mesh) {
        g = fittedGeometry(src.mesh, p.size).geometry;
        // R15 body meshes are UV-mapped to Roblox's per-limb composite textures, whose layout isn't published,
        // so classic clothing is projected onto the mesh from its shape (each vertex by its normal and height),
        // the same way it maps onto the blocky parts. A part with its own texture keeps its own UVs.
        if (!src.map && src.uvs !== "mesh") {
          const gi = g.index ? g.toNonIndexed() : g, pos = gi.attributes.position.array, flat = new Float32Array(pos.length);
          const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
          for (let t = 0; t < pos.length; t += 9) { // one normal per triangle decides its template face
            a.fromArray(pos, t); b.fromArray(pos, t + 3); c.fromArray(pos, t + 6);
            b.sub(a); c.sub(a); b.cross(c).normalize();
            for (let k = 0; k < 3; k++) b.toArray(flat, t + k * 3);
          }
          gi.setAttribute("uv", new THREE.BufferAttribute(templateUVs(pos, flat, p.size, region, slices[p.bone]), 2));
          g = gi; // shading keeps the mesh's own smooth normals
        }
      } else {
        g = new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
        g.setAttribute("uv", new THREE.BufferAttribute(templateUVs(g.attributes.position.array, g.attributes.normal.array, p.size, region, slices[p.bone]), 2));
        if (p.taper && p.taper !== 1) { const a = g.attributes.position; for (let i = 0; i < a.count; i++) if (a.getY(i) < 0) a.setX(i, a.getX(i) * p.taper); g.computeVertexNormals(); }
      }
      g.translate(p.center[0], p.center[1], p.center[2]);
      const m = new THREE.Mesh(g, skinLayer(region, src && src.map ? src.map : null).mat); m.name = p.bone;
      parts[p.bone] = hang(p.bone, m);
    }
    paintAvatar();
  }
  function skinLayer(region, partMap) {
    if (!partMap && avatar.layers[region]) return avatar.layers[region];
    const k = 2, canvas = makeCanvas(TEMPLATE_SIZE[0] * k, TEMPLATE_SIZE[1] * k), L = { region, partMap, ctx: null, tex: null, mat: null };
    const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    if (ctx) { L.ctx = ctx; L.tex = setSRGB(new THREE.CanvasTexture(canvas)); L.tex.flipY = false; L.mat = material({ map: L.tex }); }
    else L.mat = material({ color: avatar.colors[region] }); // no 2D canvas (e.g. Node): body colours only
    if (partMap) avatar.extra.push(L); else avatar.layers[region] = L;
    return L;
  }
  function paintAvatar() {
    const clothing = {};
    for (const k of ["shirt", "pants", "tshirt"]) { const img = imageOf(avatar.clothing[k]); if (ready(img)) clothing[k] = img; }
    for (const L of [...Object.values(avatar.layers), ...avatar.extra]) {
      const colour = avatar.colors[L.region];
      if (!L.ctx) { L.mat.color.set(colour); continue; }
      const own = imageOf(L.partMap);
      paintRegion(L.ctx, L.region, colour, clothing, ready(own) ? own : null);
      L.tex.needsUpdate = true;
    }
    if (headMaterial && !headMaterial.map) headMaterial.color.set(avatar.colors.Head);
  }

  // ---- blocky body ----
  const parts = {};
  let headMaterial = null, colors = null;
  const faceState = { face: null, tex: null, rewrap: null };
  const mats = {};
  if (opts.body !== false) {
    colors = Object.assign({ skin: "#f6dcc0", shirt: "#1e1619", pants: "#241c1f", shoes: "#0b0708" }, opts.body);
    if (avatarMode) buildAvatarBody();
    else {
      for (const k of ["skin", "shirt", "pants", "shoes"]) mats[k] = material({ color: colors[k] });
      for (const p of spec.parts) parts[p.bone] = hang(p.bone, partMesh(p, mats));
    }
    const hg = headGeometry(); hg.translate(0, HEAD_H / 2, 0);
    headMaterial = material({ color: colors.skin });
    const live = opts.face && opts.face.isFace ? opts.face : null;
    const tex = opts.face ? faceTexture(live ? live.canvas : opts.face, colors.skin) : null;
    if (tex) { headMaterial.map = tex; headMaterial.color.set(0xffffff); }
    if (live) {
      faceState.face = live; faceState.tex = tex;
      faceState.rewrap = () => { if (tex) { faceTexture(live.canvas, colors.skin, tex.image); tex.needsUpdate = true; } };
    }
    parts.Head = new THREE.Mesh(hg, headMaterial); head.add(parts.Head);
    if (outline) { const ol = new THREE.Mesh(hg, olBox); parts.Head.userData.outline = ol; head.add(ol); }
  }

  // ---- posing (Motor6D-style Transform, expressed in character axes) ----
  const tq = new THREE.Quaternion(), te = new THREE.Euler(), iq = new THREE.Quaternion(), dq = new THREE.Quaternion(), tv = new THREE.Vector3();
  const rootBind = rootBone.position.clone();
  const alias = (n) => (n === "Head" ? "Neck" : n);
  const joint = (name) => (alias(name) === "Neck" ? neck : bones[name]);
  function delta(name, q) {
    if (name === "Neck") return dq.copy(q);
    const i = index.get(name); iq.copy(bindWorldQ[i]).invert();
    return dq.copy(iq).multiply(q).multiply(bindWorldQ[i]);
  }
  const bindQ = (name) => (name === "Neck" ? neckBindQ : bindLocalQ[index.get(name)]);

  // ---- layered clothing: the body's WrapTarget cages and the fitted layers ----
  const bodyCage = new Map(), layers = [];
  const WRAP_INFLATE = 0.015; // studs each layer sits further out than the one below (and the body)
  const GARMENT_BONE_ALIAS = { Root: "HumanoidRootPart", HumanoidRootNode: "HumanoidRootPart" };
  const garmentBone = (name) => (name === "Head" ? neck : bones[GARMENT_BONE_ALIAS[name] || name]);
  if (opts.bodyParts) for (const p of spec.parts) {
    const src = opts.bodyParts[p.bone];
    if (!src || !src.cage || !src.cage.mesh) continue;
    // a part's cage is in its part space (CageOrigin offset), scaled like the part's mesh
    let sc = [1, 1, 1];
    if (src.mesh) { const e = fittedGeometry(src.mesh, null).extent; sc = [0, 1, 2].map((k) => (e.getComponent(k) > 1e-6 ? p.size[k] / e.getComponent(k) : 1)); }
    cageMap(src.cage.mesh, { origin: src.cage.origin || [0, 0, 0], at: p.center, scale: sc, into: bodyCage });
  }

  // ---- welds and tools: objects placed in the bind pose, parented to the bone of their part ----
  const welds = new Map(); let equipped = null, headCentre = [0, HEAD_H / 2, 0];
  const partFrame = (name) => {
    if (name === "Head") return new THREE.Matrix4().makeTranslation(...headPoint(headCentre));
    const p = spec.parts.find((x) => x.bone === name);
    if (!p) throw new Error(`blockrig: no body part "${name}" on this ${rigType} rig`);
    return new THREE.Matrix4().makeTranslation(p.center[0], p.center[1], p.center[2]);
  };
  // a head-space point (origin at the neck, scaled by the head scale) in bind-pose character space
  const headPoint = (v) => [0, 1, 2].map((k) => spec.neck.pos[k] + v[k] * spec.headScale);
  // the head group's frame in bind-pose character space (neck position, character axes, head scale)
  const headFrameOrigin = () => new THREE.Matrix4().compose(new THREE.Vector3().fromArray(spec.neck.pos), new THREE.Quaternion(), new THREE.Vector3().setScalar(spec.headScale));
  const attachmentFrame = (a) => { const M = new THREE.Matrix4().makeTranslation(a.pos[0], a.pos[1], a.pos[2]); if (a.rot) M.multiply(cframeToMatrix({ rot: a.rot, pos: [0, 0, 0] })); return M; };
  // put an object at a bind-pose character-space frame M, following the part's bone (or the head)
  function mount(object, partName, M) {
    if (partName === "Head") { // the head group carries the neck joint and head scale
      new THREE.Matrix4().copy(headFrameOrigin()).invert().multiply(M).decompose(object.position, object.quaternion, object.scale); head.add(object);
    } else {
      const i = index.get(partName); if (i === undefined) throw new Error(`blockrig: no joint "${partName}" on this rig`);
      new THREE.Matrix4().copy(bindWorld[i]).invert().multiply(M).decompose(object.position, object.quaternion, object.scale);
      bones[partName].add(object);
    }
    welds.set(object, partName);
    return object;
  }

  // ---- Humanoid.HipHeight: the HumanoidRootPart's bottom above the ground when standing (R6: above its legs) ----
  const rootHalf = spec.rootHalf ?? (spec.scale ? spec.scale.height : 1);
  const hipBind = rootBone.position.y - rootHalf - spec.floor - (rigType === "R6" ? 2 * (spec.scale ? spec.scale.height : 1) : 0);
  let hipAdjust = 0, lastRoot = [0, 0, 0];

  // ---- IKControl ----
  const ikControls = [];
  const boneOfPart = (name) => (name === "Head" || name === "Neck" ? neck : bones[name]);
  const stageQ = () => stage.getWorldQuaternion(new THREE.Quaternion());
  // where an end effector is: a body/head attachment or a part's centre, and which part carries it
  function effectorOf(name) {
    if (headAtt[name]) { const p = headAtt[name]; return { part: "Head", point: () => head.localToWorld(new THREE.Vector3(p[0], p[1], p[2])) }; }
    if (bodyAtt[name]) {
      const a = bodyAtt[name], i = index.get(a.part), local = new THREE.Vector3().fromArray(a.pos).applyMatrix4(new THREE.Matrix4().copy(bindWorld[i]).invert());
      return { part: a.part, point: () => bones[a.part].localToWorld(local.clone()) };
    }
    if (name === "Head") return { part: "Head", point: () => head.localToWorld(new THREE.Vector3(...headCentre)) };
    const p = spec.parts.find((x) => x.bone === name), i = index.get(name);
    if (!p || i === undefined) throw new Error(`blockrig: no part or attachment "${name}" for an IKControl`);
    const local = new THREE.Vector3().fromArray(p.center).applyMatrix4(new THREE.Matrix4().copy(bindWorld[i]).invert());
    return { part: name, point: () => bones[name].localToWorld(local.clone()) };
  }
  // the joints from chainRoot down to the effector part (its own joint included when it has to turn)
  function chainOf(rootName, partName, withEnd) {
    const root = boneOfPart(rootName), end = boneOfPart(partName);
    if (!root || !end) throw new Error(`blockrig: unknown joint in IK chain ${rootName} -> ${partName}`);
    const out = []; let b = withEnd ? end : end.parent;
    while (b && b !== root) { out.unshift(b); b = b.parent; }
    if (b !== root) throw new Error(`blockrig: ${partName} is not below ${rootName}`);
    out.unshift(root); return out;
  }
  // a part's world orientation (its character-axes frame), and its front (-Z)
  function partFrameQ(partName) {
    if (partName === "Head") return head.getWorldQuaternion(new THREE.Quaternion());
    return bones[partName].getWorldQuaternion(new THREE.Quaternion()).multiply(bindWorldQ[index.get(partName)].clone().invert());
  }
  const targetPos = (t, offset) => {
    const v = typeof t === "function" ? t() : t && t.isObject3D ? t.getWorldPosition(new THREE.Vector3()) : t ? new THREE.Vector3().copy(t) : null;
    if (v && offset && offset.pos) { const o = new THREE.Vector3().fromArray(offset.pos); if (t && t.isObject3D) o.applyQuaternion(t.getWorldQuaternion(new THREE.Quaternion())); v.add(o); }
    return v;
  };
  const targetQ = (t) => (t && t.isObject3D ? t.getWorldQuaternion(new THREE.Quaternion()) : t && t.isQuaternion ? t.clone() : null);

  // ---- dynamic head (FACS) state ----
  const faceControls = Object.fromEntries(FACE_CONTROLS.map((n) => [n, 0]));
  let dyn = null;

  const rig = {
    object: model, stage, bones, neck, head, parts, rigType, body: spec, joints: def.map((b) => b.name).concat("Neck"), garments: [], accessories: [],
    /** Rotate a joint by quaternion q (character axes) relative to its bind pose. */
    setJointQuat(name, q) { name = alias(name); const b = joint(name); if (!b) return false; b.quaternion.copy(bindQ(name)).multiply(delta(name, q)); return true; },
    /** Rotate a joint by Euler angles (radians, character axes, YXZ order). */
    setJoint(name, x = 0, y = 0, z = 0) { return rig.setJointQuat(name, tq.setFromEuler(te.set(x, y, z, "YXZ"))); },
    /** Add a rotation on top of the joint's current pose. */
    nudgeJoint(name, x = 0, y = 0, z = 0) { name = alias(name); const b = joint(name); if (!b) return false; tq.setFromEuler(te.set(x, y, z, "YXZ")); b.quaternion.multiply(delta(name, tq)); return true; },
    /** Move the whole body (HumanoidRootPart) in character space, studs. */
    setRootOffset(x = 0, y = 0, z = 0) { rootBone.position.set(rootBind.x + x, rootBind.y + y + hipAdjust, rootBind.z + z); lastRoot = [x, y, z]; },
    resetPose() { list.forEach((b, i) => { b.quaternion.copy(bindLocalQ[i]); b.position.copy(bindLocalP[i]); }); neck.quaternion.copy(neckBindQ); neck.position.copy(neckBindP); rig.setRootOffset(0, 0, 0); },
    /**
     * Translate a joint (the position part of a Motor6D Transform), in character axes, studs.
     * The offset is applied in the parent's frame, so it moves with the parent like Transform does.
     */
    setJointOffset(name, x = 0, y = 0, z = 0) {
      name = alias(name);
      if (name === "Neck") { tv.set(x, y, z).applyQuaternion(iq.copy(bindWorldQ[index.get(spec.neck.parent)]).invert()); neck.position.copy(neckBindP).add(tv); return true; }
      const i = index.get(name); if (i === undefined) return false;
      if (i === 0) { rig.setRootOffset(x, y, z); return true; }
      tv.set(x, y, z).applyQuaternion(iq.copy(bindWorldQ[parentOf[i]]).invert());
      list[i].position.copy(bindLocalP[i]).add(tv); return true;
    },
    /** Set a whole pose: { JointName: [x, y, z], rootOffset: [x, y, z] } */
    setPose(pose) {
      rig.resetPose();
      for (const k in pose) { if (k === "rootOffset") rig.setRootOffset(...pose[k]); else rig.setJoint(k, ...pose[k]); }
    },
    /** World position of a joint (after model.updateMatrixWorld). */
    jointPosition(name, target = new THREE.Vector3()) { model.updateMatrixWorld(true); return joint(name).getWorldPosition(target); },

    /**
     * Dress the rig in a skinned layered-clothing mesh (from parseMesh). The garment keeps its own bind
     * pose, so it deforms correctly even if its skeleton differs slightly from the rig's.
     */
    addLayeredClothing(mesh, { map = null, color = 0xffffff, lod = 0, side = THREE.DoubleSide, wrap = null } = {}) {
      if (rigType !== "R15") throw new Error("blockrig: layered clothing needs an R15 rig");
      if (!mesh.skinIndex || !mesh.bones.length) throw new Error("blockrig: mesh has no skinning data (need .mesh v4+)");
      const fit = !!(wrap && wrap.inner && bodyCage.size);
      const geo = geometryFromMesh(mesh, { lod, skinned: true });
      const mat = material({ map, color, side }, true);
      const sm = new THREE.SkinnedMesh(geo, mat); sm.name = "LayeredClothing"; sm.frustumCulled = false;
      stage.add(sm);
      const saved = list.map((b) => [b.quaternion.clone(), b.position.clone()]), neckSaved = [neck.quaternion.clone(), neck.position.clone()];
      rig.resetPose(); model.updateMatrixWorld(true);
      const skBones = [], inverses = [];
      for (const b of mesh.bones) {
        const bone = garmentBone(b.name);
        if (!bone) throw new Error(`blockrig: garment bone "${b.name}" is not in the rig`);
        skBones.push(bone);
        // a fitted garment sits on this rig's own bind pose; an unfitted one keeps the garment's bind pose
        inverses.push(fit ? bone.matrixWorld.clone().invert() : new THREE.Matrix4().multiplyMatrices(stage.matrixWorld, cframeToMatrix(b.cframe)).invert());
      }
      const skeleton = new THREE.Skeleton(skBones, inverses);
      sm.bind(skeleton, sm.matrixWorld.clone());
      if (outline) { const ol = new THREE.SkinnedMesh(geo, outlineMaterial(opts.outline, true)); ol.frustumCulled = false; stage.add(ol); ol.updateMatrixWorld(true); ol.bind(skeleton, sm.bindMatrix.clone()); }
      list.forEach((b, i) => { b.quaternion.copy(saved[i][0]); b.position.copy(saved[i][1]); }); neck.quaternion.copy(neckSaved[0]); neck.position.copy(neckSaved[1]);
      rig.garments.push(sm);
      if (fit) {
        // WrapLayer -> WrapTarget: refit the whole stack in Order (then the order garments were added in)
        layers.push({ sm, base: Float32Array.from(geo.attributes.position.array), normals: Float32Array.from(geo.attributes.normal.array), wrap, order: wrap.order ?? 1, seq: layers.length });
        layers.sort((x, y) => x.order - y.order || x.seq - y.seq);
        let target = bodyCage;
        layers.forEach((L, i) => { L.inflate = WRAP_INFLATE * (i + 1); });
        for (const L of layers) {
          const r = fitLayer(L.base, L.wrap, target, { normals: L.normals, inflate: L.inflate });
          const pos = L.sm.geometry.attributes.position; pos.array.set(r.positions); pos.needsUpdate = true;
          L.sm.geometry.computeVertexNormals(); L.sm.geometry.computeBoundingSphere();
          L.matched = r.matched; target = r.target;
        }
        sm.userData.wrap = { matched: layers.find((L) => L.sm === sm).matched };
      }
      return sm;
    },
    /** The body's WrapTarget cages in character space (template UV -> position); empty without body-part cages. */
    get bodyCage() { return bodyCage; },

    /**
     * Attach a rigid accessory mesh by attachment matching:
     *   Handle = BodyPart * BodyAttachment * HandleAttachment^-1
     * @param {object} mesh parsed mesh
     * @param {{ attachment: { name: string, cframe: {rot:number[], pos:number[]} }, map?: THREE.Texture, color?: number }} o
     */
    /**
     * Weld an object to a body part, like a Weld: Object = Part0 * C0 * C1^-1, with Part0 the part's centre in
     * the bind pose (character axes) and C0 / C1 CFrames ({ rot, pos } or matrices). The object follows the part.
     * "Head" welds to the head. Returns the object.
     */
    weld(object, partName, { c0 = null, c1 = null } = {}) {
      const M = partFrame(partName);
      if (c0) M.multiply(cframeToMatrix(c0));
      if (c1) M.multiply(cframeToMatrix(c1).invert());
      return mount(object, partName, M);
    },
    /**
     * Weld an object by attachments, like a RigidConstraint (or an accessory weld): the object's own attachment
     * `objectAttachment` (a CFrame in the object's space) is put on the body or head attachment `name`.
     */
    attachTo(object, name, objectAttachment = null) {
      const inv = objectAttachment ? cframeToMatrix(objectAttachment).invert() : new THREE.Matrix4();
      if (headAtt[name]) return mount(object, "Head", new THREE.Matrix4().makeTranslation(...headPoint(headAtt[name])).multiply(inv));
      const a = bodyAtt[name]; if (!a) throw new Error(`blockrig: no attachment "${name}" on this rig`);
      return mount(object, a.part, attachmentFrame(a).multiply(inv));
    },
    /**
     * Equip a tool, like Humanoid:EquipTool: a RightGrip weld with Part0 = the right hand (R6: Right Arm),
     * C0 = RightGripAttachment and C1 = Tool.Grip. `object` is the tool's Handle (in handle space). One tool at a
     * time: equipping another unequips the first. Returns the object.
     */
    equipTool(object, { grip = null } = {}) {
      rig.unequipTool();
      const a = bodyAtt.RightGripAttachment; if (!a) throw new Error("blockrig: this rig has no RightGripAttachment");
      const M = attachmentFrame(a); if (grip) M.multiply(cframeToMatrix(grip).invert());
      mount(object, a.part, M); equipped = object; object.userData.blockrigTool = true;
      return object;
    },
    /** Take the equipped tool off (it is removed from the rig and returned). */
    unequipTool() { const t = equipped; if (t) { rig.unweld(t); equipped = null; } return t; },
    /** The equipped tool's object, or null. */
    get tool() { return equipped; },
    /** A body part's bind-pose CFrame in character space (its centre, character axes), like Part.CFrame. */
    partCFrame(name) { return matrixToCFrame(partFrame(name)); },
    /** Humanoid.HipHeight: the HumanoidRootPart's bottom above the ground when standing (R6: above its legs). Set it to raise or lower the body. */
    get hipHeight() { return hipBind + hipAdjust; },
    set hipHeight(v) { hipAdjust = v - hipBind; rig.setRootOffset(...lastRoot); },
    /**
     * Add an IKControl: { type: "Position"|"Rotation"|"Transform"|"LookAt", chainRoot, endEffector (part or
     * attachment name), target (world Vector3, Object3D or () => Vector3), pole?, weight = 1, offset?, priority = 0,
     * enabled = true, iterations = 12 }. Solved after the Animator on every update (or call rig.solveIK()).
     * Returns the control; change its fields at any time.
     */
    addIKControl(o) {
      const c = Object.assign({ type: "Position", weight: 1, priority: 0, enabled: true, iterations: 12, pole: null, offset: null }, o);
      if (!c.chainRoot || !c.endEffector) throw new Error("blockrig: an IKControl needs chainRoot and endEffector");
      c.seq = ikControls.length; ikControls.push(c); return c;
    },
    removeIKControl(c) { const i = ikControls.indexOf(c); if (i >= 0) ikControls.splice(i, 1); },
    get ikControls() { return ikControls; },
    /** Apply the IKControls to the current pose (the Animator calls this after posing). */
    solveIK() {
      const active = ikControls.filter((c) => c.enabled && c.weight > 0 && c.target).sort((a, b) => a.priority - b.priority || a.seq - b.seq);
      if (!active.length) return;
      model.updateMatrixWorld(true);
      for (const c of active) {
        const eff = effectorOf(c.endEffector), turns = c.type !== "Position";
        const chain = chainOf(c.chainRoot, eff.part, turns), before = chain.map((b) => b.quaternion.clone());
        const tp = targetPos(c.target, c.offset);
        if ((c.type === "Position" || c.type === "Transform") && tp) {
          const posChain = c.type === "Transform" ? chain.slice(0, -1) : chain;
          if (posChain.length) { solvePosition(posChain, eff.point, tp, { iterations: c.iterations }); if (c.pole) { const pp = targetPos(c.pole); if (pp) applyPole(posChain, eff.point, pp); } }
        }
        if (c.type === "Rotation" || c.type === "Transform") {
          const tq = targetQ(c.target);
          if (tq) { const end = chain[chain.length - 1]; solveRotation(end, eff.part === "Head" ? tq : tq.multiply(bindWorldQ[index.get(eff.part)])); }
        }
        if (c.type === "LookAt" && tp) solveLookAt(chain, eff.point, () => new THREE.Vector3(0, 0, -1).applyQuaternion(partFrameQ(eff.part)), tp);
        if (c.weight < 1) chain.forEach((b, i) => { b.quaternion.copy(before[i].slerp(b.quaternion, c.weight)); });
        model.updateMatrixWorld(true);
      }
    },
    /** Remove a welded object from the rig. */
    unweld(object) { if (object.parent) object.parent.remove(object); welds.delete(object); return object; },
    /** Objects welded to the rig: Map(object -> part name). */
    get welds() { return welds; },

    addAccessory(mesh, { attachment, map = null, color = 0xffffff } = {}) {
      if (!attachment) throw new Error("blockrig: addAccessory needs the handle attachment");
      const body = headAtt[attachment.name], onBody = !body && bodyAtt[attachment.name];
      if (!body && !onBody) throw new Error(`blockrig: unsupported attachment ${attachment.name}`);
      const m = new THREE.Mesh(geometryFromMesh(mesh), material({ map, color, side: THREE.DoubleSide, roughness: 1 }));
      m.name = attachment.name;
      if (onBody) { // weld to the body part that carries the attachment (bind-pose character space)
        const [x, y, z] = onBody.pos, i = index.get(onBody.part);
        m.applyMatrix4(new THREE.Matrix4().copy(bindWorld[i]).invert().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(cframeToMatrix(attachment.cframe).invert()));
        bones[onBody.part].add(m); rig.accessories.push(m);
        return m;
      }
      const weld = new THREE.Matrix4().makeTranslation(body[0], body[1], body[2]).multiply(cframeToMatrix(attachment.cframe).invert());
      m.applyMatrix4(weld);
      head.add(m); rig.accessories.push(m);
      return m;
    },

    /**
     * Swap a blocky part for your own mesh, e.g. a body-bundle MeshPart. The mesh is given in the part's
     * local space (centred on the part, Roblox axes), as MeshPart meshes are. Use "Head" for the head.
     * @param {string} partName  e.g. "LeftUpperArm", "Torso", "Head"
     * @param {object} mesh parsed mesh
     * @param {{ map?: THREE.Texture, color?: number, scale?: number[] }} [o]
     */
    setBodyPart(partName, mesh, { map = null, color = 0xffffff, scale = [1, 1, 1] } = {}) {
      const old = parts[partName];
      const m = new THREE.Mesh(geometryFromMesh(mesh), material({ map, color }));
      m.name = partName; m.scale.fromArray(scale);
      if (partName === "Head") { m.position.set(0, HEAD_H / 2, 0); head.add(m); }
      else {
        const p = spec.parts.find((x) => x.bone === partName);
        if (!p) throw new Error(`blockrig: no body part "${partName}" on this ${rigType} rig`);
        m.position.fromArray(p.center); hang(partName, m);
      }
      if (old) { old.visible = false; if (old.userData.outline) old.userData.outline.visible = false; }
      parts[partName] = m;
      return m;
    },

    /** Body attachments accessories can weld to: `{ Name: { part, pos } }` (bind-pose character space). */
    get bodyAttachments() { return bodyAtt; },
    /**
     * Put on classic clothing: `{ shirt, pants, tshirt }` images or textures on the 585x559 template (null takes
     * one off). Images must be loaded; call again, or refreshAvatar(), once they are.
     */
    setClothing(c = {}) {
      if (!avatarMode) throw new Error("blockrig: create the rig with bodyColors, clothing or bodyParts to use Roblox clothing");
      for (const k of ["shirt", "pants", "tshirt"]) if (k in c) { if (c[k]) avatar.clothing[k] = c[k]; else delete avatar.clothing[k]; }
      paintAvatar(); return rig;
    },
    /** Change BodyColors: `{ HeadColor3, TorsoColor3, LeftArmColor3, RightArmColor3, LeftLegColor3, RightLegColor3 }`. */
    setBodyColors(bc = {}) {
      if (!avatarMode) throw new Error("blockrig: create the rig with bodyColors, clothing or bodyParts to use BodyColors");
      for (const [k, v] of Object.entries(bc)) { const r = k.replace(/Color3$/, ""); if (r in avatar.colors) avatar.colors[r] = cssColor(v); }
      paintAvatar(); return rig;
    },
    /** Repaint the avatar textures (after clothing or body-part images finish loading). */
    refreshAvatar() { if (avatarMode) paintAvatar(); return rig; },
    /** BodyColors ("#rrggbb" by region) and clothing in use, or null for a BlockRig-coloured body. */
    get avatar() { return avatarMode ? { bodyColors: { ...avatar.colors }, clothing: { ...avatar.clothing } } : null; },

    /** The live face (createFace controller) driving this rig's head, if any. */
    get face() { return faceState.face; },
    /** Change expression with a fade (needs a live face). */
    setExpression(nameOrParams, o) { if (faceState.face) faceState.face.set(nameOrParams, o); return rig; },
    /** Advance the live face (blending, blinking, talking). The Animator calls this for you. */
    updateFace(dt) { const f = faceState.face; if (f && f.update(dt) && faceState.rewrap) faceState.rewrap(); rig.applyFaceControls(); },
    /**
     * Show a live face as a decal on this rig's head (for heads that are not BlockRig's own barrel,
     * e.g. downloaded avatars). The decal follows the neck joint.
     */
    addFaceDecal(face, o = {}) {
      const d = createFaceDecal(face, o);
      head.add(d); faceState.face = face; faceState.rewrap = null;
      return d;
    },

    /** The head's attachment points (head space: origin at the neck joint, Y up, face towards -Z). */
    get headAttachments() { return headAtt; },
    /**
     * Swap the head for a Roblox head asset: a SpecialMesh (FileMesh) with Scale/Offset, plus the head's own
     * attachments (Vector3Values relative to the Head part's centre), as returned by describeHead().
     * The mesh is placed so its NeckRigAttachment sits on the neck joint (classic heads without one are
     * centred 0.6 studs above it), and accessories added afterwards weld to the head's own attachments.
     * @param {object} mesh parsed mesh
     * @param {{ scale?: number[], offset?: number[], attachments?: Record<string, number[]>, map?: THREE.Texture, color?: THREE.ColorRepresentation }} [o]
     */
    setHead(mesh, { scale = [1, 1, 1], offset = [0, 0, 0], attachments = {}, map = null, color } = {}) {
      const neckAtt = attachments.NeckRigAttachment;
      const centre = neckAtt ? [-neckAtt[0], -neckAtt[1], -neckAtt[2]] : [0, HEAD_H / 2, 0];
      headCentre = centre.slice();
      const g = geometryFromMesh(mesh);
      g.scale(scale[0], scale[1], scale[2]);
      g.translate(centre[0] + offset[0], centre[1] + offset[1], centre[2] + offset[2]);
      const old = parts.Head, dynamic = !!(mesh.facs && mesh.skinIndex && mesh.bones && mesh.bones.length);
      const skin = colors ? colors.skin : 0xf6dcc0;
      // a dynamic head's texture is the face painted over transparent skin, so the head wears HeadColor and
      // the texture rides on top as a layer that shares (and deforms with) the head geometry
      const mat = material({ map: dynamic ? null : map, color: color ?? (map && !dynamic ? 0xffffff : skin) });
      if (!map && old && old.material && old.material.map && faceState.tex === old.material.map) mat.map = old.material.map; // keep a wrapped live face
      const m = new THREE.Mesh(g, mat); m.name = "Head";
      head.add(m);
      if (dynamic && map) {
        const layer = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, depthWrite: false }));
        layer.name = "HeadTexture"; layer.renderOrder = 1; m.add(layer);
      }
      if (outline) { const ol = new THREE.Mesh(g, olBox); m.userData.outline = ol; head.add(ol); }
      if (old) { old.visible = false; if (old.userData.outline) old.userData.outline.visible = false; }
      parts.Head = m;
      for (const [k, v] of Object.entries(attachments)) if (k !== "NeckRigAttachment") headAtt[k] = [centre[0] + v[0], centre[1] + v[1], centre[2] + v[2]];
      dyn = null;
      if (dynamic) {
        const facs = parseFacs(mesh.facs);
        dyn = { facs, geom: g, scale, base: g.attributes.position.array.slice(), skinIndex: mesh.skinIndex, skinWeight: mesh.skinWeight,
          rowOf: mesh.bones.map((b) => facs.bones.indexOf(b.name)), offsets: new Float32Array(facs.rows * 3), last: null };
        rig.applyFaceControls();
      }
      return m;
    },
    /** True when the head is a dynamic (FACS) head driven by rig.faceControls. */
    get dynamicHead() { return !!dyn; },
    /**
     * Pose a dynamic head from rig.faceControls (Roblox FaceControls: 50 values, 0..1). The Animator calls this
     * every update; call it yourself after changing faceControls by hand. Returns true if the face changed.
     */
    applyFaceControls() {
      if (!dyn) return false;
      let key = ""; for (const n of FACE_CONTROLS) key += (faceControls[n] || 0) + ",";
      if (key === dyn.last) return false;
      dyn.last = key;
      const off = facsBoneOffsets(dyn.facs, faceControls, dyn.offsets), { base, skinIndex, skinWeight, rowOf, scale: s } = dyn;
      const pos = dyn.geom.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        let x = 0, y = 0, z = 0;
        for (let k = 0; k < 4; k++) {
          const w = skinWeight[v * 4 + k]; if (!w) continue;
          const r = rowOf[skinIndex[v * 4 + k]]; if (r === undefined || r < 0) continue;
          x += w * off[r * 3]; y += w * off[r * 3 + 1]; z += w * off[r * 3 + 2];
        }
        pos.array[v * 3] = base[v * 3] + x * s[0]; pos.array[v * 3 + 1] = base[v * 3 + 1] + y * s[1]; pos.array[v * 3 + 2] = base[v * 3 + 2] + z * s[2];
      }
      pos.needsUpdate = true; dyn.geom.computeVertexNormals(); dyn.geom.computeBoundingSphere();
      return true;
    },
    /** Roblox FaceControls for a dynamic head: `{ JawDrop: 0, LeftEyeClosed: 0, ... }` (all 50, 0..1). */
    faceControls,
    /** Bounding box of the current head mesh in head space (useful to size a face decal). */
    headBounds() { const b = new THREE.Box3(); if (parts.Head) { parts.Head.geometry.computeBoundingBox(); b.copy(parts.Head.geometry.boundingBox).applyMatrix4(parts.Head.matrix); } return b; },

    /** Replace the face decal. */
    setFace(image) { if (!headMaterial) return; const t = faceTexture(image, headMaterial.color.getStyle()); if (t) { headMaterial.map = t; headMaterial.color.set(0xffffff); headMaterial.needsUpdate = true; } },
  };

  // a body package's head: a MeshPart fitted to its Size and placed by its NeckRigAttachment
  const headPart = opts.bodyParts && opts.bodyParts.Head;
  if (headPart && headPart.mesh && opts.body !== false) {
    const atts = Object.fromEntries(Object.entries(headPart.attachments || {}).map(([k, v]) => [k, Array.isArray(v) ? v : v.pos]));
    const { centre, extent } = fittedGeometry(headPart.mesh, null), sz = headPart.size || [extent.x, extent.y, extent.z];
    const sc = [extent.x > 1e-6 ? sz[0] / extent.x : 1, extent.y > 1e-6 ? sz[1] / extent.y : 1, extent.z > 1e-6 ? sz[2] / extent.z : 1];
    rig.setHead(headPart.mesh, { scale: sc, offset: [-centre.x * sc[0], -centre.y * sc[1], -centre.z * sc[2]], attachments: atts, map: headPart.map && headPart.map.isTexture ? headPart.map : null });
  }
  return rig;
}
