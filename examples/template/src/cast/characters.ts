// The cast (docs/visuals.md "Cast"), built with BlockRig's avatar mode: BodyColors, drawn Shirt/Pants
// templates, hair and accessories on Roblox attachments, live drawn faces. All original.
import * as THREE from "three";
import { createRig, createFace } from "blockrig";
import { hoodie, tee, jeans, shorts } from "./wardrobe";
import { hair, baseballCap, glasses, outlined, AT, type HairStyle } from "./props";
import { rng } from "../kit/rng";
import type { RobloxCast, RobloxHead, RobloxHair } from "./roblox";

export type Person = { rig: any; face: any; name: string; dynamic?: boolean; faceSets?: Record<string, THREE.Object3D[]> };
/** Roblox catalog items for one character (local videos only): a dynamic head, hair, classic shirt and pants. */
export type RobloxLook = { head?: RobloxHead; hair?: RobloxHair; shirt?: HTMLImageElement; pants?: HTMLImageElement; faces?: Record<string, RobloxHair[]>; skin?: string };
export type Cast = { hero: Person; sister: Person; neighbours: Person[]; all: Person[] };

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
    if (rb.hair) rig.addAccessory(rb.hair.mesh, { attachment: rb.hair.attachment, map: rb.hair.map });
    else if (o.hair) rig.attachTo(o.hair, "HairAttachment");
    if (o.back) rig.attachTo(o.back, "BodyBackAttachment", AT([0, 0, -0.32]));
    // face accessories (one set per emotion, e.g. angry = sharp eyes + anger vein): all attached, shown per shot by act()
    let faceSets: Record<string, THREE.Object3D[]> | undefined;
    if (rb.faces && !rb.head) {
      const made = new Map<RobloxHair, THREE.Object3D>();
      faceSets = Object.fromEntries(Object.entries(rb.faces).map(([emotion, items]) => [emotion, items.filter(Boolean).map((f) => {
        if (!made.has(f)) { const m = rig.addAccessory(f.mesh, { attachment: f.attachment, map: f.map }); m.visible = false; made.set(f, m); }
        return made.get(f)!;
      })]));
    }
    return { rig, face: null, name, dynamic: !!rb.head, faceSets };
  }
  const face = createFace({ expression: o.expression ?? "neutral", blink: false, seed: o.seed ?? 1 });
  const rig = createRig({ shape: o.shape as any, scale: o.scale as any, bodyColors: skin(o.skin), clothing: { shirt: o.shirt, pants: o.pants }, face, outline: 0.035, shadows: true });
  if (o.hair) rig.attachTo(o.hair, "HairAttachment");
  if (o.hat) rig.attachTo(o.hat, "HatAttachment");
  if (o.face) rig.attachTo(o.face, "FaceFrontAttachment", AT([0, -0.1, 0]));
  if (o.back) rig.attachTo(o.back, "BodyBackAttachment", AT([0, 0, -0.32]));
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

export function buildCast(rb: RobloxCast | null = null): Cast {
  // Roblox items (local --roblox renders): anime face accessories per emotion, anime hair, classic clothing
  const F = (...names: string[]) => names.map((n) => rb?.faces[n]).filter(Boolean) as RobloxHair[];
  const boyFaces = () => ({ neutral: F("faceAnime"), happy: F("faceFang"), grin: F("faceFang"), laugh: F("faceFang"), smug: F("faceFang"), wink: F("faceFang"),
    embarrassed: F("faceAnime"), determined: F("faceRanker"), angry: F("faceRanker"), furious: F("faceRanker"), shocked: F("facePotato"), scared: F("facePotato"), sad: F("faceCrying"), hurt: F("faceCrying") });
  const girlFaces = () => ({ neutral: F("faceSparkle"), happy: F("faceSmile"), grin: F("faceSmile"), laugh: F("faceSmile"), smug: F("faceHearts"), wink: F("faceHearts"),
    embarrassed: F("faceHearts"), determined: F("faceSharpEyes"), angry: F("faceSharpEyes", "faceAngerVein"), furious: F("faceSharpEyes", "faceAngerVein"), shocked: F("faceChibi"), scared: F("faceChibi"), sad: F("faceCrying"), hurt: F("faceCrying") });
  const look = (who: "boy" | "girl", hair: string, shirt: string, pants: string): RobloxLook | undefined =>
    rb ? { hair: rb.hair[hair], shirt: rb.clothing[shirt], pants: rb.clothing[pants], faces: who === "boy" ? boyFaces() : girlFaces(), skin: who === "boy" ? "#d9a877" : "#f4ece6" } : undefined;
  const kid = { shape: "child", scale: { head: 1.15 } };
  const hero = person("hero", { ...kid, skin: "#f1c27d", shirt: hoodie("#1fa392", "#ffffff", "{ }"), pants: jeans("#2f4f7f", "#f2f2f2", "#19e3c4"), hair: hair("messy", "#5a3a22", { seed: 4 }), expression: "happy", seed: 2, roblox: look("boy", "heroHair", "heroShirt", "heroPants") });
  const sister = person("sister", { ...kid, shape: "child", skin: "#f5d0b5", shirt: tee("#ff7eb6", "★"), pants: shorts("#6a4c93"), hair: hair("pigtails", "#3b2414", { tie: "#ffd166", seed: 7 }), expression: "angry", seed: 8, roblox: look("girl", "sisterHair", "sisterShirt", "sisterPants") });
  const r = rng(99), styles: HairStyle[] = ["swept", "bun", "afro", "slick", "buzz", "spiky"];
  const neighbours = Array.from({ length: 4 }, (_, i) => {
    const c = ["#e63946", "#3a86ff", "#f4a261", "#06d6a0", "#8338ec"][Math.floor(r() * 5)], k = r();
    return person(`neighbour${i}`, {
      skin: SKINS[Math.floor(r() * SKINS.length)], shape: ["classic", "slender", "buff", "tall"][i % 4],
      shirt: k < 0.5 ? tee(c, ["☺", "♥", "#1", "~"][i % 4]) : hoodie(c, "#ffffff", ["~/", "#", "{}", "$"][i % 4]), pants: r() < 0.6 ? jeans() : shorts(["#023047", "#6a040f"][i % 2]),
      hair: hair(styles[Math.floor(r() * styles.length)], ["#1a1a1a", "#3b2414", "#8a5a2b", "#d9b26f", "#b33c2a"][Math.floor(r() * 5)], { seed: 50 + i }),
      hat: i === 1 ? baseballCap("#ffb703") : undefined, face: i === 2 ? glasses() : undefined, expression: "neutral", seed: 60 + i,
      roblox: look(i % 2 ? "girl" : "boy", `n${i}Hair`, `n${i}Shirt`, `n${i}Pants`),
    });
  });
  return { hero, sister, neighbours, all: [hero, sister, ...neighbours] };
}
