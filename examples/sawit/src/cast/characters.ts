// The cast (docs/visuals.md "Cast"), built with BlockRig's avatar mode. With the Roblox items (the default once
// downloaded, assets/roblox): catalog clothing, hair, the King's crown and beard, Grandpa's white beard, the guards'
// hoods, and anime face accessories per emotion. Without them: drawn clothes, procedural hair, live drawn faces.
// Hand props (torches, lanterns, buckets, seed sacks, the badge, a shovel) are welded on and shown per shot.
import * as THREE from "three";
import { createRig, createFace } from "blockrig";
import { hoodie, teamJacket, tee, jeans, shorts, cargo } from "./wardrobe";
import { hair, outlined, AT, type HairStyle } from "./props";
import { rng } from "../kit/rng";
import { avatarAmbient } from "../kit/lighting";
import type { AssetLibrary } from "../kit";
import type { RobloxCast, RobloxHair } from "./roblox";
import { fire, spray, type Fire } from "../world/fire";
import { kingdomMap } from "../world/boards";

export type Props = Partial<Record<"torch" | "lantern" | "bucket" | "sack" | "badge" | "shovel" | "seeds" | "scroll" | "map", THREE.Object3D>>;
export type Person = { rig: any; face: any; name: string; faceSets?: Record<string, THREE.Object3D[]>; props: Props; flame?: Fire; water?: ReturnType<typeof spray> };
type Look = { hair?: RobloxHair; extra?: RobloxHair[]; shirt?: HTMLImageElement; pants?: HTMLImageElement; faces?: Record<string, RobloxHair[]>; skin?: string };
export type Cast = { hero: Person; grandpa: Person; king: Person; guards: Person[]; villagers: Person[]; kids: Person[]; all: Person[] };

const skin = (c: string) => ({ HeadColor3: c, TorsoColor3: c, LeftArmColor3: c, RightArmColor3: c, LeftLegColor3: c, RightLegColor3: c });
const SKINS = ["#e0ac69", "#c68642", "#a5683f", "#8d5524", "#f1c27d", "#d19a66"];
const HAND = { rot: [1, 0, 0, 0, 0, -1, 0, 1, 0], pos: [0, -0.35, 0] }; // a flat prop (laptop) held in the fist
// a torch held flame-up: its stick runs along the hand's +Y (towards the wrist, so up while the arm hangs), gripped a
// quarter of the way up and held a little in front of the body (Roblox hands face -Z). The old grip turned the stick
// along +Z: the flame pointed backwards
const TORCH_GRIP = { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, 0.1, 0] }; // Tool.Grip: identity, held a little above its foot

function person(name: string, o: {
  skin: string; shirt: HTMLCanvasElement; pants: HTMLCanvasElement; shape?: string; scale?: object; hair?: THREE.Object3D; expression?: string; seed?: number; look?: Look;
}): Person {
  const rb = o.look, roblox = !!rb?.faces;
  const face = roblox ? null : createFace({ expression: o.expression ?? "neutral", blink: false, seed: o.seed ?? 1 });
  const rig = createRig({ shape: o.shape as any, scale: o.scale as any, bodyColors: skin(rb?.skin ?? o.skin), clothing: { shirt: rb?.shirt ?? o.shirt, pants: rb?.pants ?? o.pants }, ...(face ? { face } : {}), outline: 0.035, shadows: true } as any);
  if (rb?.hair) rig.addAccessory(rb.hair.mesh, { attachment: rb.hair.attachment, map: rb.hair.map, scale: rb.hair.scale, offset: rb.hair.offset });
  else if (o.hair && !(rb?.extra ?? []).length) rig.attachTo(o.hair, "HairAttachment"); // a crown or beard look goes without drawn hair
  // (plainWhite: the Cartoony Santa Beard's UVs land on the creator's doodles in its texture; Roblox shows it white.
  //  tint: a colour over the texture, e.g. the maroon fez worn as a black peci)
  for (const a of rb?.extra ?? []) if (a) { const x = a as any; rig.addAccessory(a.mesh, { attachment: a.attachment, map: x.plainWhite ? null : a.map, color: x.plainWhite ? 0xf4f1ea : x.tint ?? 0xffffff, scale: a.scale, offset: a.offset }); }
  let faceSets: Record<string, THREE.Object3D[]> | undefined;
  if (rb?.faces) {
    const made = new Map<RobloxHair, THREE.Object3D>();
    faceSets = Object.fromEntries(Object.entries(rb.faces).map(([emotion, items]) => [emotion, items.filter(Boolean).map((f) => {
      if (!made.has(f)) { const m = rig.addAccessory(f.mesh, { attachment: f.attachment, map: f.map, scale: f.scale, offset: f.offset }); m.visible = false; made.set(f, m); }
      return made.get(f)!;
    })]));
  }
  avatarAmbient(rig.object);
  return { rig, face, name, faceSets, props: {} };
}

