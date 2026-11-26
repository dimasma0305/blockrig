// BlockRig: an R15 character rig for three.js that wears Roblox-format layered clothing and accessories.
import * as THREE from "three";
import { cframeToMatrix } from "./cframe.js";
import { R15_BIND, R15_NECK_Y, R15_FLOOR, HEAD_ATTACHMENTS } from "./skeleton.js";
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

/**
 * Create a rig.
 * @param {object} [o]
 * @param {{name:string,parent:string|null,pos:number[],rot:number[]}[]} [o.skeleton] bind pose (defaults to R15_BIND)
 * @param {{skin?:string, shirt?:string, pants?:string, shoes?:string}|false} [o.body] blocky body colours, or false for none
 * @param {HTMLImageElement|HTMLCanvasElement|null} [o.face] face decal wrapped onto the head
 * @param {number} [o.outline] cartoon outline width in studs (0 = none)
 */
export function createRig(o = {}) {
  const opts = Object.assign({ skeleton: R15_BIND, body: {}, face: null, outline: 0 }, o);
  const def = opts.skeleton;
  const model = new THREE.Group(); model.name = "BlockRig";
  const stage = new THREE.Group(); stage.name = "BlockRigStage";
  stage.rotation.y = Math.PI; // Roblox characters face -Z; turn them towards +Z (the default camera)
  model.add(stage);

  // ---- bones ----
  const bones = {}, list = [], bindWorld = [], bindLocalQ = [], bindWorldQ = [], bindPos = [];
  const index = new Map(def.map((b, i) => [b.name, i]));
  def.forEach((b, i) => {
    const bone = new THREE.Bone(); bone.name = b.name;
    const W = cframeToMatrix({ rot: b.rot, pos: b.pos });
    bindWorld[i] = W;
    const p = b.parent == null ? -1 : index.get(b.parent);
    if (b.parent != null && p === undefined) throw new Error(`blockrig: bone ${b.name} has unknown parent ${b.parent}`);
    const L = p < 0 ? W.clone() : new THREE.Matrix4().copy(bindWorld[p]).invert().multiply(W);
    L.decompose(bone.position, bone.quaternion, bone.scale);
    bindLocalQ[i] = bone.quaternion.clone(); bindPos[i] = bone.position.clone();
    bindWorldQ[i] = new THREE.Quaternion().setFromRotationMatrix(W);
    if (p >= 0) list[p].add(bone); else stage.add(bone);
    bones[b.name] = bone; list.push(bone);
  });
  const rootBone = list[0];
  const by = (n) => (index.has(n) ? def[index.get(n)].pos[1] : 0);
  const z0 = def[0].pos[2];
  const floor = Math.min(...def.filter((b) => /Foot$/.test(b.name)).map((b) => b.pos[1]), R15_FLOOR + 0.3) - 0.3;
  stage.position.y = -floor;

  const outline = opts.outline > 0;
  const olBox = outline ? outlineMaterial(opts.outline, false) : null;

  // attach a mesh built in bind-pose character space to a bone, so it follows that bone
  function hang(boneName, mesh) {
    const i = index.get(boneName);
    mesh.applyMatrix4(new THREE.Matrix4().copy(bindWorld[i]).invert());
    bones[boneName].add(mesh);
    if (outline && mesh.isMesh) { const ol = new THREE.Mesh(mesh.geometry, olBox); ol.position.copy(mesh.position); ol.quaternion.copy(mesh.quaternion); ol.scale.copy(mesh.scale); bones[boneName].add(ol); }
    return mesh;
  }
  const box = (w, h, d, cx, cy, cz, mat) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(cx, cy, cz); const m = new THREE.Mesh(g, mat); return m; };

  // ---- neck joint (clothing skeletons stop at UpperTorso) ----
  const neck = new THREE.Bone(); neck.name = "Neck";
  const ut = index.get("UpperTorso");
  neck.position.set(0, R15_NECK_Y, z0).applyMatrix4(new THREE.Matrix4().copy(bindWorld[ut]).invert());
  neck.quaternion.copy(bindWorldQ[ut]).invert(); // neck axes = character axes
  bones.UpperTorso.add(neck);
  const neckBindQ = neck.quaternion.clone();
  const head = new THREE.Group(); head.name = "Head"; neck.add(head);

  // ---- blocky body ----
  const parts = {};
  let headMaterial = null;
  if (opts.body !== false) {
    const c = Object.assign({ skin: "#f6dcc0", shirt: "#1e1619", pants: "#241c1f", shoes: "#0b0708" }, opts.body);
    const skin = material({ color: c.skin }), shirt = material({ color: c.shirt }), pants = material({ color: c.pants }), shoes = material({ color: c.shoes });
    const waist = by("UpperTorso"), hip = by("LowerTorso"), top = waist + 1.6;
    parts.LowerTorso = hang("LowerTorso", box(2, waist - hip, 1, 0, (waist + hip) / 2, z0, shirt));
    parts.UpperTorso = hang("UpperTorso", box(2, 1.6, 1, 0, waist + 0.8, z0, shirt));
    for (const s of [-1, 1]) {
      const side = s < 0 ? "Left" : "Right", ax = s * 1.5, lx = s * 0.5;
      const el = by(side + "LowerArm"), wr = by(side + "Hand"), kn = by(side + "LowerLeg"), an = by(side + "Foot");
      parts[side + "UpperArm"] = hang(side + "UpperArm", box(1, top - el, 1, ax, (top + el) / 2, z0, shirt));
      parts[side + "LowerArm"] = hang(side + "LowerArm", box(0.98, el - wr, 0.98, ax, (el + wr) / 2, z0, shirt));
      parts[side + "Hand"] = hang(side + "Hand", box(0.98, 0.3, 0.98, ax, wr - 0.15, z0, skin));
      parts[side + "UpperLeg"] = hang(side + "UpperLeg", box(1, hip - kn, 1, lx, (hip + kn) / 2, z0, pants));
      parts[side + "LowerLeg"] = hang(side + "LowerLeg", box(0.98, kn - an, 0.98, lx, (kn + an) / 2, z0, pants));
      parts[side + "Foot"] = hang(side + "Foot", box(1, 0.3, 1, lx, an - 0.15, z0, shoes));
    }
    const hg = headGeometry(); hg.translate(0, HEAD_H / 2, 0);
    headMaterial = material({ color: opts.face ? "#ffffff" : c.skin });
    const tex = opts.face ? faceTexture(opts.face, c.skin) : null;
    if (tex) headMaterial.map = tex; else headMaterial.color.set(c.skin);
    parts.Head = new THREE.Mesh(hg, headMaterial); head.add(parts.Head);
    if (outline) head.add(new THREE.Mesh(hg, olBox));
  }

  // ---- posing (Motor6D-style Transform, expressed in character axes) ----
  const tq = new THREE.Quaternion(), te = new THREE.Euler(), iq = new THREE.Quaternion(), dq = new THREE.Quaternion();
  const rootBind = rootBone.position.clone();
  const joint = (name) => (name === "Neck" ? neck : bones[name]);
  function delta(name, q) {
    if (name === "Neck") return dq.copy(q);
    const i = index.get(name); iq.copy(bindWorldQ[i]).invert();
    return dq.copy(iq).multiply(q).multiply(bindWorldQ[i]);
  }
  const bindQ = (name) => (name === "Neck" ? neckBindQ : bindLocalQ[index.get(name)]);

  const rig = {
    object: model, stage, bones, neck, head, parts, joints: def.map((b) => b.name).concat("Neck"), garments: [], accessories: [],
    /** Rotate a joint by quaternion q (character axes) relative to its bind pose. */
    setJointQuat(name, q) { const b = joint(name); if (!b) return false; b.quaternion.copy(bindQ(name)).multiply(delta(name, q)); return true; },
    /** Rotate a joint by Euler angles (radians, character axes, YXZ order). */
    setJoint(name, x = 0, y = 0, z = 0) { return rig.setJointQuat(name, tq.setFromEuler(te.set(x, y, z, "YXZ"))); },
    /** Add a rotation on top of the joint's current pose. */
    nudgeJoint(name, x = 0, y = 0, z = 0) { const b = joint(name); if (!b) return false; tq.setFromEuler(te.set(x, y, z, "YXZ")); b.quaternion.multiply(delta(name, tq)); return true; },
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

    /** Replace the face decal. */
    setFace(image) { if (!headMaterial) return; const t = faceTexture(image, headMaterial.color.getStyle()); if (t) { headMaterial.map = t; headMaterial.color.set(0xffffff); headMaterial.needsUpdate = true; } },
  };
  return rig;
}
