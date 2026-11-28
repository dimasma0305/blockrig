// One camera per shot (docs/story.md "camera" notes). Targets follow the cast's joints, so a change in staging keeps
// the framing. Faces sit in the upper half (captions at 62%): cameras aim a little below the face.
// Check each changed shot: npm run stills -- s03
import * as THREE from "three";
import { V, move, orbit, type Cam, type Shot } from "../kit";
import { easeInOut } from "../kit/rng";
import type { Cast, Person } from "../cast/characters";
import { LOCATIONS, type World } from "../world/World";
import { meFor } from "./performance";

const PI = Math.PI;
const head = (q: Person) => q.rig.jointPosition("Neck", new THREE.Vector3()).add(V(0, 0.55 * q.rig.object.scale.y, 0));
const fwd = (q: Person, a = 0) => { const r = q.rig.object.rotation.y + a; return V(Math.sin(r), 0, Math.cos(r)); };
/** A close or medium shot of one person: from angle `a` off their facing, `dist` away, `lift` up; aims below the face. */
const on = (q: Person, a: number, dist: number, lift = 0.2, fov = 40, p = 0, push = 0): Cam => {
  const h = head(q), d = dist * 1.7 * (1 - push * easeInOut(p)); // distances are in head-sizes of a kid rig (~1.7 studs)
  return { pos: h.clone().addScaledVector(fwd(q, a), d).add(V(0, lift, 0)), target: h.clone().add(V(0, -d * 0.16, 0)), fov, shake: 0 };
};
/** Two people: the camera looks at the middle of their heads from the side `side` (+1/-1) of the line between them. */
const two = (a: Person, b: Person, side: number, dist: number, lift = 0.6, fov = 46, shiftTo = 0.5): Cam => {
  dist *= 1.3; const ha = head(a), hb = head(b), m = ha.clone().lerp(hb, shiftTo), d = hb.clone().sub(ha).setY(0).normalize(), n = V(-d.z, 0, d.x).multiplyScalar(side);
  return { pos: m.clone().addScaledVector(n, dist).add(V(0, lift, 0)), target: m.clone().add(V(0, -dist * 0.14, 0)), fov, shake: 0 };
};
/** From the window side of my room (the open floor), looking at a point: the room's dialogue cameras. */
const fromFloor = (t: THREE.Vector3, dx = 0, dy = 1.2, fov = 46, z = -9.6): Cam => ({ pos: V(t.x + dx, t.y + dy, z), target: t.clone().add(V(0, -0.9, 0)), fov, shake: 0 });
const mid2 = (a: Person, b: Person) => head(a).lerp(head(b), 0.5);
const shaken = (c: Cam, s: number) => ({ ...c, shake: s });

export function cameraFor(shot: Shot, p: number, local: number, cast: Cast, world: World): Cam {
  const cam = shotCamera(shot, p, local, cast, world);
  // closed rooms: keep the camera inside the walls (s62 looks in through the window from the yard)
  if (shot.location === "room" && shot.id !== "s62") world.room.open.clampPoint(cam.pos, cam.pos);
  if (shot.location === "nursery") world.nursery.box.clampPoint(cam.pos, cam.pos);
  return cam;
}

