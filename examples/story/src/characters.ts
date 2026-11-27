// The cast, built with BlockRig: an original kid, an original giant ice statue and some townsfolk.
// Faces are BlockRig's drawn expressions; hair is a blocky accessory welded by HairAttachment.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createRig, createFace } from "blockrig";
import { rng } from "./lib/rng";

export type Cast = { kid: any; statue: any; folks: any[]; faces: Record<string, any>; props: Record<string, THREE.Object3D> };

// ---- helpers ----
// weld an object (modelled in character axes: Y up, facing -Z) to a body part at a bind-pose character-space
// point, with BlockRig's Weld (Object = Part * C0); "Neck" means the head
function attach(rig: any, joint: string, obj: THREE.Object3D, at: [number, number, number]) {
  const part = joint === "Neck" ? "Head" : joint, p = rig.partCFrame(part).pos;
  rig.weld(obj, part, { c0: { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [at[0] - p[0], at[1] - p[1], at[2] - p[2]] } });
  obj.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; } });
  return obj;
}
const jointAt = (rig: any, name: string) => rig.body.bind.find((b: any) => b.name === name).pos as [number, number, number];

// three.js geometry -> the mesh shape BlockRig's addAccessory takes
function toMesh(g: THREE.BufferGeometry) {
  const ng = g.index ? g : (g as any);
  const idx = ng.index ? Uint32Array.from(ng.index.array) : Uint32Array.from({ length: ng.attributes.position.count }, (_, i) => i);
  return { positions: ng.attributes.position.array, normals: ng.attributes.normal.array, uvs: ng.attributes.uv.array, indices: idx, faceCount: idx.length / 3, lods: [0, idx.length / 3] };
}
// blocky hair: a cap plus a few fringe blocks; the handle's HairAttachment sits 0.25 above the cap's centre
function hairMesh(style: "messy" | "flat" | "spiky", seed: number) {
  const r = rng(seed), parts: THREE.BufferGeometry[] = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0, rx = 0) => {
    const b = new THREE.BoxGeometry(w, h, d); b.rotateX(rx); b.rotateZ(rz); b.translate(x, y, z); parts.push(b.toNonIndexed());
  };
  box(1.34, 0.5, 1.34, 0, 0, 0.02);
  box(1.36, 0.6, 0.28, 0, -0.3, 0.6); // back
  if (style === "messy") for (let i = 0; i < 5; i++) box(0.34, 0.26, 0.3, -0.5 + i * 0.25, -0.2 - r() * 0.06, -0.6, (r() - 0.5) * 0.6);
  if (style === "flat") box(1.3, 0.18, 0.3, 0, -0.18, -0.6);
  if (style === "spiky") for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(0.3, 0.55, 0.3, Math.sin(a) * 0.45, 0.3, Math.cos(a) * 0.45, Math.sin(a) * 0.5, Math.cos(a) * -0.5); }
  const g = mergeGeometries(parts); g.computeVertexNormals();
  return toMesh(g);
}
const HAIR_ATT = { name: "HairAttachment", cframe: { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, 0.02, 0] } };

function scarfMesh(color = "#d62828") {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.2, 10, 28), m); ring.rotation.x = Math.PI / 2; g.add(ring);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.0, 0.12), m); tail.position.set(0.32, -0.55, -0.62); tail.rotation.z = 0.12; g.add(tail);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.13), new THREE.MeshStandardMaterial({ color: "#f4f1de" })); stripe.position.set(0.33, -0.85, -0.63); g.add(stripe);
  return g;
}
// a scarf bundled up in the statue's palm
function scarfBundle() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: "#d62828", roughness: 0.8 });
  for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.55 - i * 0.1, 0.18, 8, 20), m); t.rotation.x = Math.PI / 2; t.position.y = i * 0.18; g.add(t); }
  return g;
}

