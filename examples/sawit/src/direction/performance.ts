// What every character does in every shot (docs/story.md "action"): where they stand, which clips play, their
// face, which props and fires are on. A pure function of (shot, local time): call it every frame.
import * as THREE from "three";
import { poseAt, groundRig, FEET, ON_SEAT, type Layer } from "../kit/pose";
import { easeInOut, type Shot } from "../kit";
import * as C from "../cast/clips";
import { clips as RB } from "blockrig";
// anyone holding a torch plays Roblox's tool pose on top (right arm forward, so the equipped torch stands upright)
const HOLD = { clip: RB.toolHold };
import type { Cast, Person } from "../cast/characters";
import { LOCATIONS, type World } from "../world/World";

const PI = Math.PI, V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export function place(p: Person, x: number, z: number, rotY: number, y = 0) { p.rig.object.visible = true; p.rig.object.position.set(x, y, z); p.rig.object.rotation.set(0, rotY, 0); }
const placeAt = (p: Person, v: THREE.Vector3, rotY: number) => place(p, v.x, v.z, rotY, v.y);
/** Pose a person from clip layers at local time t, set the face, and stand them on the ground (or seat them). */
export function act(p: Person, layers: Layer[], t: number, face: string | undefined, ground = 0, contacts = FEET) {
  poseAt(p.rig, layers, t);
  if (p.faceSets) { const show = new Set(p.faceSets[face ?? "neutral"] ?? p.faceSets.neutral ?? []); for (const set of Object.values(p.faceSets)) for (const o of set) o.visible = show.has(o); }
  else p.rig.updateFace();
  groundRig(p.rig, ground, contacts);
}
const faceOf = (shot: Shot, who: string, fallback = "neutral") => shot.faces?.[who] ?? fallback;
export const facing = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
const walkTo = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k);

export type Perform = { fire: Record<string, number>; smoke: Record<string, number>; birds?: boolean };