function shotCamera(shot: Shot, p: number, local: number, cast: Cast, world: World): Cam {
  const { mom, dad, friend, tm1 } = cast, me = meFor(shot.id, cast), R = world.room, id = shot.id, e = easeInOut(p);
  const scr = R.screenAt.clone();
  switch (id) {
    // ---- the hook: the street where everyone hacks, crane down from above to street level
    case "s01": { const T = LOCATIONS.town; return move([V(T.x - 26, 30, T.z + 34), V(T.x - 2, 2, T.z - 2)], [V(T.x - 10, 4.2, T.z + 21), V(T.x - 1, 6.5, T.z - 8)], p, 56); }
    // ---- frozen at the desk, from the screen side
    case "s54": { const L = world.lap.position, t = head(me).lerp(L, 0.45); return { pos: L.clone().add(V(-3.2, 2.4, -6.2).multiplyScalar(1 - 0.15 * e)), target: t.add(V(0, 0.2, 0)), fov: 52, shake: 0 }; }
    case "s02": { const L = world.lap.position, t = head(me).lerp(L, 0.25); return { pos: L.clone().add(V(-2.2, 1.8, -4.2).multiplyScalar(1 - 0.1 * e)), target: t.add(V(0, 0.3, 0)), fov: 46, shake: 0 }; }
    case "s03": { const h = head(me); return move([h.clone().add(V(2.6, 0.3, -1.4)), h.clone().add(V(0, -0.5, 0))], [V(-1.5, 6.5, -9.5), V(1.6, 2.8, -1.2)], p, 50); }
    // ---- nursery
    case "s04": { const h = head(me); return move([h.clone().add(V(5.5, 2.2, 7)), h.clone().add(V(0, -0.4, 0))], [h.clone().add(V(3, 1.2, 4.2)), h.clone().add(V(0, -0.3, 0))], p, 48); }
    case "s05": { const h = head(me), t = world.tablet.position.clone(); const back = h.clone().sub(t).setY(0).normalize(); return { pos: h.clone().addScaledVector(back, 4.5).add(V(0.8, 2.2, 0)), target: t.clone().lerp(h, 0.35).add(V(0, -0.4, 0)), fov: 50, shake: 0 }; }
    case "s06": return on(me, 0.35, 5.2, 0.4, 44);
    case "s07": { const b = world.nursery.baby, m = head(dad).lerp(head(mom), 0.5); return { pos: b.clone().add(V(2.5, 5.5, 5)), target: m.add(V(0, -1.6, 0)), fov: 50, shake: 0 }; }
    case "s08": return on(mom, -0.25, 6.5, 0.2, 40, p, 0.1);
    // ---- preschool
    case "s09": { const S = LOCATIONS.preschool; return move([V(S.x + 3, 10, S.z + 21), V(S.x, 3.5, S.z - 6)], [V(S.x + 1, 6.5, S.z + 14), V(S.x, 3.5, S.z - 7)], p, 52); }
    case "s10": { if (p < 0.45) { const b = world.pre.board.clone(); return { pos: b.clone().add(V(0, -1.0, 15)), target: b.clone().add(V(0, -0.6, 0)), fov: 46, shake: 0 }; } return on(me, 0.25, 3.6, 0.2, 40); }
    case "s11": return on(friend, 0.45, 6.5, 2.2, 42, p, 0.25);
    case "s12": { const h = head(friend), l = world.pre.laptops[0].position; return { pos: h.clone().add(V(0.9, 0.7, 2.0)), target: l.clone().lerp(h, 0.25), fov: 46, shake: 0 }; }
    case "s13": return two(friend, me, -1, 5.5, 0.8, 44, 0.65);
    case "s14": { const h = head(friend), l = world.pre.laptops[0].position; return { pos: h.clone().add(V(-0.9, 1.9, 1.1)), target: l.clone(), fov: 44, shake: 0 }; }
    case "s15": return { ...on(me, 0.35, 3, 0.4, 44), shake: 0.03 };
    case "s16": { const S = LOCATIONS.preschool; return { pos: V(S.x + 9, 6, S.z + 13), target: head(me).lerp(head(mom), 0.5).add(V(0, -1.5, 0)), fov: 50, shake: 0 }; }
    case "s17": return shaken(on(mom, 0.9, 9, 1.2, 48), 0.04);
    case "s18": return on(friend, 0.4, 3.5, 1.0, 42);
    // ---- certified at three
    case "s19": return on(me, 0.1, 4.2, 0.4, 42);
    case "s20": return fromFloor(mid2(me, mom), -1.5, 1.6, 50);
    case "s21": { const h = head(me); return { pos: h.clone().add(V(0.4, 1.4, -5.5)), target: h.clone().add(V(0.6, -0.9, 0)), fov: 40, shake: 0 }; }
    case "s22": return fromFloor(mid2(me, dad), 0.5, 1.4, 46);
    // ---- school trips
    case "s23": { const x = hallX(world, p); return { pos: V(x, 5.5, world.hall.banners[0].z + 27), target: V(x, 5.2, world.hall.banners[0].z), fov: 50, shake: 0 }; }
    case "s24": case "s27": { const c = world.props.suitcase.position; if (id === "s27" && p > 0.6) return on(me, 0, 3.2, 0.3, 40); return { pos: c.clone().add(V(0.1, 9.5, 2.2)), target: c.clone().add(V(0, 0.6, 0)), fov: 46, shake: 0 }; }
    case "s25": return fromFloor(head(me), 0.4, 0.4, 36, -9);
    case "s26": return fromFloor(mid2(me, mom), 1.2, 1.2, 44);
    // ---- bug bounty at five
    case "s28": { const h = head(me); return { pos: h.clone().add(V(-2.2, 1.0, -1.2)), target: scr.clone(), fov: 44, shake: 0 }; }
    case "s29": { const k = Math.min(1, p * 1.6); return { pos: scr.clone().add(V(-6.5 + 3.5 * easeInOut(k), 0.4, 0)), target: scr.clone(), fov: 44, shake: 0 }; }
    case "s30": return on(me, 0.1, 4.5, -0.3, 44);
    case "s31": return two(me, mom, 1, 7, 1, 46, 0.4);
    case "s32": case "s33": return on(me, 0.1, id === "s32" ? 4.5 - 1.6 * e : 2.9, 0.2, 40);
    // ---- after NASA
    case "s34": { const r = world.props.report.position; return { pos: r.clone().add(V(-1.2, 1.6, -1.6)), target: r.clone(), fov: 40, shake: 0 }; }
    case "s35": return on(me, -0.1, 3.4, 0.2, 40);
    case "s36": return fromFloor(head(mom), 1.5, -0.4, 36);
    case "s37": return { pos: V(9, 7, -10), target: V(1.5, 3, -3), fov: 54, shake: 0 };
    case "s38": return on(me, 0.2, 3.8, 0.4, 40);
    case "s39": return fromFloor(head(mom), 0.8, 0.5, 34);
    case "s69": return on(mom, 0, 3.2, 0.3, 42);
    case "s40": { const b = world.props.ball.position; return { pos: b.clone().add(V(-2.6, 1.2, 2.4)), target: head(me).add(V(0, -1.2, 0)), fov: 46, shake: 0 }; }
    case "s41": { const h = head(me); return move([h.clone().add(V(-1, 1.2, -8)), h.clone().add(V(0.5, -0.8, 0))], [h.clone().add(V(4, 1.6, -7.5)), h.clone().lerp(scr, 0.4).add(V(0, -0.6, 0))], p, 48); }
    case "s42": return { pos: V(-1.5, 6.2, -2.5), target: V(6.5, 3.6, 3.6), fov: 54, shake: 0 };
    // ---- the friend's call
    case "s43": return on(friend, 0.2, 4.2, 0.3, 40);
    case "s45": { const h = head(friend); return { pos: h.clone().add(V(4.5, 1.0, 9)), target: h.clone().add(V(-2.2, -0.8, -2)), fov: 50, shake: 0 }; } // wide enough for the standee and the wallpaper
    case "s44": case "s46": return fromFloor(head(me), 0.3, 0.5, 34);
    // ---- the final minute
    case "s47": return fromFloor(mid2(me, mom), 0.2, 1.4, 46);
    case "s48": return shaken(fromFloor(head(me), 0.2, 0.4, 34), 0.04);
    case "s49": return fromFloor(head(mom), 0.8, 0.5, 34);
    case "s50": { const h = head(me), k = world.props.pkg.position; return { pos: h.clone().add(V(1.4, 0.6, 2.4)), target: k.clone().add(V(0, 2, 0)), fov: 46, shake: 0 }; }
    case "s51": return fromFloor(head(mom), 2.5, 0.8, 52);
    case "s52": { const h = head(me); return { ...orbit(h.clone().add(V(0, -0.8, 0)), 8.5 - 3 * e, -2.4, -4.0, 2.2, p, 48), shake: 0.03 + 0.05 * e }; } // swings round the window side (the desk blocks the other)
    case "s53": return shaken(fromFloor(head(me), 0.6, 2.2, 38), 0.09);
    case "s55": return fromFloor(head(dad), 0.6, 0.4, 34);
    case "s56": return on(me, 0.05, 2.3, 0.15, 36);
    case "s57": { const h = head(me); return { pos: h.clone().add(V(0.8, 0.6, -2.2)), target: R.keys.clone().lerp(scr, 0.5), fov: 44, shake: 0 }; }
    case "s58": return fromFloor(mid2(me, dad), 0.4, 1.2, 44);
    // ---- the reveal
    case "s59": return fromFloor(mid2(me, dad), 1.0, 1.0, 48, -10);
    case "s60": { const k = world.props.pkg.position.clone().add(V(0, 2.2, 0)); return { pos: head(me).add(V(2.2, 0.8, -1.2)), target: k, fov: 46, shake: 0 }; }
    case "s61": return on(me, 0.15, 4.5 - 1.2 * e, 0.3, 42);
    case "s62": { const h = head(me); return { pos: h.clone().add(V(0.4, 0.6, -13)), target: h.clone().add(V(0, -0.4, 0)), fov: 28, shake: 0 }; }
    case "s63": { const k = R.pkg; return { pos: k.clone().add(V(0.6, 10.5, 2.6)), target: k.clone().add(V(0, 2, 0)), fov: 46, shake: 0 }; }
    case "s64": return fromFloor(mid2(me, dad), 0.8, 1.0, 44, -10);
    case "s65": { const r = V(4.6, 0.6, -7.2); if (p < 0.6) return { pos: V(6.6, 4.6, -10), target: r, fov: 40, shake: 0 }; return shaken(fromFloor(head(me), 0.3, 0.4, 34), p < 0.65 ? 0.12 : 0); }
    case "s66": return fromFloor(head(me).lerp(head(mom), 0.2), 0.5, -0.2, 40);
    case "s67": return on(mom, -0.15, 4.2, 0.2, 40);
    case "s68": return fromFloor(head(me), -0.8, 1.4, 54);
    case "s70": { const h = head(me); return move([h.clone().add(V(-3.2, 0.6, -2.6)), h.clone().add(V(0, -0.7, 0))], [V(-4, 8, -9), h.clone().add(V(0, -1.2, 0))], p, 48); }
  }
  return on(me, 0, 6, 0.6, 46);
}

/** The school-trip camera: holds on each banner for a beat (CODEGATE, SECCON, DEF CON CTF), quick moves between. */
export function hallX(world: World, p: number) {
  const b = world.hall.banners, k = Math.min(2, Math.floor(p * 3)), f = p * 3 - k, t = k + (f > 0.75 && k < 2 ? easeInOut((f - 0.75) / 0.25) : 0);
  const i = Math.floor(t), fr = t - i; return i >= 2 ? b[2].x : b[i].x + (b[i + 1].x - b[i].x) * fr;
}
