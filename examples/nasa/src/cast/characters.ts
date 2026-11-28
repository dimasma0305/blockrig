// The cast (docs/visuals.md "Cast"), built with BlockRig's avatar mode: BodyColors, drawn Shirt/Pants
// templates, hair and accessories on Roblox attachments, live drawn faces. All original.
import * as THREE from "three";
import { createRig, createFace } from "blockrig";
import { hoodie, tee, jeans, shorts } from "./wardrobe";
import { hair, outlined, AT, type HairStyle } from "./props";
import { partyHat } from "../world/storyProps";
import { rng } from "../kit/rng";
import { avatarAmbient } from "../kit/lighting";
import type { RobloxCast, RobloxHead, RobloxHair } from "./roblox";

export type Person = { rig: any; face: any; name: string; dynamic?: boolean; faceSets?: Record<string, THREE.Object3D[]> };
/** Roblox catalog items for one character (local videos only): a dynamic head, hair, classic shirt and pants. */
export type RobloxLook = { head?: RobloxHead; hair?: RobloxHair; shirt?: HTMLImageElement; pants?: HTMLImageElement; faces?: Record<string, RobloxHair[]>; skin?: string };
export type Cast = { hero: Person; baby: Person; pj: Person; mom: Person; dad: Person; friend: Person; tm1: Person; tm2: Person; kids: Person[]; all: Person[];
  headsets: THREE.Object3D[]; hat: THREE.Object3D };

const skin = (c: string) => ({ HeadColor3: c, TorsoColor3: c, LeftArmColor3: c, RightArmColor3: c, LeftLegColor3: c, RightLegColor3: c });
const SKINS = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac", "#f5d0b5", "#a5683f", "#6b4226"];

export function person(name: string, o: {
  skin: string; shirt: HTMLCanvasElement; pants: HTMLCanvasElement; shape?: string; scale?: object;
  hair?: THREE.Object3D; hat?: THREE.Object3D; face?: THREE.Object3D; back?: THREE.Object3D; expression?: string; seed?: number; roblox?: RobloxLook;
}): Person {
  const rb = o.roblox;
  if (rb) {
    // Roblox items: dynamic head (expressions through FaceControls), catalog hair, classic shirt and pants
    const rig = createRig({ shape: o.shape as any, scale: o.scale as any, bodyColors: skin(rb.skin ?? o.skin), clothing: { shirt: rb.shirt ?? o.shirt, pants: rb.pants ?? o.pants },
      bodyParts: rb.head ? { Head: { mesh: rb.head.mesh, size: rb.head.size, attachments: rb.head.attachments, map: rb.head.map ?? undefined } } : undefined, outline: 0.035, shadows: true } as any);
    if (rb.hair) rig.addAccessory(rb.hair.mesh, { attachment: rb.hair.attachment, map: rb.hair.map, scale: rb.hair.scale, offset: rb.hair.offset });
    else if (o.hair) rig.attachTo(o.hair, "HairAttachment");
    if (o.back) rig.attachTo(o.back, "BodyBackAttachment", AT([0, 0, -0.32]));
    // face accessories (one set per emotion, e.g. angry = sharp eyes + anger vein): all attached, shown per shot by act()
    let faceSets: Record<string, THREE.Object3D[]> | undefined;
    if (rb.faces && !rb.head) {
      const made = new Map<RobloxHair, THREE.Object3D>();
      faceSets = Object.fromEntries(Object.entries(rb.faces).map(([emotion, items]) => [emotion, items.filter(Boolean).map((f) => {
        // (a face decal's white plate is made transparent when it loads: src/cast/roblox.ts faceTexture)
        if (!made.has(f)) { const m = rig.addAccessory(f.mesh, { attachment: f.attachment, map: f.map, scale: f.scale, offset: f.offset }); m.visible = false; made.set(f, m); }
        return made.get(f)!;
      })]));
    }
    avatarAmbient(rig.object);
    return { rig, face: null, name, dynamic: !!rb.head, faceSets };
  }
  const face = createFace({ expression: o.expression ?? "neutral", blink: false, seed: o.seed ?? 1 });
  const rig = createRig({ shape: o.shape as any, scale: o.scale as any, bodyColors: skin(o.skin), clothing: { shirt: o.shirt, pants: o.pants }, face, outline: 0.035, shadows: true });
  if (o.hair) rig.attachTo(o.hair, "HairAttachment");
  if (o.hat) rig.attachTo(o.hat, "HatAttachment");
  if (o.face) rig.attachTo(o.face, "FaceFrontAttachment", AT([0, -0.1, 0]));
  if (o.back) rig.attachTo(o.back, "BodyBackAttachment", AT([0, 0, -0.32]));
  avatarAmbient(rig.object);
  return { rig, face, name };
}