// ---- hand props (story objects; the lantern, shovel and coin are downloaded models)
function torchStick() {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.4, 8), new THREE.MeshStandardMaterial({ color: "#5a3a1e", roughness: 0.9 })); stick.position.y = 0.6; g.add(outlined(stick, 0.02));
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.5, 8), new THREE.MeshStandardMaterial({ color: "#2b2118", roughness: 1 })); wrap.position.y = 1.85; g.add(outlined(wrap, 0.02));
  return g;
}
function bucket() {
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: "#8a5a2b", roughness: 0.8 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.9, 12, 1, true), wood); b.material.side = THREE.DoubleSide; g.add(outlined(b, 0.02));
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), wood); bottom.rotation.x = -Math.PI / 2; bottom.position.y = -0.44; g.add(bottom);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshStandardMaterial({ color: "#4aa3df", roughness: 0.1, metalness: 0.1 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.3; g.add(water);
  for (const y of [-0.25, 0.25]) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.5 - y * 0.12, 0.04, 6, 16), new THREE.MeshStandardMaterial({ color: "#3a3a3a", metalness: 0.6 })); band.rotation.x = Math.PI / 2; band.position.y = y; g.add(band); }
  return g;
}
function sack(colour = "#c8a26a") {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: colour, roughness: 1 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), m); body.scale.set(1, 1.15, 0.85); g.add(outlined(body, 0.02));
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.35, 10), m); neck.position.y = 0.9; g.add(neck);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: "#3f8f3a" })); leaf.scale.set(1, 0.4, 0.6); leaf.position.set(0, 0.25, 0.68); g.add(leaf);
  return g;
}

