// What every character does in every shot (docs/story.md "action" notes): where they stand, which clips play, their
// face, which story props show and what the screens say. A pure function of (shot, local time): called every frame.
import * as THREE from "three";
import { poseAt, groundRig, FEET, ON_SEAT, SEAT, type Layer } from "blockrig/video";
import { facsExpression } from "blockrig";
import type { Shot } from "../kit";
import { easeInOut } from "blockrig/video";
import * as C from "../cast/clips";
import type { Cast, Person } from "../cast/characters";
import { LOCATIONS, type World } from "../world/World";
import { hallX } from "./camera";

const PI = Math.PI, V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export function place(p: Person, x: number, z: number, rotY: number, y = 0) { p.rig.object.visible = true; p.rig.object.position.set(x, y, z); p.rig.object.rotation.set(0, rotY, 0); }
/** Pose a person from clip layers at local time t, set the face, and stand them on the ground (or seat them). */
export function act(p: Person, layers: Layer[], t: number, face: string | undefined, ground = 0, contacts = FEET) {
  poseAt(p.rig, layers, t);
  if (p.faceSets) { // Roblox face accessories: show the set for this emotion
    const show = new Set(p.faceSets[face ?? "neutral"] ?? p.faceSets.neutral ?? []);
    for (const set of Object.values(p.faceSets)) for (const o of set) o.visible = show.has(o);
  } else if (p.dynamic) { Object.assign(p.rig.faceControls, facsExpression(face ?? "neutral")); p.rig.applyFaceControls(); }
  else { if (face) p.face.set(face, { fade: 0 }); p.rig.updateFace(0); }
  if (contacts.length) groundRig(p.rig, ground, contacts);
}
/** Face a point on the ground: the rotation to give rig.object.rotation.y (rigs face +Z). */
export const facing = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
const faceOf = (shot: Shot, who: string, fallback = "neutral") => shot.faces?.[who] ?? fallback;

/** How big I am at each age (the rig is a child body; the scale grows across the story). */
export function ageScale(id: string) {
  const n = +id.slice(1);
  return n <= 3 ? 0.95 : n <= 8 ? 0.5 : n <= 18 ? 0.62 : n <= 22 ? 0.68 : n <= 27 ? 0.72 : n <= 33 ? 0.78 : n <= 58 ? 0.92 : 0.95;
}
/** Which of my rigs plays this shot: the baby (onesie), the dinosaur pyjamas at five, or me. */
export const meFor = (id: string, cast: Cast) => { const n = +id.slice(1); return n >= 4 && n <= 8 ? cast.baby : n >= 28 && n <= 33 ? cast.pj : cast.hero; };

const tmp = new THREE.Vector3();
/** Put a prop in a hand (follows the hand joint every frame; frame-pure). */
function inHand(obj: THREE.Object3D, q: Person, hand = "RightHand", off = V(0, -0.3, 0), ry = 0) {
  obj.visible = true; q.rig.object.updateMatrixWorld(true); q.rig.jointPosition(hand, tmp);
  obj.position.copy(tmp).add(off.clone().applyAxisAngle(V(0, 1, 0), q.rig.object.rotation.y)); obj.rotation.set(0, q.rig.object.rotation.y + ry, 0);
}
const between = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));

/** In the hook (and its return at 00:03) I am turned a little from the screen toward the window-side camera. */
export const HOOK_TURN = 0.9;
export type Perform = { me: Person; confetti: { at: THREE.Vector3; t: number } | null };

