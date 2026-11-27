// The cast, all original, built with BlockRig's avatar mode: BodyColors + drawn Shirt/Pants templates, layered
// hair and props welded on by attachments, live drawn faces, and a floating rank tag over every head.
import * as THREE from "three";
import { createRig, createFace } from "blockrig";
import { hoodie, teamJacket, chefJacket, uniformShirt, tee, cargo, jeans, shorts } from "./wardrobe";
import { hair, baseballCap, chefHat, headphones, visor, glasses, laptop, rankTag, outlined, AT, type HairStyle } from "./props";
import { rng } from "../kit/rng";

export type Person = { rig: any; face: any; tag: THREE.Sprite; laptop?: THREE.Object3D; name: string };
export type Cast = { hero: Person; baker: Person; kids: Person[]; pros: Person[]; crowd: Person[]; all: Person[] };

const skin = (c: string) => ({ HeadColor3: c, TorsoColor3: c, LeftArmColor3: c, RightArmColor3: c, LeftLegColor3: c, RightLegColor3: c });
const SKINS = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac", "#f5d0b5", "#a5683f", "#6b4226"];

function person(name: string, o: {
  skin: string; shirt: HTMLCanvasElement; pants: HTMLCanvasElement; shape?: string; scale?: object; hair?: THREE.Object3D;
  hat?: THREE.Object3D; face?: THREE.Object3D; neck?: THREE.Object3D; back?: THREE.Object3D; rank: string; rankColour?: string; expression?: string; seed?: number;
}): Person {
  const face = createFace({ expression: o.expression ?? "neutral", blink: false, seed: o.seed ?? 1 });
  const rig = createRig({ shape: o.shape as any, scale: o.scale as any, bodyColors: skin(o.skin), clothing: { shirt: o.shirt, pants: o.pants }, face, outline: 0.035, shadows: true });
  if (o.hair) rig.attachTo(o.hair, "HairAttachment");
  if (o.hat) rig.attachTo(o.hat, "HatAttachment");
  if (o.face) rig.attachTo(o.face, "FaceFrontAttachment", AT([0, -0.1, 0]));
  if (o.neck) rig.attachTo(o.neck, "HairAttachment");
  if (o.back) rig.attachTo(o.back, "BodyBackAttachment", AT([0, 0, -0.32]));
  const tag = rankTag(o.rank, o.rankColour);
  rig.weld(tag, "Head", { c0: AT([0, 1.75, 0]) });
  return { rig, face, tag, name };
}
function backpack(colour: string) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.75 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 0.55), m); g.add(outlined(b));
  const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.2), new THREE.MeshStandardMaterial({ color: "#222", roughness: 0.8 })); p.position.set(0, -0.3, 0.35); g.add(outlined(p));
  return g;
}
function moustache() { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: "#2b1a10" })); m.position.set(0, -0.32, -0.04); return outlined(m, 0.015); }
const SCREEN = ["$ nmap -sV vault.final", "PORT   STATE SERVICE", "443/tcp open  https", "$ ./exploit --0day", "[*] sending payload...", "[-] blocked by firewall", "$ john --wordlist=rt"];