export function perform(shot: Shot, local: number, p: number, cast: Cast, world: World): Perform {
  const { hero, grandpa, king, guards, villagers, kids } = cast;
  for (const q of cast.all) { q.rig.object.visible = false; for (const k of Object.values(q.props)) if (k) k.visible = false; if (q.water) q.water.visible = false; }
  // guard 0 loses his badge by the first tree in s15 (it lies in the grass); from then on his chest is bare
  const lost = shot.idx > 14 || (shot.id === "s15" && p > 0.55);
  if (guards[0].props.badge) guards[0].props.badge.visible = !lost;
  world.droppedBadge.visible = shot.id === "s15" && lost;
  const out: Perform = { fire: {}, smoke: {} };
  const VIL = LOCATIONS.village, FOR = LOCATIONS.forest, ROOM = LOCATIONS.room, t = local;
  const prop = (q: Person, k: keyof Person["props"]) => { const o = q.props[k]; if (o) o.visible = true; };
  // world state that changes with the story
  world.victimTrees.visible = shot.id === "s03"; world.victimPalms.visible = shot.id !== "s03"; world.vicBurnt.visible = shot.id !== "s03";
  world.charred.visible = shot.idx >= 28; world.seedlings.visible = shot.id === "s01" || shot.id === "s02"; world.saplings.visible = shot.id === "s36";
  world.hinge.rotation.y = 0; world.theMap.set(1, 0);
  world.swing.visible = shot.id === "s02"; // it stands near the square: only in its own shot
  const edge = (i: number) => FOR.clone().add(V3(-6, 0, -30 + i * 7)); // where people stand looking at the forest edge, from the sawit side

  switch (shot.id) {
    case "s01": { // villagers plant seedlings in the field; the hero waves from the road
      out.birds = true;
      villagers.slice(0, 6).forEach((v, i) => {
        const at = world.FIELD.clone().add(V3(-20 + (i % 3) * 16, 0, -6 + Math.floor(i / 3) * 16));
        place(v, at.x, at.z, i % 2 ? PI / 2 : -PI / 2); prop(v, "shovel");
        act(v, [{ clip: C.crowdIdle, at: -i * 0.4 }, { clip: C.point, weight: 0.35 + 0.35 * Math.abs(Math.sin(t * 2.4 + i)) }], t, "happy");
      });
      place(hero, VIL.x + 3, VIL.z - 92, PI); act(hero, [{ clip: C.cheer }], t, faceOf(shot, "hero"));
      break;
    }
    case "s02": { // kids by the lone swing among the palms
      world.swingSeat.rotation.x = Math.sin(t * 1.6) * 0.25;
      const s = world.swing.position, side = V3(Math.cos(world.school.yaw), 0, -Math.sin(world.school.yaw));
      [hero, kids[0], kids[1]].forEach((k, i) => { const at = s.clone().addScaledVector(side, -3 + i * 3).add(V3(0, 0, 0)).addScaledVector(V3(Math.sin(world.school.yaw), 0, Math.cos(world.school.yaw)), 5); placeAt(k, at, world.school.yaw + PI); act(k, [{ clip: i === 1 ? C.slump : C.idle }], t, i === 0 ? faceOf(shot, "hero") : "sad"); });
      break;
    }
    case "s03": out.fire.victim = clamp01(0.2 + p * 1.2); out.smoke.vicSmoke = 1; break;
    case "s04": { // morning: sawit rows where the forest was; villagers stare
      out.smoke.vicSmoke = 0.6;
      villagers.slice(2, 6).forEach((v, i) => { const at = world.VIC.clone().add(V3(-20 + i * 6, 0, -104)); place(v, at.x, at.z, 0); act(v, [{ clip: C.gasp, at: -i * 0.2 }], t, "shocked"); });
      break;
    }
    case "s05": { // villagers bow to the golden statue
      villagers.forEach((v, i) => { const a = -0.9 + i * 0.26, at = VIL.clone().add(V3(Math.sin(a) * 17, 0, Math.cos(a) * 17)); place(v, at.x, at.z, facing(at, VIL)); act(v, [{ clip: C.slump, at: -i * 0.15 }], t, "neutral"); });
      break;
    }
    case "s06": { // the King waves from the castle wall; the crowd cheers below
      placeAt(king, world.balcony, PI); act(king, [{ clip: C.cheer }], t, faceOf(shot, "king"), world.balcony.y);
      [...villagers, ...kids].forEach((v, i) => { const at = world.gate.clone().add(V3(-16 + (i % 6) * 6.5, 0, -18 - Math.floor(i / 6) * 6)); place(v, at.x, at.z, 0); act(v, [{ clip: C.cheer, at: -i * 0.13 }], t, "happy"); });
      break;
    }
    case "s07": { // the King hands a seed sack to a family on the square
      const kAt = VIL.clone().add(V3(8, 0, 20)); place(king, kAt.x, kAt.z, -PI / 2); prop(king, "sack"); act(king, [{ clip: C.handOver }], t, faceOf(shot, "king"));
      [villagers[0], villagers[1], kids[0]].forEach((v, i) => { const at = kAt.clone().add(V3(-4.5, 0, -2.5 + i * 2.6)); place(v, at.x, at.z, PI / 2); act(v, [{ clip: C.cheer, at: -i * 0.2 }], t, "happy"); });
      break;
    }
    case "s08": { // hero and Grandpa walk the forest path; birds over the canopy
      out.birds = true;
      const z = FOR.z - 8, x = FOR.x + 24 + p * 26;
      place(hero, x + 1, z + 2, PI / 2); act(hero, [{ clip: C.walk }], t, faceOf(shot, "hero"));
      place(grandpa, x, z - 2, PI / 2); act(grandpa, [{ clip: C.walk, speed: 0.85 }], t, faceOf(shot, "grandpa"));
      break;
    }
    case "s09": case "s10": { // Grandpa on his stump at the edge, lantern lit; in s10 he nods off
      const s = world.stumpPos; place(grandpa, s.x, s.z, -PI / 2);
      act(grandpa, [{ clip: C.sit }, ...(shot.id === "s10" ? [{ clip: C.slump, at: 0.6, fade: 0.8 }] : [])], t, faceOf(shot, "grandpa"), world.stumpTop, ON_SEAT);
      break;
    }
    case "s11": { // the hero at his door at night: an orange glow over the palms
      out.fire.horizon = 1;
      const d = VIL.clone().add(V3(2, 0, -84)), toGlow = facing(d, world.glowAt);
      place(hero, d.x, d.z, toGlow); act(hero, [{ clip: C.gasp }], t, faceOf(shot, "hero"));
      break;
    }
    case "s12": { // he runs out and down the road
      out.fire.horizon = 1;
      const d = VIL.clone().add(V3(2, 0, -84)), dir = world.glowAt.clone().sub(d).setY(0).normalize(), at = d.clone().addScaledVector(dir, 4 + t * 16);
      place(hero, at.x, at.z, Math.atan2(dir.x, dir.z)); act(hero, [{ clip: C.run }], t, faceOf(shot, "hero"));
      break;
    }
    case "s13": { // hiding behind the big tree, peeking out towards the sawit side
      const tr = world.hideTree.position, at = tr.clone().add(V3(1.2, 0, 3.2)); place(hero, at.x, at.z, -PI / 2 - 0.5);
      act(hero, [{ clip: C.idle }, { clip: C.gasp, weight: 0.6 }], t, faceOf(shot, "hero"));
      break;
    }
    case "s14": case "s15": { // the guards come in with torches; one lights the first tree
      guards.forEach((g, i) => {
        const from = FOR.clone().add(V3(-40, 0, -14 + i * 5)), to = world.firstTree.position.clone().add(V3(-6 - i * 1.5, 0, -3 + i * 4));
        const k = shot.id === "s14" ? easeInOut(clamp01(p * 1.05)) * 0.8 : 1, at = walkTo(from, to, k);
        place(g, at.x, at.z, facing(at, world.firstTree.position)); prop(g, "torch");
        act(g, [{ clip: shot.id === "s14" ? C.walk : C.idle, at: -i * 0.3 }, HOLD], t, faceOf(shot, "guard", "smug"));
        g.flame?.update(t + i, cameraDummy, 1);
      });
      if (shot.id === "s15" && guards[0].props.badge) guards[0].props.badge.visible = !lost;
      if (shot.id === "s15") {
        out.fire.firstTree = clamp01((t - 0.4) / 1.2);
        const tr = world.hideTree.position, at = tr.clone().add(V3(1.2, 0, 3.2)); place(hero, at.x, at.z, -PI / 2 - 0.5); act(hero, [{ clip: C.gasp }], t, faceOf(shot, "hero"));
      }
      break;
    }
    case "s16": { // up the palace road at night; the hero sneaks behind
      guards.forEach((g, i) => { const at = world.gate.clone().add(V3(-4 + i * 4, 0, -70 + p * 40)); place(g, at.x, at.z, 0); prop(g, "torch"); if (i === 0 && g.props.badge) g.props.badge.visible = false; act(g, [{ clip: C.walk, at: -i * 0.3 }, HOLD], t, "smug"); g.flame?.update(t + i, cameraDummy, 1); });
      const h = world.gate.clone().add(V3(2, 0, -98 + p * 34)); place(hero, h.x, h.z, 0); act(hero, [{ clip: C.walk, speed: 0.7 }], t, faceOf(shot, "hero"));
      break;
    }
    case "s17": { // the corridor: the hero pulls the portrait open
      world.hinge.rotation.y = -easeInOut(clamp01((p - 0.35) / 0.5)) * 1.6;
      const at = ROOM.clone().add(V3(2.5, 0, world.RD / 2 + 6)); place(hero, at.x, at.z, PI - 0.3); act(hero, [{ clip: C.idle }, { clip: C.point, at: 0.3, fade: 0.3 }], t, faceOf(shot, "hero"));
      break;
    }
    case "s18": case "s19": case "s20": case "s21": case "s22": case "s23": { // inside the room
      world.hinge.rotation.y = -1.6;
      world.theMap.set(shot.id === "s18" ? clamp01(p * 1.25) : 1, shot.id === "s19" ? clamp01((p - 0.15) * 1.6) : shot.idx > 18 ? 1 : 0);
      const spots: Record<string, [THREE.Vector3, number, any]> = {
        s18: [ROOM.clone().add(V3(-4, 0, 2)), PI, C.gasp], s19: [ROOM.clone().add(V3(-1, 0, -4)), PI, C.idle], s20: [ROOM.clone().add(V3(-6, 0, 2)), -PI / 2 - 0.3, C.gasp],
        s21: [ROOM.clone().add(V3(3, 0, -4)), PI / 2, C.armsCrossed], s22: [ROOM.clone().add(V3(13, 0, -4)), PI / 2, C.armsCrossed], s23: [ROOM.clone().add(V3(2, 0, 4)), 0.1, C.gasp],
      };
      const [at, ry, clip] = spots[shot.id]; placeAt(hero, at, ry); act(hero, [{ clip }], t, faceOf(shot, "hero"));
      if (shot.id === "s23") { world.hinge.rotation.y = -1.6 + 0; }
      break;
    }
    case "s24": case "s25": { // the King in the doorway, guards behind him
      world.hinge.rotation.y = -1.6;
      const k = ROOM.clone().add(V3(0, 0, world.RD / 2 - (shot.id === "s25" ? 3 : 0.5))); place(king, k.x, k.z, PI); act(king, [{ clip: C.smug }], t, faceOf(shot, "king", "smug"));
      guards.slice(0, 2).forEach((g, i) => { place(g, k.x - 3 + i * 6, k.z + 5, PI); act(g, [{ clip: C.armsCrossed }], t, "smug"); });
      const h = ROOM.clone().add(V3(1, 0, 2)); place(hero, h.x, h.z, 0.05); act(hero, [{ clip: C.panic }], t, faceOf(shot, "hero", "scared"));
      break;
    }
    case "s26": { // out of the window: a leap off the castle wall, then running
      const top = world.windowLedge, land = top.clone().add(V3(4, 0, -14)).setY(0), k = clamp01(p * 1.6);
      const at = top.clone().lerp(land, k); at.y = top.y * (1 - k) + Math.sin(k * PI) * 3;
      prop(hero, "scroll");
      if (k >= 1) { const run = land.clone().add(V3(0, 0, -(p - 0.625) * 30)); placeAt(hero, run, PI); act(hero, [{ clip: C.run }], t, faceOf(shot, "hero")); }
      else { place(hero, at.x, at.z, PI, at.y); act(hero, [{ clip: C.panic }], t, faceOf(shot, "hero"), at.y); }
      break;
    }
    case "s27": { // kids come out with lanterns to the hero on the square
      const h = VIL.clone().add(V3(0, 0, 22)); place(hero, h.x, h.z, PI); act(hero, [{ clip: C.point }], t, faceOf(shot, "hero"));
      kids.forEach((k, i) => { const from = world.houseSpots[i + 1].door, to = h.clone().add(V3(-6 + i * 4, 0, -6)), at = walkTo(from, to, easeInOut(clamp01(p * 1.2))); place(k, at.x, at.z, facing(at, h)); prop(k, "lantern"); act(k, [{ clip: p < 0.8 ? C.run : C.idle }], t, "determined"); });
      break;
    }
    case "s28": { // the bucket line at the burning edge
      for (const key of ["edge", "firstTree"]) out.fire[key] = 1 - p * 0.35; out.smoke.edgeSmoke = 1;
      [hero, ...kids].forEach((k, i) => { const at = FOR.clone().add(V3(-3 - (i % 2) * 2, 0, -20 + i * 10)); place(k, at.x, at.z, PI / 2); prop(k, "bucket"); act(k, [{ clip: C.handOver, at: -i * 0.25 }], t, i === 0 ? faceOf(shot, "hero") : "determined");
        if (k.water) { k.water.visible = true; k.water.position.copy(at).add(V3(1.5, 3, 0)); } });
      break;
    }
    case "s29": { // the fire goes out at dawn; smoke; the kids slump down, happy
      out.fire.edge = clamp01(0.5 - p * 1.1); out.smoke.edgeSmoke = 1 - p * 0.4;
      [hero, ...kids].forEach((k, i) => { const at = FOR.clone().add(V3(-6 - (i % 2) * 3, 0, -16 + i * 8)); place(k, at.x, at.z, PI / 2 + 0.3); act(k, [{ clip: i % 2 ? C.slump : C.celebrate, at: -i * 0.2 }], t, i === 0 ? faceOf(shot, "hero") : "happy"); });
      break;
    }
    case "s30": case "s31": case "s32": case "s33": case "s33b": case "s33c": case "s34": case "s35": { // the morning at the edge
      out.smoke.edgeSmoke = 0.25;
      const walk = shot.id === "s30" ? easeInOut(p) : 1, kAt = walkTo(FOR.clone().add(V3(-70, 0, -2)), FOR.clone().add(V3(-14, 0, -2)), walk);
      const kingClip = shot.id === "s30" ? C.walk : shot.id === "s34" ? C.point : shot.id === "s32" ? C.gasp : C.idle;
      place(king, kAt.x, kAt.z, shot.id === "s34" ? -PI / 2 + 0.2 : shot.id === "s32" || shot.id === "s33" ? PI / 2 + 0.6 : PI / 2);
      act(king, [{ clip: kingClip }], t, faceOf(shot, "king", shot.idx >= 31 ? "shocked" : "grin"));
      const turned = shot.idx >= 31;
      // two guards escort the King; guard 0 (the one who lost his badge) at his right
      const accused = shot.id === "s33b", confessing = shot.id === "s33c";
      [guards[0], guards[1]].forEach((g, i) => {
        const at = kAt.clone().add(V3(-3 - i * 1.5, 0, i ? -4 : 4)); place(g, at.x, at.z, confessing && i === 0 ? facing(at, kAt) : PI / 2);
        act(g, [{ clip: shot.id === "s30" ? C.walk : confessing && i === 0 ? C.point : accused && i === 0 ? C.panic : C.armsCrossed, at: -i * 0.2 }], t, i === 0 && shot.idx >= 32 ? "scared" : "smug");
      });
      const lookAt = accused ? guards[0].rig.object.position : king.rig.object.position, mapTime = shot.id === "s33";
      villagers.forEach((v, i) => {
        const at = walkTo(FOR.clone().add(V3(-82 - Math.floor(i / 4) * 5, 0, -10 + (i % 4) * 6)), FOR.clone().add(V3(-24 - Math.floor(i / 4) * 5, 0, -12 + (i % 4) * 7)), walk);
        place(v, at.x, at.z, mapTime ? facing(at, FOR.clone().add(V3(-4, 0, 6))) : turned ? facing(at, lookAt) : PI / 2);
        act(v, [{ clip: shot.id === "s30" ? C.walk : shot.id === "s35" ? C.armsCrossed : mapTime ? C.gasp : C.idle, at: -i * 0.2 }], t, shot.id === "s35" ? "angry" : turned ? "shocked" : "neutral");
      });
      // the hero and Grandpa wait at the edge (in front of the forest), with the kids
      const h = FOR.clone().add(V3(-4, 0, 6)); place(hero, h.x, h.z, -PI / 2 - 0.2);
      if (accused) { const g = guards[0].rig.object.position, at = g.clone().add(V3(3.2, 0, 0.6)); place(hero, at.x, at.z, facing(at, g)); } // right up to the guard
      if (shot.id === "s33") prop(hero, "map");
      if (accused) prop(hero, "badge");
      act(hero, [{ clip: shot.id === "s33" ? C.point : accused ? C.point : shot.id === "s35" ? C.armsCrossed : C.idle }], t, faceOf(shot, "hero", "determined"));
      place(grandpa, h.x - 1, h.z + 4, -PI / 2); act(grandpa, [{ clip: shot.id === "s35" ? C.armsCrossed : C.idle }], t, faceOf(shot, "grandpa", "determined"));
      kids.forEach((k, i) => { place(k, h.x - 2 + (i % 2) * 2, h.z - 4 - i * 3, -PI / 2); act(k, [{ clip: shot.id === "s35" ? C.armsCrossed : C.idle, at: -i * 0.3 }], t, shot.id === "s35" ? "angry" : "determined"); });
      break;
    }
    case "s36": { // planting real trees in the golden light
      out.birds = true;
      villagers.slice(0, 6).forEach((v, i) => { const at = world.FIELD.clone().add(V3(-24 + (i % 3) * 16, 0, 4 + Math.floor(i / 3) * 12)); place(v, at.x, at.z, i % 2 ? PI / 2 : -PI / 2); prop(v, "shovel"); act(v, [{ clip: C.crowdIdle, at: -i * 0.4 }, { clip: C.point, weight: 0.3 + 0.3 * Math.abs(Math.sin(t * 2.4 + i)) }], t, "happy"); });
      place(hero, world.FIELD.x + 2, world.FIELD.z + 40, PI); act(hero, [{ clip: C.celebrate }], t, faceOf(shot, "hero"));
      place(grandpa, world.FIELD.x - 3, world.FIELD.z + 41, PI); act(grandpa, [{ clip: C.cheer }], t, faceOf(shot, "grandpa"));
      break;
    }
    case "s37": { // the King alone in a big empty field, digging
      const at = world.FIELD.clone().add(V3(0, 0, -10)); place(king, at.x, at.z, 0.4); prop(king, "shovel"); prop(king, "sack");
      act(king, [{ clip: C.slump }, { clip: C.point, weight: 0.4 + 0.3 * Math.abs(Math.sin(t * 2)) }], t, faceOf(shot, "king", "sad"));
      break;
    }
    case "s38": { // one torch in the dark forest again (whose? only the torch shows)
      const g = guards[1], at = FOR.clone().add(V3(26 - p * 6, 0, 22 + Math.sin(t) * 2)); place(g, at.x, at.z, -PI / 2); prop(g, "torch"); act(g, [{ clip: C.walk, speed: 0.6 }, HOLD], t, "neutral");
      g.flame?.update(t, cameraDummy, 1);
      break;
    }
  }
  return out;
}
// torch flames are camera-facing; Video.tsx gives the real camera before render (see faceFlames)
const cameraDummy = new THREE.PerspectiveCamera();
/** Turn every visible torch flame to the camera (after the camera is set). */
export function faceFlames(cast: Cast, camera: THREE.Camera, time: number) {
  for (const g of cast.all) if (g.flame && g.props.torch?.visible) g.flame.update(time, camera, 1);
  for (const k of cast.all) if (k.water?.visible) k.water.update(time, new THREE.Vector3(1, 0.6, 0), 1);
}