export function buildCast(rb: RobloxCast | null, lib: AssetLibrary): Cast {
  const F = (...names: string[]) => names.map((n) => rb?.faces[n]).filter(Boolean) as RobloxHair[];
  const boyFaces = () => ({ neutral: F("faceAnime"), happy: F("faceFang"), grin: F("faceFang"), laugh: F("faceFang"), smug: F("faceFang"), wink: F("faceFang"), sleepy: F("faceAnime"),
    embarrassed: F("facePotato"), determined: F("faceRanker"), angry: F("faceRanker"), furious: F("faceRanker"), shocked: F("facePotato"), scared: F("facePotato"), sad: F("faceCrying"), hurt: F("faceCrying") });
  const girlFaces = () => ({ neutral: F("faceSparkle"), happy: F("faceSmile"), grin: F("faceSmile"), laugh: F("faceSmile"), smug: F("faceHearts"), wink: F("faceHearts"), sleepy: F("faceSparkle"),
    embarrassed: F("faceHearts"), determined: F("faceSharpEyes"), angry: F("faceSharpEyes", "faceAngerVein"), furious: F("faceSharpEyes", "faceAngerVein"), shocked: F("faceChibi"), scared: F("faceChibi"), sad: F("faceCrying"), hurt: F("faceCrying") });
  const skinFor = (faces: Record<string, RobloxHair[]>, who: "boy" | "girl", fallback?: string) => faces.neutral?.find((f) => f.plate)?.plate ?? fallback ?? (who === "boy" ? "#f0cdb0" : "#fcf3f0");
  const look = (who: "boy" | "girl", o: { hair?: string; extra?: string[]; shirt?: string; pants?: string; skin?: string }): Look | undefined => {
    if (!rb) return undefined;
    const faces = who === "boy" ? boyFaces() : girlFaces();
    return { hair: o.hair ? rb.hair[o.hair] : undefined, extra: (o.extra ?? []).map((e) => rb.hair[e]), shirt: o.shirt ? rb.clothing[o.shirt] : undefined, pants: o.pants ? rb.clothing[o.pants] : undefined, faces, skin: skinFor(faces, who, o.skin) };
  };
  if (rb?.hair.grandpaBeard) (rb.hair.grandpaBeard as any).plainWhite = true;
  if (rb?.hair.kingPeci) (rb.hair.kingPeci as any).tint = 0x2a2a2a; // black velvet peci
  const kid = { shape: "child", scale: { head: 1.15 } };

  const hero = person("hero", { ...kid, skin: "#e0ac69", shirt: hoodie("#2f6f4f", "#ffffff", "♣"), pants: jeans("#2f4f7f", "#f2f2f2", "#7bd389"), hair: hair("messy", "#2a1d14", { seed: 4 }), expression: "happy", seed: 2,
    look: look("boy", { hair: "heroHair", shirt: "heroShirt", pants: "heroPants" }) });
  const grandpa = person("grandpa", { skin: "#c68642", shirt: tee("#8a6a3c", "", 3), pants: cargo("#4a3b2a", "#2a2a2a", "#8a6a3c"), hair: hair("buzz", "#e6e6e6", { seed: 11 }), expression: "happy", seed: 12,
    look: look("boy", { extra: ["grandpaBeard"], shirt: "grandpaShirt", pants: "grandpaPants" }) });
  // the King dresses like an Indonesian official: a black peci, the KORPRI civil-servant batik, black trousers; no beard
  const king = person("king", { shape: "buff", skin: "#d9a066", shirt: teamJacket("#1f4e8c", "#f0c419", "", "", 9), pants: jeans("#1b1b1f", "#111", "#1b1b1f"), hair: hair("slick", "#1a1a1a", { seed: 13 }), expression: "happy", seed: 14,
    look: look("boy", { extra: ["kingPeci"], shirt: "kingShirt", pants: "kingPants" }) });
  const guards = [0, 1, 2].map((i) => person(`guard${i}`, { shape: i === 1 ? "tall" : "buff", skin: SKINS[(i * 2) % SKINS.length], shirt: hoodie("#1d1d24", "#c9a227", "♛"), pants: cargo("#1d1d24", "#111", "#c9a227"), hair: hair("buzz", "#111", { seed: 20 + i }), expression: "smug", seed: 21 + i,
    look: look("boy", { hair: "guardHood", shirt: "guardShirt", pants: "guardPants", skin: SKINS[(i * 2) % SKINS.length] }) }));

  const r = rng(77), styles: HairStyle[] = ["swept", "bun", "afro", "slick", "buzz", "spiky"];
  const SHIRTS = ["farmerShirt", "peasantShirt", "grandpaShirt", "n2Shirt", "farmerShirt", "n0Shirt", "peasantShirt", "farmerShirt"];
  const PANTS = ["farmerPants", "grandpaPants", "farmerPants", "n2Pants", "n0Pants", "farmerPants", "grandpaPants", "n2Pants"];
  const villagers = Array.from({ length: 8 }, (_, i) => {
    const girl = i % 2 === 1, c = ["#e63946", "#3a86ff", "#f4a261", "#06d6a0", "#8338ec", "#ffbe0b"][Math.floor(r() * 6)];
    return person(`villager${i}`, {
      shape: ["classic", "slender", "buff", "classic", "tall", "slender", "classic", "buff"][i], skin: SKINS[Math.floor(r() * SKINS.length)],
      shirt: tee(c, ["☀", "♣", "♥", "~"][i % 4]), pants: r() < 0.6 ? jeans() : shorts("#6a4c93"), hair: hair(styles[i % styles.length], ["#1a1a1a", "#3b2414", "#8a5a2b"][i % 3], { seed: 40 + i }), seed: 41 + i,
      look: look(girl ? "girl" : "boy", { hair: [girl ? "n1Hair" : "n0Hair", girl ? "n3Hair" : "n2Hair"][(i >> 1) % 2], shirt: SHIRTS[i], pants: PANTS[i], skin: SKINS[i % SKINS.length] }),
    });
  });
  const kids = Array.from({ length: 4 }, (_, i) => {
    const girl = i % 2 === 1;
    return person(`kid${i}`, { ...kid, skin: SKINS[(i + 3) % SKINS.length], shirt: tee(["#ff7eb6", "#4cc9f0", "#ffd166", "#7bd389"][i], "★"), pants: shorts(["#1d3557", "#6a4c93"][i % 2]),
      hair: hair(girl ? "pigtails" : "messy", "#3b2414", { seed: 60 + i, tie: "#ffd166" }), seed: 61 + i,
      look: look(girl ? "girl" : "boy", { hair: girl ? (i === 1 ? "sisterHair" : "n3Hair") : (i === 0 ? "n0Hair" : "n2Hair"), shirt: girl ? (i === 1 ? "sisterShirt" : "n1Shirt") : (i === 0 ? "n0Shirt" : "n2Shirt"), pants: girl ? (i === 1 ? "sisterPants" : "n1Pants") : (i === 0 ? "n0Pants" : "n2Pants") }) });
  });

  // hand props, hidden until a shot shows them
  const weld = (p: Person, key: keyof Props, obj: THREE.Object3D, c0: any = HAND, part = "RightHand") => { obj.visible = false; p.rig.weld(obj, part, { c0 }); p.props[key] = obj; return obj; };
  for (const [i, g] of guards.entries()) {
    // held the Roblox way: Humanoid:EquipTool's grip (the torch is modelled +Y up), with the toolHold pose (performance.ts)
    const t = torchStick(); g.rig.equipTool(t, { grip: TORCH_GRIP }); t.visible = false; g.props.torch = t;
    const f = fire({ width: 0.7, height: 1.6, seed: 300 + i, smoke: false, light: 14 }); f.position.y = 2.0; t.add(f); g.flame = f;
  }
  weld(grandpa, "lantern", lib.model("lantern", { height: 1.6 }), { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, -1.6, 0] });
  for (const k of [hero, ...kids]) { weld(k, "bucket", bucket(), { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, -0.7, -0.3] }); k.water = spray(500 + k.name.length * 7); k.water.visible = false; }
  for (const k of [...kids]) weld(k, "lantern", lib.model("lantern", { height: 1.4 }), { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, -1.4, 0] }, "LeftHand");
  weld(king, "sack", sack(), { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, -0.9, -0.4] });
  for (const v of villagers.slice(0, 4)) weld(v, "shovel", lib.model("shovel", { height: 3.2 }), { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, -1.2, 0] });
  weld(villagers[1], "sack", sack("#b08a55"), { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, -0.9, -0.4] });
  weld(king, "shovel", lib.model("shovel", { height: 3.2 }), { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, -1.2, 0] }, "LeftHand");
  // the golden badge (a gold coin with the crown) the hero holds up
  const badge = lib.model("coin", { height: 1.6 }); badge.traverse((c: any) => { if (c.isMesh) { c.material = c.material.clone(); c.material.color.set("#ffd34d"); c.material.metalness = 0.8; c.material.roughness = 0.25; c.material.emissive?.set("#4a3200"); } });
  weld(hero, "badge", badge, { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, -0.75, -0.2] });
  // the King's map he takes from the secret room: rolled up while he runs, held open in the morning
  const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.2, 12), new THREE.MeshStandardMaterial({ color: "#e9d6a7", roughness: 0.9 }));
  weld(hero, "scroll", outlined(scroll, 0.02), { rot: [1, 0, 0, 0, 1, 0, 0, 0, 1], pos: [0, -0.5, -0.2] });
  const held = new THREE.Group(), sheet = kingdomMap(3.4, 2.2); sheet.rotation.y = Math.PI; held.add(sheet); // its face forward (-Z, the way he faces)
  weld(hero, "map", held, AT([0, 0.6, -1.4]), "UpperTorso");
  const guardBadge = lib.model("coin", { height: 0.6 }); guardBadge.traverse((c: any) => { if (c.isMesh) { c.material = c.material.clone(); c.material.color.set("#ffd34d"); c.material.metalness = 0.8; c.material.roughness = 0.25; } });
  guards[0].rig.weld(guardBadge, "UpperTorso", { c0: AT([0.45, 0.35, -0.55]) }); guards[0].props.badge = guardBadge; // the badge on his chest that he will lose

  const all = [hero, grandpa, king, ...guards, ...villagers, ...kids];
  return { hero, grandpa, king, guards, villagers, kids, all };
}