export function buildCast(): Cast {
  const hero = person("hero", {
    skin: "#f1c27d", shirt: hoodie("#2b2f3a", "#19e3c4", "{ }"), pants: cargo("#4a4f5c", "#f2f2f2", "#19e3c4"),
    hair: hair("messy", "#2a1d14", { streak: "#19e3c4", seed: 4 }), hat: headphones("#19e3c4", "#19e3c4"),
    rank: "#8,000,000,000", rankColour: "#ff4d5e", expression: "neutral", seed: 2,
  });
  const baker = person("baker", {
    skin: "#8d5524", shape: "buff", shirt: chefJacket(), pants: jeans("#33363d", "#2a2a2a", "#ffd166"),
    hat: chefHat(), face: moustache(), rank: "#4,021", rankColour: "#ffd166", expression: "happy", seed: 5,
  });
  const kids = [
    person("kid1", { skin: "#ffdbac", shape: "child", scale: { head: 1.15 }, shirt: uniformShirt("#e63946"), pants: shorts("#1d3557"), hair: hair("pigtails", "#6b3a1e", { tie: "#ff4d8d", seed: 7 }), back: backpack("#ff7eb6"), rank: "#77", rankColour: "#7bff8a", expression: "grin", seed: 8 }),
    person("kid2", { skin: "#c68642", shape: "child", scale: { head: 1.15 }, shirt: uniformShirt("#2a9d8f"), pants: shorts("#1d3557"), hair: hair("buzz", "#1a1a1a"), hat: baseballCap("#ffb703"), back: backpack("#4cc9f0"), rank: "#78", rankColour: "#7bff8a", expression: "grin", seed: 9 }),
  ];
  const proHair: [HairStyle, string][] = [["spiky", "#f72585"], ["slick", "#e9ecef"], ["swept", "#7209b7"], ["bun", "#111111"]];
  const pros = proHair.map(([style, colour], i) => {
    const p = person(`pro${i}`, {
      skin: SKINS[(i * 3 + 1) % SKINS.length], shape: i % 2 ? "slender" : "tall", shirt: teamJacket("#15151c", "#ff2e88", String(i + 1).padStart(2, "0")), pants: cargo("#1e1e26", "#111", "#ff2e88"),
      hair: hair(style, colour, { seed: 20 + i, streak: i === 2 ? "#ff2e88" : undefined }), face: visor("#ff2e88"), rank: `#${i + 1}`, rankColour: "#ffd60a", expression: "determined", seed: 30 + i,
    });
    p.laptop = laptop(SCREEN, "#ff2e88", "#1d1f26");
    p.rig.weld(p.laptop, "RightHand", { c0: { rot: [1, 0, 0, 0, 0, -1, 0, 1, 0], pos: [0, -0.45, 0.15] } });
    return p;
  });
  const r = rng(99), crowd: Person[] = [];
  const shirts = () => { const c = ["#e63946", "#2a9d8f", "#f4a261", "#8338ec", "#3a86ff", "#fb5607", "#06d6a0", "#ffbe0b"][Math.floor(r() * 8)]; const k = r(); return k < 0.4 ? tee(c, ["0x41", "pwn", "root", "GG", "</>", "nop"][Math.floor(r() * 6)]) : k < 0.75 ? hoodie(c, "#ffffff", ["#", "$_", "~/"][Math.floor(r() * 3)]) : teamJacket(c, "#ffffff", String(10 + Math.floor(r() * 89)), "TEAM"); };
  const pants = () => { const k = r(); return k < 0.45 ? jeans() : k < 0.8 ? cargo(["#3d405b", "#264653", "#5f0f40"][Math.floor(r() * 3)]) : shorts(["#023047", "#6a040f"][Math.floor(r() * 2)]); };
  const styles: HairStyle[] = ["messy", "swept", "spiky", "bun", "afro", "slick", "pigtails", "buzz"];
  const hairCols = ["#1a1a1a", "#3b2414", "#8a5a2b", "#d9b26f", "#b33c2a", "#5a189a", "#00b4d8", "#e5e5e5"];
  for (let i = 0; i < 12; i++) {
    const k = r();
    crowd.push(person(`crowd${i}`, {
      skin: SKINS[Math.floor(r() * SKINS.length)], shape: ["classic", "slender", "classic", "buff", "tall"][Math.floor(r() * 5)], shirt: shirts(), pants: pants(),
      hair: hair(styles[Math.floor(r() * styles.length)], hairCols[Math.floor(r() * hairCols.length)], { seed: 50 + i, streak: r() < 0.25 ? "#19e3c4" : undefined }),
      face: k < 0.3 ? glasses() : undefined, hat: k > 0.8 ? headphones(["#ff2e88", "#19e3c4", "#ffd166"][i % 3], "#ffffff") : undefined,
      rank: `#${(Math.floor(r() * 9_000_000) + 1000).toLocaleString("en-US")}`, rankColour: "#19e3c4", expression: "neutral", seed: 60 + i,
    }));
  }
  // the hero's hands find the terminal keyboard by IK (enabled in the typing shots)
  for (const [root, hand] of [["LeftUpperArm", "LeftHand"], ["RightUpperArm", "RightHand"]]) hero.rig.addIKControl({ type: "Position", chainRoot: root, endEffector: hand, target: new THREE.Vector3(), enabled: false, pole: () => hero.rig.object.localToWorld(new THREE.Vector3(root.startsWith("Left") ? 3 : -3, -2, -1)) });
  // everyone in the street gets a laptop for the last shot (view-source, green screens)
  crowd.forEach((c, i) => {
    c.laptop = laptop(["$ view-source:bakery.ctf", "<!-- flag{...} -->", "$ view-source:school.ctf", "<!-- flag{...} -->"], "#39ff88", ["#2a2d34", "#3b2f4a", "#24343b"][i % 3]);
    c.rig.weld(c.laptop, "RightHand", { c0: { rot: [1, 0, 0, 0, 0, -1, 0, 1, 0], pos: [0.3, -0.35, -0.3] } });
  });
  const all = [hero, baker, ...kids, ...pros, ...crowd];
  return { hero, baker, kids, pros, crowd, all };
}