export function buildCast(): Cast {
  const faces: Record<string, any> = {};

  // ---- the kid ----
  faces.kid = createFace({ expression: "neutral", blink: false });
  const kid = createRig({ face: faces.kid, outline: 0.03, body: { skin: "#f2c94c", shirt: "#1abc9c", pants: "#2c3e50", shoes: "#1b1b1b" } });
  kid.addAccessory(hairMesh("messy", 3), { attachment: HAIR_ATT, color: 0x5b3a1e });
  const ut = jointAt(kid, "UpperTorso");
  const pack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.6), new THREE.MeshStandardMaterial({ color: "#e76f51", roughness: 0.7 }));
  attach(kid, "UpperTorso", pack, [0, ut[1] + 0.85, 0.75]);
  const kidScarf = scarfMesh(); kidScarf.position.y = 0.06; kid.neck.add(kidScarf); kidScarf.visible = false;

  // ---- the ice statue: a giant built on BlockRig's "buff" body ----
  faces.statue = createFace({ expression: { eyeOpen: 0, brows: 0, mouthCurve: 0, mouthWidth: 0.5 }, blink: false, ink: "#1d4e6b", eyeColor: "#7ff5ff", glow: "#7ff5ff" });
  const statue = createRig({ shape: "buff", scale: { height: 2.6, width: 2.4, depth: 2.3, head: 2.1 }, face: faces.statue, outline: 0.07,
    body: { skin: "#cfeeff", shirt: "#a9dcfa", pants: "#94cff5", shoes: "#7cbbe8" } });
  statue.object.traverse((o: any) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial) { o.material.roughness = 0.15; o.material.metalness = 0.05; o.material.emissive = new THREE.Color("#2a6f97"); o.material.emissiveIntensity = 0.18; }
  });
  const ice = new THREE.MeshStandardMaterial({ color: "#e9fbff", roughness: 0.08, metalness: 0.1, emissive: new THREE.Color("#4cc9f0"), emissiveIntensity: 0.35, transparent: true, opacity: 0.92 });
  const crystal = (h: number, r: number) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), ice); return c; };
  for (const side of [-1, 1]) {
    const sh = jointAt(statue, side < 0 ? "LeftUpperArm" : "RightUpperArm");
    for (let i = 0; i < 3; i++) {
      const c = crystal(1.6 - i * 0.35, 0.38 - i * 0.07);
      attach(statue, side < 0 ? "LeftUpperArm" : "RightUpperArm", c, [sh[0] + side * (0.6 + i * 0.35), sh[1] + 0.9 - i * 0.2, (i - 1) * 0.5]);
    }
  }
  const nk = statue.body.neck.pos as number[], hs = statue.body.headScale;
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.42, c = crystal(1.0 + (i === 2 ? 0.6 : 0.2), 0.24);
    attach(statue, "Neck", c, [nk[0] + Math.sin(a) * 0.55 * hs, nk[1] + 1.2 * hs + Math.cos(a) * 0.2, nk[2] + 0.1]);
  }
  const bundle = scarfBundle();
  const rh = jointAt(statue, "RightHand");
  attach(statue, "RightHand", bundle, [rh[0], rh[1] - 1.05, rh[2] - 0.6]);
  bundle.visible = false;

  // ---- townsfolk ----
  const looks = [
    { skin: "#f3d2b9", shirt: "#e63946", pants: "#1d3557", hair: 0x2b2b2b, style: "flat" },
    { skin: "#8d5a3b", shirt: "#f4a261", pants: "#264653", hair: 0x111111, style: "spiky" },
    { skin: "#eec39a", shirt: "#6c5ce7", pants: "#2d3436", hair: 0xc8a165, style: "messy" },
    { skin: "#c68a5c", shirt: "#00b894", pants: "#353b48", hair: 0x3d2314, style: "flat" },
    { skin: "#fbe6cf", shirt: "#fdcb6e", pants: "#0984e3", hair: 0xb5651d, style: "spiky" },
    { skin: "#f2c94c", shirt: "#ff7675", pants: "#2d3436", hair: 0x222222, style: "messy" },
  ] as const;
  const folks = looks.map((l, i) => {
    const face = createFace({ expression: "neutral", blink: false, seed: i + 11 });
    faces[`folk${i}`] = face;
    const r = createRig({ face, outline: 0.03, shape: i % 3 === 1 ? "slender" : "classic", body: { skin: l.skin, shirt: l.shirt, pants: l.pants, shoes: "#1b1b1b" } });
    r.addAccessory(hairMesh(l.style as any, i + 5), { attachment: HAIR_ATT, color: l.hair });
    return r;
  });

  for (const r of [kid, statue, ...folks]) r.object.traverse((o: any) => { if (o.isMesh) o.castShadow = true; });
  return { kid, statue, folks, faces, props: { kidScarf, bundle } };
}

// named expressions for this story: BlockRig built-ins plus the statue's own looks
export const STATUE_FACES: Record<string, any> = {
  frozen: { eyeOpen: 0, brows: 0, mouthCurve: 0, mouthWidth: 0.5 },
  awake: { eyeSize: 1.25, browAngle: 0.35, mouthCurve: -0.15, mouthWidth: 0.6, brows: 1 },
  gentle: { eyeSize: 1.1, squint: 0.45, browAngle: -0.35, mouthCurve: 0.7, mouthWidth: 0.8, brows: 1 },
};