/** A plate with cookie crumbs (s02), held flat. */
export function plate() {
  const g = new THREE.Group();
  g.add(outlined(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.1, 20), new THREE.MeshStandardMaterial({ color: "#f4f4f4", roughness: 0.4 })), 0.015));
  const crumb = new THREE.MeshStandardMaterial({ color: "#b07a3a", roughness: 0.9 }), r = rng(4);
  for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1), crumb); c.position.set((r() - 0.5) * 0.8, 0.08, (r() - 0.5) * 0.8); g.add(c); }
  return g;
}

/** Roblox hair in the manifest, by who usually wears it: casts pick from these, the Sandbox can try any of them. */
export const HAIR = { boy: ["heroHair", "n0Hair", "n2Hair", "h4Hair", "h5Hair", "h6Hair", "h7Hair"], girl: ["sisterHair", "n1Hair", "n3Hair", "g5Hair", "g6Hair"] };

export function buildCast(rb: RobloxCast | null = null): Cast {
  // Roblox items (the default once downloaded): anime face accessories per emotion, anime hair, classic clothing
  const F = (...names: string[]) => names.map((n) => rb?.faces[n]).filter(Boolean) as RobloxHair[];
  const or = (...names: string[]) => { const f = names.map((n) => rb?.faces[n]).find(Boolean); return f ? [f] : []; };
  const boyFaces = () => ({ neutral: F("faceAnime"), happy: F("faceFang"), grin: F("faceFang"), laugh: or("faceLaugh", "faceFang"), smug: F("faceFang"), wink: F("faceFang"),
    embarrassed: [...F("faceAnime"), ...F("faceBlush")], determined: F("faceRanker"), angry: F("faceRanker"), furious: [...F("faceRanker"), ...F("faceAngerVein")], shocked: F("facePotato"), scared: F("facePotato"),
    sad: F("faceCrying"), hurt: F("faceCrying"), sleepy: or("faceSleepy", "faceAnime"), dazed: or("faceDizzy", "facePotato") });
  const girlFaces = () => ({ neutral: F("faceSparkle"), happy: F("faceSmile"), grin: F("faceSmile"), laugh: or("faceLaugh", "faceSmile"), smug: F("faceHearts"), wink: F("faceHearts"),
    embarrassed: [...F("faceHearts"), ...F("faceBlush")], determined: F("faceSharpEyes"), angry: F("faceSharpEyes", "faceAngerVein"), furious: F("faceSharpEyes", "faceAngerVein"), shocked: F("faceChibi"), scared: F("faceChibi"),
    sad: F("faceCrying"), hurt: F("faceCrying"), sleepy: or("faceSleepy", "faceSparkle"), dazed: or("faceDizzy", "faceChibi") });
  const skinFor = (faces: Record<string, RobloxHair[]>, who: "boy" | "girl") => faces.neutral?.find((f) => f.plate)?.plate ?? (who === "boy" ? "#f0cdb0" : "#fcf3f0");
  const look = (who: "boy" | "girl", hair: string, shirt: string | null, pants: string | null): RobloxLook | undefined =>
    rb ? (() => { const faces = who === "boy" ? boyFaces() : girlFaces(); return { hair: rb.hair[hair], shirt: shirt ? rb.clothing[shirt] : undefined, pants: pants ? rb.clothing[pants] : undefined, faces, skin: skinFor(faces, who) }; })() : undefined;
  const kid = { shape: "child", scale: { head: 1.15 } };
  // me: the same face, hair and skin at every age (scaled per shot by performance.ts); the baby wears a onesie-like
  // tee and shorts, and at five dinosaur pyjamas (drawn: no free Roblox dinosaur pyjamas)
  const hero = person("hero", { ...kid, skin: "#f1c27d", shirt: hoodie("#1fa392", "#ffffff", "{ }"), pants: jeans("#2f4f7f", "#f2f2f2", "#19e3c4"), hair: hair("messy", "#5a3a22", { seed: 4 }), seed: 2, roblox: look("boy", "heroHair", "heroShirt", "heroPants") });
  const baby = person("baby", { ...kid, skin: "#f1c27d", shirt: tee("#1fa392", "~"), pants: shorts("#2f4f7f"), hair: hair("messy", "#5a3a22", { seed: 4 }), seed: 2, roblox: look("boy", "heroHair", "babyShirt", "babyPants") });
  const pj = person("pj", { ...kid, skin: "#f1c27d", shirt: tee("#57b85a", "🦖"), pants: shorts("#3f8f45"), hair: hair("messy", "#5a3a22", { seed: 4 }), seed: 2, roblox: look("boy", "heroHair", null, null) });
  const mom = person("mom", { shape: "slender", skin: "#f5d0b5", shirt: tee("#e5989b", "♥"), pants: jeans(), hair: hair("bun", "#3b2414", { seed: 7 }), seed: 8, roblox: look("girl", "n3Hair", "momShirt", "momPants") });
  const dad = person("dad", { shape: "classic", skin: "#f1c27d", shirt: tee("#3a86ff", "#"), pants: jeans(), hair: hair("slick", "#3b2414", { seed: 9 }), seed: 9, roblox: look("boy", "dadHair", "dadShirt", "dadPants") });
  const friend = person("friend", { ...kid, skin: "#f5d0b5", shirt: hoodie("#6b2fb3", "#ffffff", "kf"), pants: jeans(), hair: hair("spiky", "#1a1a1a", { seed: 5 }), seed: 5, roblox: look("boy", "n0Hair", "n0Shirt", "n0Pants") });
  const tm1 = person("tm1", { ...kid, skin: "#e0ac69", shirt: tee("#06d6a0", "1"), pants: shorts("#023047"), hair: hair("swept", "#8a5a2b", { seed: 12 }), seed: 12, roblox: look("boy", "h5Hair", "kidShirt", "babyPants") });
  const tm2 = person("tm2", { ...kid, skin: "#ffdbac", shirt: tee("#ff7eb6", "2"), pants: shorts("#6a4c93"), hair: hair("pigtails", "#1a1a1a", { seed: 13 }), seed: 13, roblox: look("girl", "g5Hair", "kidShirt2", "n1Pants") });
  const kids = [person("kidA", { ...kid, skin: "#c68642", shirt: tee("#ffb703", "★"), pants: shorts("#023047"), hair: hair("afro", "#1a1a1a", { seed: 20 }), seed: 20, roblox: look("boy", "n2Hair", "n2Shirt", "n2Pants") }),
    person("kidB", { ...kid, skin: "#ffdbac", shirt: tee("#8338ec", "☺"), pants: shorts("#6a040f"), hair: hair("pigtails", "#d9b26f", { seed: 21 }), seed: 21, roblox: look("girl", "n1Hair", "n1Shirt", "n1Pants") })];
  // the gaming headsets (preschool) and the birthday hat: worn on attachments, shown per shot
  const headsets: THREE.Object3D[] = [];
  for (const q of [hero, friend, tm1, tm2]) {
    const hs = rb?.hair.headset;
    if (hs) { const m = q.rig.addAccessory(hs.mesh, { attachment: hs.attachment, map: hs.map, scale: hs.scale, offset: hs.offset }); m.visible = false; m.userData.owner = q.name; headsets.push(m); }
  }
  const hat = partyHat(); hero.rig.attachTo(hat, "HatAttachment", AT([0, -0.15, 0])); hat.visible = false;
  return { hero, baby, pj, mom, dad, friend, tm1, tm2, kids, headsets, hat, all: [hero, baby, pj, mom, dad, friend, tm1, tm2, ...kids] };
}