export function perform(shot: Shot, local: number, p: number, cast: Cast, world: World): Perform {
  const { mom, dad, friend, tm1, tm2, kids } = cast, id = shot.id, n = +id.slice(1), s = shot as any;
  for (const q of cast.all) { q.rig.object.visible = false; q.rig.object.scale.setScalar(1); }
  for (const h of cast.headsets) h.visible = false;
  cast.hat.visible = false;
  const me = meFor(id, cast); me.rig.object.scale.setScalar(ageScale(id));
  for (const q of [friend, tm1, tm2]) q.rig.object.scale.setScalar(Math.min(0.95, ageScale(id) + 0.02));
  for (const q of kids) q.rig.object.scale.setScalar(0.85);
  const P = world.props, out: Perform = { me, confetti: null };
  for (const k of ["ball", "juice", "yogurt", "workbook", "suitcase", "trophyBig", "plushInCase", "sunscreen", "receipt", "report", "phone", "sandwich", "cert", "plush", "pkgOpen"] as const) (P as any)[k].visible = false;
  const nine = n <= 3 || n >= 34; // the room as it is at nine: books, badges, the TRY HARDER note, the package
  P.pkg.visible = nine && !(n >= 63); P.pkgOpen.visible = n >= 63;
  P.juicePile.visible = n <= 3 || (n >= 42 && n <= 58); for (const b of P.books) b.visible = nine; P.sticky.visible = nine; P.badgeWall.visible = nine; P.calendar.visible = n >= 41;
  world.mon.set(s.screen ?? (n >= 34 ? "PRACTICE TABS" : ""), p); world.lap.set(s.screen ?? (n >= 34 ? "PRACTICE TABS" : ""), p);
  // the laptop on the desk edge is only in the hook and its return (it blocks the window-side cameras otherwise)
  world.lap.visible = world.lap.userData.base.visible = n <= 3 || (n >= 54 && n <= 57);
  // the countdown above my head
  world.timer.visible = !!s.timer && !(id === "s57" && p > 0.45);
  const R = world.room, room = shot.location === "room";

  // kids playing in the yard outside my window (seen through it)
  if (room && id !== "s01") kids.forEach((k, i) => { const at = R.outside.clone().add(V(-6 + i * 9, 0, i * 3)); place(k, at.x, at.z, i ? -2.4 : 2.2); k.rig.object.scale.setScalar(0.85); act(k, [{ clip: i ? C.cheer : C.celebrate, at: -i * 0.3, speed: 0.8 }], (local + i) % 1.8, "laugh"); });

  /** Me in the gaming chair: facing the screen (+X) or turned `turn` radians toward the room. */
  const chair = (q: Person, layers: Layer[], face: string, turn = 0) => {
    place(q, R.chair.x, R.chair.z, PI / 2 + turn); act(q, [{ clip: C.sit }, ...layers], local, face, R.seat, ON_SEAT);
  };
  const stand = (q: Person, at: THREE.Vector3, rot: number, layers: Layer[], face: string) => { place(q, at.x, at.z, rot); act(q, layers.length ? layers : [{ clip: C.idle }], local, face); };
  const toMe = (q: THREE.Vector3) => facing(q, R.chair);
  const momSide = V(2.4, 0, 0.6), momBack = V(2.4, 0, 0.6), CAM = V(3.5, 0, -10), cheat = (q: THREE.Vector3, to: THREE.Vector3) => { const a = facing(q, to), b = facing(q, CAM); return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * 0.75; };

  for (const l of world.town.laptops) l.visible = false;
  switch (true) {
    // ------------------------------------------------ the hook: a world where everyone hacks (grown-ups, kids, everyone)
    case id === "s01": {
      const folks = [dad, mom, kids[0], tm1, kids[1], friend, tm2, cast.pj, cast.hero], faces = ["determined", "smug", "grin", "determined", "laugh", "determined", "smug", "grin", "scared"];
      folks.forEach((q, i) => {
        const at = world.town.spots[i], rot = (i % 3 === 0 ? 0.6 : i % 3 === 1 ? -0.5 : 0.1) + (at.z < LOCATIONS.town.z ? Math.PI : 0);
        q.rig.object.scale.setScalar(q === dad || q === mom ? 1 : 0.8);
        stand(q, at, rot, [{ clip: C.idle, at: -i * 0.4 }, { clip: C.type, at: -i * 0.13 }], faces[i]);
        // the laptop rides in front of the chest, between the hands
        q.rig.jointPosition("LeftHand", tmp); const lh = tmp.clone(); q.rig.jointPosition("RightHand", tmp); const mid = lh.add(tmp).multiplyScalar(0.5);
        const l = world.town.laptops[i]; l.visible = true; l.position.copy(mid).add(V(0, -0.15, 0)); l.rotation.set(0, rot + PI, 0); l.scale.setScalar(q.rig.object.scale.y);
      });
      break;
    }
    // ------------------------------------------------ 1 the hook: frozen at the desk, three seconds left
    case n >= 2 && n <= 3: {
      chair(me, [{ clip: C.gasp, weight: 0.8 }], faceOf(shot, "hero", "scared"), HOOK_TURN);
      P.ball.visible = true; P.ball.position.set(R.chair.x - 1.6, 0, R.chair.z + 1.9);
      break;
    }
    // ------------------------------------------------ 2 the nursery
    case n >= 4 && n <= 8: {
      const N = world.nursery, b = N.baby;
      const rot = id === "s05" ? facing(b, N.tabletAt) : 0;
      place(me, b.x, b.z, rot);
      const flop = id === "s06";
      act(me, flop ? [{ clip: C.babyFlop, at: 0.35 }] : [{ clip: C.floorSit }, ...(id === "s04" ? [{ clip: C.type, weight: 0.6 }] : [])], local, flop ? (p < 0.5 ? "laugh" : p < 0.7 ? "shocked" : "dazed") : faceOf(shot, "hero"), 0, SEAT);
      world.babyScreen.set(flop && local > 0.3 ? "WEBSITE HACKED" : "TCP1P", 0);
      if (n >= 7) {
        stand(dad, N.dad, facing(N.dad, b) + (id === "s07" && p > 0.55 ? 0.9 : 0), id === "s08" ? [{ clip: C.idle }, { clip: C.nod, at: 1.1 }] : [{ clip: C.idle }], faceOf(shot, "dad"));
        stand(mom, N.mom, facing(N.mom, b), [{ clip: C.idle }], faceOf(shot, "mom"));
      }
      break;
    }
    // ------------------------------------------------ 3 the preschool CTF (age 2)
    case n >= 9 && n <= 18: {
      const seats = world.pre.seats, sit = (q: Person, i: number, layers: Layer[], face: string, turn = 0) => { const st = seats[i]; place(q, st.at.x, st.at.z, PI + turn); act(q, [{ clip: C.sit }, ...layers], local, face, st.seat, ON_SEAT); };
      for (const h of cast.headsets) h.visible = true;
      world.lobbyBoard.set(id === "s15" ? "FINAL CHALLENGE" : id === "s18" ? "MIC DISCONNECTED" : "PRESCHOOL CTF LEAGUE", p);
      world.pre.laptops.forEach((l, i) => l.set(i === 0 ? (id === "s14" ? "SCHEDULE" : "KURENAIF") : i === 1 && n >= 15 ? "FINAL CHALLENGE" : "TCP1P", 0));
      const flag = world.props.fanFlag, flagUp = n >= 11 && !(id === "s14" && p > 0.55);
      sit(friend, 0, [{ clip: C.type, weight: id === "s11" || id === "s12" || id === "s14" ? 0 : 0.7 }, ...(n >= 11 && n <= 14 ? [{ clip: flagUp ? C.flagUp : C.flagDown, fade: 0.3 }] : [])], faceOf(shot, "friend", "determined"), id === "s13" || id === "s14" ? -0.7 : 0);
      if (n >= 11 && n <= 14) inHand(flag, friend, "RightHand", V(0, -0.15, 0.1)); else flag.visible = false;
      sit(tm1, 2, [{ clip: C.type }], faceOf(shot, "tm1", "determined"), id === "s18" ? 0.6 : 0);
      sit(tm2, 4, [{ clip: C.type, at: 0.2 }], faceOf(shot, "tm2", "determined"), id === "s18" ? 0.4 : 0);
      if (id === "s16") { // Mom walks in from the door with a blanket
        const at = between(world.pre.door, seats[1].at.clone().add(V(-1.6, 0, 2.2)), p * 1.3);
        stand(mom, at, facing(at, seats[1].at), [{ clip: p < 0.75 ? C.walk : C.idle }, { clip: C.carry, weight: 0.5 }], faceOf(shot, "mom", "happy"));
        sit(me, 1, [{ clip: C.type }], faceOf(shot, "hero", "shocked"), p > 0.6 ? -0.9 : 0);
      } else if (id === "s17") { // carried away to the door, legs kicking
        const from = seats[1].at.clone().add(V(-1.6, 0, 2.2)), at = between(from, world.pre.door, p * 0.9);
        stand(mom, at, facing(from, world.pre.door), [{ clip: C.walk, speed: 0.7 }, { clip: C.carry }], faceOf(shot, "mom", "neutral"));
        if (id === "s17") {
          mom.rig.jointPosition("UpperTorso", tmp);
          place(me, tmp.x, tmp.z, mom.rig.object.rotation.y + PI, 0);
          me.rig.object.position.add(V(Math.sin(mom.rig.object.rotation.y), 0, Math.cos(mom.rig.object.rotation.y)).multiplyScalar(1.5));
          act(me, [{ clip: C.kick }], local, faceOf(shot, "hero", "furious"), 0, []);
          me.rig.object.position.y = tmp.y - 1.3;
        }
      } else if (id !== "s18") { // s18: my chair is empty
        sit(me, 1, id === "s15" ? [{ clip: C.lean }, { clip: C.type }] : id === "s10" ? [{ clip: C.holdUp, weight: 0.6 }] : id === "s13" ? [{ clip: C.tilt }] : [{ clip: C.type, weight: 0.8 }], faceOf(shot, "hero", "determined"), id === "s13" || id === "s14" ? 0.7 : 0);
      }
      if (id === "s10") inHand(world.props.milk, me, "RightHand", V(0, -0.2, 0.2)); else world.props.milk.visible = false;
      break;
    }
    // ------------------------------------------------ 4 certified at three
    case n >= 19 && n <= 22: {
      P.juice.visible = true; P.juice.position.copy(R.keys).add(V(-0.2, 0, -1.6));
      P.yogurt.visible = true; P.workbook.visible = true; P.workbook.position.copy(R.keys).add(V(0.4, 0, id === "s19" ? 2.2 : 0.9));
      if (id === "s19") { chair(me, [{ clip: C.holdUp }], faceOf(shot, "hero"), PI); P.cert.visible = true; inHand(P.cert, me, "RightHand", V(-0.55, 0.35, 0.35)); P.yogurt.position.copy(R.keys).add(V(-0.3, 0, 1.6)); }
      else if (id === "s20") {
        chair(me, [], faceOf(shot, "hero"), 0.9); P.yogurt.position.copy(R.keys).add(V(-0.3, 0, 1.6));
        stand(mom, momSide, cheat(momSide, R.chair), [{ clip: C.point, weight: 0.7 }], faceOf(shot, "mom"));
      } else {
        chair(me, [{ clip: C.peel }], faceOf(shot, "hero", id === "s21" ? "angry" : "embarrassed"));
        inHand(P.yogurt, me, "RightHand", V(-0.45, 0.1, 0.25));
        const lid = P.yogurt.getObjectByName("lid")!; lid.position.y = id === "s22" && p > 0.55 ? 1.1 : 0.52; lid.rotation.x = id === "s22" && p > 0.55 ? 1.0 : 0;
        if (id === "s22") stand(dad, V(2.0, 0, -2.4), facing(V(2.0, 0, -2.4), R.chair), [{ clip: C.point, fade: 0.3, weight: p > 0.3 ? 1 : 0.3 }], faceOf(shot, "dad"));
      }
      break;
    }
    // ------------------------------------------------ 5 school trips at four: the conference hall
    case id === "s23": {
      const cx = hallX(world, p), k = [V(cx - 1.6, 0, world.hall.banners[0].z + 17), V(cx + 1.6, 0, world.hall.banners[0].z + 17)];
      stand(me, k[0], 0.15, [{ clip: C.cheer, speed: 0.6 }], faceOf(shot, "hero", "happy"));
      stand(friend, k[1], -0.2, [{ clip: C.celebrate }], faceOf(shot, "friend", "happy"));
      world.props.badges.forEach((b, i) => { const q = i ? friend : me; q.rig.jointPosition("UpperTorso", tmp); b.visible = true; b.position.copy(tmp).add(V(0, -0.1, 0.62 * q.rig.object.scale.y)); b.rotation.y = q.rig.object.rotation.y; });
      break;
    }
    case n >= 24 && n <= 27: {
      const caseAt = V(3.4, 0, -6.4);
      P.suitcase.visible = true; P.suitcase.position.copy(caseAt); P.suitcase.rotation.y = -PI / 2; // lid to +X, clear of the window-side camera
      const swapped = id === "s27" && p > 0.55;
      P.trophyBig.visible = true; P.trophyBig.scale.setScalar(swapped ? 1 : 0.8);
      if (swapped) { P.trophyBig.position.copy(caseAt).add(V(2.6, 0, 0.6)); P.trophyBig.rotation.set(0, 0, 0); } else { P.trophyBig.position.copy(caseAt).add(V(0.3, 0.75, 0.2)); P.trophyBig.rotation.set(0, 0, PI / 2); }
      P.plushInCase.visible = swapped; P.plushInCase.position.copy(caseAt).add(V(-0.2, 0.8, 0.1));
      const meAt = V(caseAt.x - 0.3, 0, caseAt.z + 2.6);
      stand(me, meAt, PI - 0.25, id === "s25" ? [{ clip: C.holdUp }] : id === "s27" ? [{ clip: p < 0.55 ? C.gasp : C.smug, weight: 0.5 }] : [{ clip: C.idle }], faceOf(shot, "hero"));
      if (!swapped) { P.plush.visible = true; inHand(P.plush, me, "RightHand", V(-0.35, -0.1, 0.3), PI); }
      const momAt = V(caseAt.x - 3.0, 0, caseAt.z + 1.2);
      stand(mom, momAt, id === "s26" ? facing(momAt, caseAt) + 1.6 * easeInOut(p) : facing(momAt, caseAt), id === "s24" ? [{ clip: C.lean }] : [{ clip: C.idle }], faceOf(shot, "mom"));
      break;
    }
    // ------------------------------------------------ 6 bug bounty at five (dinosaur pyjamas)
    case n >= 28 && n <= 33: {
      const turned = id === "s30" || id === "s31";
      chair(me, id === "s30" ? [{ clip: C.cheer, speed: 0.8 }] : n >= 32 ? [{ clip: C.sip }] : [{ clip: C.type }], faceOf(shot, "hero"), turned ? 0.8 : n >= 32 ? 0.35 : 0);
      if (n >= 32) { P.juice.visible = true; inHand(P.juice, me, "RightHand", V(0, -0.35, 0.1)); }
      if (id === "s31") stand(mom, momBack, facing(momBack, R.chair) - 0.3, [{ clip: C.palm }, { clip: C.nod, at: 1.0 }], faceOf(shot, "mom"));
      break;
    }
    // ------------------------------------------------ 7 after NASA (nine)
    case n >= 34 && n <= 42: {
      const holdBall = n <= 38;
      chair(me, n === 40 ? [] : n >= 41 ? [{ clip: C.type }] : holdBall ? [{ clip: C.holdUp, weight: 0.35 }] : [], faceOf(shot, "hero"), n >= 40 ? (id === "s40" ? 0.9 * (1 - easeInOut(p)) : 0) : 0.9);
      if (holdBall) { P.ball.visible = true; inHand(P.ball, me, "RightHand", V(-0.3, -0.75, 0.35)); P.ball.scale.setScalar(0.75); }
      else { P.ball.visible = true; P.ball.scale.setScalar(0.75); P.ball.position.set(R.chair.x - 1.6, 0, R.chair.z + 1.9); }
      if (n <= 39) { stand(mom, momSide, cheat(momSide, R.chair), [{ clip: C.read }, ...(id === "s34" ? [{ clip: C.point, weight: 0.6, at: 0.4 }] : [])], faceOf(shot, "mom")); P.report.visible = true; inHand(P.report, mom, "RightHand", V(-0.45, 0.25, 0.4), PI); P.report.rotation.x = -0.6; }
      if (id === "s37") { // Dad carries the sealed package in from the door and sets it down
        const from = R.door.clone(), to = R.pkg.clone().add(V(1.6, 0, 1.8)), at = between(from, to, p * 1.4);
        stand(dad, at, facing(from, to), [{ clip: p < 0.7 ? C.walk : C.idle }, { clip: C.carry }], faceOf(shot, "dad"));
        if (p < 0.7) { dad.rig.jointPosition("UpperTorso", tmp); P.pkg.position.set(tmp.x, tmp.y - 2.4, tmp.z).add(V(Math.sin(dad.rig.object.rotation.y), 0, Math.cos(dad.rig.object.rotation.y)).multiplyScalar(1.8)); }
        else P.pkg.position.copy(R.pkg);
      } else P.pkg.position.copy(R.pkg);
      if (id === "s42") { P.juicePile.visible = true; P.juicePile.children.forEach((c, i) => (c.visible = i < Math.floor(p * 15))); world.props.calendar.set("c", p); }
      else { P.juicePile.children.forEach((c) => (c.visible = true)); world.props.calendar.set("c", n < 42 ? 0 : 1); }
      break;
    }
    // ------------------------------------------------ 8 a very supportive best friend
    case id === "s43" || id === "s45": {
      const F = world.friendRoom.spot;
      stand(friend, F, 0.2, [{ clip: C.idle }, { clip: C.phoneEar }], faceOf(shot, "friend"));
      world.props.phone.visible = true; inHand(world.props.phone, friend, "RightHand", V(0, 0.1, 0.1));
      break;
    }
    case id === "s44" || id === "s46": {
      chair(me, [{ clip: C.phoneEar, weight: id === "s46" && p > 0.6 ? 0.3 : 1 }], faceOf(shot, "hero"), 0.9);
      P.phone.visible = true; inHand(P.phone, me, "RightHand", V(0, 0.1, 0.1));
      P.ball.visible = true; P.ball.scale.setScalar(0.75); P.ball.position.set(R.chair.x - 1.6, 0, R.chair.z + 1.9);
      break;
    }
    // ------------------------------------------------ 9 the final minute
    case n >= 47 && n <= 58: {
      const typing = id === "s52", panic = id === "s53", turn = n >= 47 && n <= 51 ? (id === "s47" ? 0.2 : 0.9) : n === 58 ? 0.5 : n === 54 || n === 56 || n === 57 ? HOOK_TURN : 0;
      chair(me, typing ? [{ clip: C.type, speed: 2 }] : panic ? [{ clip: C.handsHead }] : id === "s50" ? [{ clip: C.point }] : id === "s57" ? [{ clip: C.press }] : id === "s58" ? [{ clip: C.tug }] : n >= 54 ? [{ clip: C.gasp, weight: 0.8 }] : [], faceOf(shot, "hero"), turn);
      P.ball.visible = true; P.ball.scale.setScalar(0.75); P.ball.position.set(R.chair.x - 1.6, 0, R.chair.z + 1.9);
      if (n <= 53 && !typing && !panic) stand(mom, id === "s51" ? R.pkg.clone().add(V(2.4, 0, 1.2)) : momBack, id === "s51" ? cheat(R.pkg.clone().add(V(2.4, 0, 1.2)), R.pkg) : cheat(momBack, R.chair), id === "s47" ? [{ clip: C.lean }] : id === "s49" ? [{ clip: C.shrug }] : id === "s51" ? [{ clip: C.pat }, { clip: C.nod, at: 0.6 }] : [{ clip: C.idle }], faceOf(shot, "mom"));
      if (n >= 54) { // Dad walks past behind me eating a sandwich, then stops
        const from = V(-1.5, 0, -6), to = V(2.6, 0, -1.4), at = id === "s54" ? between(from, to, p) : to;
        stand(dad, at, id === "s54" ? facing(from, to) : cheat(to, R.chair), [{ clip: id === "s54" ? C.walk : C.idle }, ...(n <= 55 ? [{ clip: C.eat }] : [])], faceOf(shot, "dad"));
        if (n <= 56) { P.sandwich.visible = true; inHand(P.sandwich, dad, "RightHand", V(0, 0.2, 0.25)); }
      }
      break;
    }
    // ------------------------------------------------ 10 the reveal and 11 after the Sun
    case n >= 59: {
      cast.hat.visible = !(id === "s59" && p < 0.45);
      const heroAt = V(3.6, 0, -5.4), momAt = V(7.2, 0, -3.8), dadAt = V(0.8, 0, -3.4);
      if (id === "s70") { chair(me, p < 0.5 ? [{ clip: C.idle }] : [{ clip: C.type, weight: 0.4 }], faceOf(shot, "hero")); P.sunscreen.visible = true; P.sunscreen.position.copy(R.keys).add(V(-0.3, 0, -1.4)); }
      else {
        const lookWindow = id === "s62";
        stand(me, heroAt, lookWindow ? PI : id === "s60" ? facing(heroAt, R.pkg) : id === "s67" || id === "s66" ? cheat(heroAt, momAt) : id === "s68" ? PI + 0.3 : cheat(heroAt, dadAt),
          id === "s60" ? [{ clip: C.point }] : lookWindow ? [{ clip: C.tilt }] : id === "s66" ? [{ clip: C.holdUp }] : id === "s59" ? [{ clip: C.idle }] : [{ clip: C.idle }], faceOf(shot, "hero"));
      }
      if (id === "s59") out.confetti = { at: heroAt.clone().add(V(0, 0, 0)), t: local };
      if (id === "s60") out.confetti = { at: heroAt.clone(), t: local + shot.dur };
      if (n !== 70 && n !== 62) stand(dad, dadAt, id === "s59" ? facing(dadAt, heroAt) : n === 63 ? facing(dadAt, R.pkg) : facing(dadAt, heroAt), id === "s59" ? [{ clip: C.crown, weight: p < 0.6 ? 1 : 0 }] : id === "s63" ? [{ clip: C.lean }] : [{ clip: C.idle }], faceOf(shot, "dad", "happy"));
      if (n >= 65 && n !== 70 && n !== 62) stand(mom, momAt, cheat(momAt, heroAt), n === 69 ? [{ clip: C.read }] : [{ clip: C.idle }], faceOf(shot, "mom"));
      if (n === 69) { P.report.visible = true; inHand(P.report, mom, "RightHand", V(-0.45, 0.25, 0.4), PI); P.report.rotation.x = -0.6; }
      // the sunscreen: in the box, then in my hand
      if (n >= 63 && n !== 70) { P.sunscreen.visible = true; if (id === "s63" && p < 0.55) P.sunscreen.position.copy(R.pkg).add(V(0, 0.4, 0)); else inHand(P.sunscreen, me, "RightHand", V(0, -0.15, 0.15)); }
      if (id === "s65") { P.receipt.visible = true; const y = Math.max(0.03, 4 - 9 * p); P.receipt.position.set(4.6, y, -7.2); P.receipt.rotation.set(-PI / 2 * Math.min(1, p * 2.5), 0.5, 0); }
      if (n >= 66 && n <= 67) { P.receipt.visible = true; P.receipt.position.set(4.6, 0.03, -7.2); P.receipt.rotation.set(-PI / 2, 0.5, 0); }
      P.ball.visible = true; P.ball.scale.setScalar(0.75); P.ball.position.set(R.chair.x - 1.6, 0, R.chair.z + 1.9);
      break;
    }
  }
  // the countdown floats above my head
  if (world.timer.visible) { me.rig.jointPosition("Neck", tmp); world.timer.position.copy(tmp).add(V(0, 1.7 * me.rig.object.scale.y + 0.45, 0)); world.timer.set(s.timer, p); }
  return out;
}
