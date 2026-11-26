// BlockRig: an R15 character rig for three.js that wears Roblox-format layered clothing and accessories.
import * as THREE from "three";
import { cframeToMatrix } from "./cframe.js";
import { HEAD_ATTACHMENTS } from "./skeleton.js";
import { buildBody } from "./body.js";
import { lodIndices } from "./mesh.js";

const REV = parseInt(THREE.REVISION, 10);
const LEGACY_SKINNING_FLAG = REV < 129; // r128 and older need material.skinning = true
const HEAD_H = 1.2, HEAD_R = 0.62;

export function setSRGB(tex) {
  if ("colorSpace" in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  else tex.encoding = THREE.sRGBEncoding;
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
export function faceTexture(image, skin = "#f6dcc0") {
  if (typeof document === "undefined") return null;
  const W = 1024, H = 512, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"); g.fillStyle = skin; g.fillRect(0, 0, W, H);
  if (image) {
    const half = W / 4;
    for (let x = -half; x < half; x++) {
      const th = (x / half) * (Math.PI / 2), sx = (0.5 - 0.5 * Math.sin(th)) * image.width;
      const sw = Math.max(0.5, (Math.cos(th) * image.width * Math.PI) / (4 * half));
      g.drawImage(image, sx, 0, sw, image.height, W / 2 + x, 0, 1.2, H);
    }
  }
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; return setSRGB(t);
}

function geometryFromMesh(mesh, { lod = 0, skinned = false } = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(mesh.uvs, 2));
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
 */
export function createRig(o = {}) {
  const opts = Object.assign({ body: {}, face: null, outline: 0 }, o);
  const spec = buildBody({ rigType: opts.rigType, shape: opts.shape, scale: opts.scale });
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
  const bones = {}, list = [], bindWorld = [], bindLocalQ = [], bindWorldQ = [];
  const index = new Map(def.map((b, i) => [b.name, i]));
  def.forEach((b, i) => {
    const bone = new THREE.Bone(); bone.name = b.name;
    const W = cframeToMatrix({ rot: b.rot, pos: b.pos });
    bindWorld[i] = W;
    const p = b.parent == null ? -1 : index.get(b.parent);
    if (b.parent != null && p === undefined) throw new Error(`blockrig: bone ${b.name} has unknown parent ${b.parent}`);
    const L = p < 0 ? W.clone() : new THREE.Matrix4().copy(bindWorld[p]).invert().multiply(W);
    L.decompose(bone.position, bone.quaternion, bone.scale);
    bindLocalQ[i] = bone.quaternion.clone();
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
  const neckBindQ = neck.quaternion.clone();
  const head = new THREE.Group(); head.name = "Head"; neck.add(head);
  head.scale.setScalar(spec.headScale);

  // ---- blocky body ----
  const parts = {};
  let headMaterial = null, colors = null;
  const mats = {};
  if (opts.body !== false) {
    colors = Object.assign({ skin: "#f6dcc0", shirt: "#1e1619", pants: "#241c1f", shoes: "#0b0708" }, opts.body);
    for (const k of ["skin", "shirt", "pants", "shoes"]) mats[k] = material({ color: colors[k] });
    for (const p of spec.parts) parts[p.bone] = hang(p.bone, partMesh(p, mats));
    const hg = headGeometry(); hg.translate(0, HEAD_H / 2, 0);
    headMaterial = material({ color: colors.skin });
    const tex = opts.face ? faceTexture(opts.face, colors.skin) : null;
    if (tex) { headMaterial.map = tex; headMaterial.color.set(0xffffff); }
    parts.Head = new THREE.Mesh(hg, headMaterial); head.add(parts.Head);
    if (outline) { const ol = new THREE.Mesh(hg, olBox); parts.Head.userData.outline = ol; head.add(ol); }
  }

  // ---- posing (Motor6D-style Transform, expressed in character axes) ----
  const tq = new THREE.Quaternion(), te = new THREE.Euler(), iq = new THREE.Quaternion(), dq = new THREE.Quaternion();
  const rootBind = rootBone.position.clone();
  const alias = (n) => (n === "Head" ? "Neck" : n);
  const joint = (name) => (alias(name) === "Neck" ? neck : bones[name]);
  function delta(name, q) {
    if (name === "Neck") return dq.copy(q);
    const i = index.get(name); iq.copy(bindWorldQ[i]).invert();
    return dq.copy(iq).multiply(q).multiply(bindWorldQ[i]);
  }
  const bindQ = (name) => (name === "Neck" ? neckBindQ : bindLocalQ[index.get(name)]);

  const rig = {
    object: model, stage, bones, neck, head, parts, rigType, body: spec, joints: def.map((b) => b.name).concat("Neck"), garments: [], accessories: [],
    /** Rotate a joint by quaternion q (character axes) relative to its bind pose. */
    setJointQuat(name, q) { name = alias(name); const b = joint(name); if (!b) return false; b.quaternion.copy(bindQ(name)).multiply(delta(name, q)); return true; },
    /** Rotate a joint by Euler angles (radians, character axes, YXZ order). */
    setJoint(name, x = 0, y = 0, z = 0) { return rig.setJointQuat(name, tq.setFromEuler(te.set(x, y, z, "YXZ"))); },
    /** Add a rotation on top of the joint's current pose. */
    nudgeJoint(name, x = 0, y = 0, z = 0) { name = alias(name); const b = joint(name); if (!b) return false; tq.setFromEuler(te.set(x, y, z, "YXZ")); b.quaternion.multiply(delta(name, tq)); return true; },
    /** Move the whole body (HumanoidRootPart) in character space, studs. */
    setRootOffset(x = 0, y = 0, z = 0) { rootBone.position.set(rootBind.x + x, rootBind.y + y, rootBind.z + z); },
    resetPose() { list.forEach((b, i) => { b.quaternion.copy(bindLocalQ[i]); }); neck.quaternion.copy(neckBindQ); rig.setRootOffset(0, 0, 0); },
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
    addLayeredClothing(mesh, { map = null, color = 0xffffff, lod = 0, side = THREE.DoubleSide } = {}) {
      if (rigType !== "R15") throw new Error("blockrig: layered clothing needs an R15 rig");
      if (!mesh.skinIndex || !mesh.bones.length) throw new Error("blockrig: mesh has no skinning data (need .mesh v4+)");
      const geo = geometryFromMesh(mesh, { lod, skinned: true });
      const mat = material({ map, color, side }, true);
      const sm = new THREE.SkinnedMesh(geo, mat); sm.name = "LayeredClothing"; sm.frustumCulled = false;
      stage.add(sm);
      const saved = list.map((b) => [b.quaternion.clone(), b.position.clone()]);
      rig.resetPose(); model.updateMatrixWorld(true);
      const skBones = [], inverses = [];
      for (const b of mesh.bones) {
        const bone = bones[b.name];
        if (!bone) throw new Error(`blockrig: garment bone "${b.name}" is not in the rig`);
        skBones.push(bone);
        inverses.push(new THREE.Matrix4().multiplyMatrices(stage.matrixWorld, cframeToMatrix(b.cframe)).invert());
      }
      const skeleton = new THREE.Skeleton(skBones, inverses);
      sm.bind(skeleton, sm.matrixWorld.clone());
      if (outline) { const ol = new THREE.SkinnedMesh(geo, outlineMaterial(opts.outline, true)); ol.frustumCulled = false; stage.add(ol); ol.updateMatrixWorld(true); ol.bind(skeleton, sm.bindMatrix.clone()); }
      list.forEach((b, i) => { b.quaternion.copy(saved[i][0]); b.position.copy(saved[i][1]); });
      rig.garments.push(sm);
      return sm;
    },

    /**
     * Attach a rigid accessory mesh by attachment matching:
     *   Handle = BodyPart * BodyAttachment * HandleAttachment^-1
     * @param {object} mesh parsed mesh
     * @param {{ attachment: { name: string, cframe: {rot:number[], pos:number[]} }, map?: THREE.Texture, color?: number }} o
     */
    addAccessory(mesh, { attachment, map = null, color = 0xffffff } = {}) {
      if (!attachment) throw new Error("blockrig: addAccessory needs the handle attachment");
      const body = HEAD_ATTACHMENTS[attachment.name];
      if (!body) throw new Error(`blockrig: unsupported attachment ${attachment.name}`);
      const m = new THREE.Mesh(geometryFromMesh(mesh), material({ map, color, side: THREE.DoubleSide, roughness: 1 }));
      m.name = attachment.name;
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

    /** Replace the face decal. */
    setFace(image) { if (!headMaterial) return; const t = faceTexture(image, headMaterial.color.getStyle()); if (t) { headMaterial.map = t; headMaterial.color.set(0xffffff); headMaterial.needsUpdate = true; } },
  };
  return rig;
}
